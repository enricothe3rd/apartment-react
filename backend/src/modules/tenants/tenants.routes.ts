import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const tenantsRouter = Router();

const tenantSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  unitId: z.string().min(1).nullable().optional(),
});

function getSearchTerm(search: unknown) {
  return typeof search === "string" ? search.trim() : "";
}

const tenantInclude = {
  unit: {
    include: {
      property: true,
      building: true,
      floor: true,
      maintenanceRequests: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" as const },
      },
    },
  },
  leases: {
    where: { deletedAt: null },
    orderBy: { startDate: "desc" as const },
  },
  payments: {
    where: { deletedAt: null },
    orderBy: { dueDate: "desc" as const },
  },
};

tenantsRouter.use(authenticate);

tenantsRouter.get("/", async (request, response, next) => {
  try {
    const search = getSearchTerm(request.query.search);
    const tenants = await prisma.tenant.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: tenantInclude,
      orderBy: { name: "asc" },
    });

    response.json({ tenants });
  } catch (error) {
    next(error);
  }
});

tenantsRouter.get("/:id", async (request, response, next) => {
  try {
    const tenantId = String(request.params.id);
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      include: tenantInclude,
    });

    if (!tenant) {
      response.status(404).json({ message: "Tenant not found" });
      return;
    }

    response.json({ tenant });
  } catch (error) {
    next(error);
  }
});

tenantsRouter.get("/:id/leases", async (request, response, next) => {
  try {
    const tenantId = String(request.params.id);
    const leases = await prisma.lease.findMany({
      where: { tenantId, deletedAt: null },
      include: { unit: { include: { property: true } } },
      orderBy: { startDate: "desc" },
    });

    response.json({ leases });
  } catch (error) {
    next(error);
  }
});

tenantsRouter.get("/:id/payments", async (request, response, next) => {
  try {
    const tenantId = String(request.params.id);
    const payments = await prisma.payment.findMany({
      where: { tenantId, deletedAt: null },
      include: { unit: { include: { property: true } }, lease: true },
      orderBy: { dueDate: "desc" },
    });

    response.json({ payments });
  } catch (error) {
    next(error);
  }
});

tenantsRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(tenantSchema),
  async (request, response, next) => {
    try {
      const tenant = await prisma.tenant.create({
        data: request.body,
        include: tenantInclude,
      });

      response.status(201).json({ tenant });
    } catch (error) {
      next(error);
    }
  }
);

tenantsRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(tenantSchema),
  async (request, response, next) => {
    try {
      const tenantId = String(request.params.id);
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: request.body,
        include: tenantInclude,
      });

      response.json({ tenant });
    } catch (error) {
      next(error);
    }
  }
);

tenantsRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      const tenantId = String(request.params.id);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { deletedAt: new Date() },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
