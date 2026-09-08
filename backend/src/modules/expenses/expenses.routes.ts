import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const expensesRouter = Router();

const expenseSchema = z.object({
  propertyId: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().min(0),
  expenseDate: z.coerce.date(),
});

function getString(value: unknown) {
  return typeof value === "string" && value !== "all" ? value : undefined;
}

function getDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const expenseInclude = {
  property: true,
};

expensesRouter.use(authenticate);

expensesRouter.get("/", async (request, response, next) => {
  try {
    const propertyId = getString(request.query.propertyId);
    const category = getString(request.query.category);
    const startDate = getDate(request.query.startDate);
    const endDate = getDate(request.query.endDate);

    const expenses = await prisma.expense.findMany({
      where: {
        deletedAt: null,
        ...(propertyId ? { propertyId } : {}),
        ...(category ? { category } : {}),
        ...(startDate || endDate
          ? {
              expenseDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: expenseInclude,
      orderBy: { expenseDate: "desc" },
    });

    response.json({ expenses });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/summary/monthly", async (_request, response, next) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      select: { amount: true, expenseDate: true },
      orderBy: { expenseDate: "asc" },
    });

    const monthly = expenses.reduce<Record<string, number>>((totals, expense) => {
      const month = expense.expenseDate.toISOString().slice(0, 7);
      totals[month] = (totals[month] ?? 0) + Number(expense.amount);
      return totals;
    }, {});

    response.json({
      monthly: Object.entries(monthly).map(([month, total]) => ({ month, total })),
    });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/summary/property", async (_request, response, next) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      include: expenseInclude,
    });

    const properties = expenses.reduce<Record<string, { property: string; total: number }>>(
      (totals, expense) => {
        const current = totals[expense.propertyId] ?? {
          property: expense.property.name,
          total: 0,
        };
        current.total += Number(expense.amount);
        totals[expense.propertyId] = current;
        return totals;
      },
      {}
    );

    response.json({ properties: Object.values(properties) });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/:id", async (request, response, next) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: String(request.params.id), deletedAt: null },
      include: expenseInclude,
    });

    if (!expense) {
      response.status(404).json({ message: "Expense not found" });
      return;
    }

    response.json({ expense });
  } catch (error) {
    next(error);
  }
});

expensesRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(expenseSchema),
  async (request, response, next) => {
    try {
      const expense = await prisma.expense.create({
        data: request.body,
        include: expenseInclude,
      });

      response.status(201).json({ expense });
    } catch (error) {
      next(error);
    }
  }
);

expensesRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(expenseSchema),
  async (request, response, next) => {
    try {
      const expense = await prisma.expense.update({
        where: { id: String(request.params.id) },
        data: request.body,
        include: expenseInclude,
      });

      response.json({ expense });
    } catch (error) {
      next(error);
    }
  }
);

expensesRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      await prisma.expense.update({
        where: { id: String(request.params.id) },
        data: { deletedAt: new Date() },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
