import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const paymentsRouter = Router();

const paymentSchema = z.object({
  tenantId: z.string().min(1),
  unitId: z.string().min(1),
  leaseId: z.string().min(1).nullable().optional(),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().nullable().optional(),
  amount: z.number().min(0),
  status: z.enum(["PAID", "PENDING", "OVERDUE"]).default("PENDING"),
  method: z.string().min(1).nullable().optional(),
});

const rentChargeSchema = z.object({
  dueDate: z.coerce.date().optional(),
});

const paymentInclude = {
  tenant: true,
  unit: {
    include: {
      property: true,
      building: true,
      floor: true,
    },
  },
  lease: true,
};

function getStatusFilter(status: unknown) {
  return typeof status === "string" && status !== "all" ? status : undefined;
}

function calculatePaymentStatus(payment: {
  status?: "PAID" | "PENDING" | "OVERDUE";
  paidDate?: Date | null;
  dueDate: Date;
}) {
  if (payment.status === "PAID" || payment.paidDate) {
    return "PAID";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return payment.dueDate < today ? "OVERDUE" : "PENDING";
}

paymentsRouter.use(authenticate);

paymentsRouter.get("/", async (request, response, next) => {
  try {
    const status = getStatusFilter(request.query.status);
    const payments = await prisma.payment.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      include: paymentInclude,
      orderBy: { dueDate: "desc" },
    });

    response.json({ payments });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/overdue", async (_request, response, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { deletedAt: null, status: "OVERDUE" },
      include: paymentInclude,
      orderBy: { dueDate: "asc" },
    });

    response.json({ payments });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/:id", async (request, response, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: String(request.params.id), deletedAt: null },
      include: paymentInclude,
    });

    if (!payment) {
      response.status(404).json({ message: "Payment not found" });
      return;
    }

    response.json({ payment });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/:id/receipt", async (request, response, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: String(request.params.id), deletedAt: null },
      include: paymentInclude,
    });

    if (!payment) {
      response.status(404).json({ message: "Payment not found" });
      return;
    }

    response.json({
      receipt: {
        receiptNumber: `PM-${payment.id.slice(-8).toUpperCase()}`,
        issuedAt: new Date(),
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(paymentSchema),
  async (request, response, next) => {
    try {
      const payment = await prisma.payment.create({
        data: {
          ...request.body,
          status: calculatePaymentStatus(request.body),
        },
        include: paymentInclude,
      });

      response.status(201).json({ payment });
    } catch (error) {
      next(error);
    }
  }
);

paymentsRouter.post(
  "/generate-rent-charges",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(rentChargeSchema),
  async (request, response, next) => {
    try {
      const dueDate = request.body.dueDate ?? new Date();
      const activeLeases = await prisma.lease.findMany({
        where: {
          deletedAt: null,
          status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        },
      });

      const payments = await prisma.$transaction(async (transaction) => {
        const createdPayments = [];

        for (const lease of activeLeases) {
          const existingPayment = await transaction.payment.findFirst({
            where: {
              leaseId: lease.id,
              dueDate,
              deletedAt: null,
            },
            include: paymentInclude,
          });

          if (existingPayment) {
            createdPayments.push(existingPayment);
            continue;
          }

          const payment = await transaction.payment.create({
            data: {
              tenantId: lease.tenantId,
              unitId: lease.unitId,
              leaseId: lease.id,
              dueDate,
              amount: lease.monthlyRent,
              status: calculatePaymentStatus({ dueDate }),
            },
            include: paymentInclude,
          });

          createdPayments.push(payment);
        }

        return createdPayments;
      });

      response.status(201).json({ payments });
    } catch (error) {
      next(error);
    }
  }
);

paymentsRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(paymentSchema),
  async (request, response, next) => {
    try {
      const payment = await prisma.payment.update({
        where: { id: String(request.params.id) },
        data: {
          ...request.body,
          status: calculatePaymentStatus(request.body),
        },
        include: paymentInclude,
      });

      response.json({ payment });
    } catch (error) {
      next(error);
    }
  }
);

paymentsRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      await prisma.payment.update({
        where: { id: String(request.params.id) },
        data: { deletedAt: new Date() },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
