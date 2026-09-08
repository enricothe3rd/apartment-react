import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const leasesRouter = Router();

const leaseSchema = z.object({
  tenantId: z.string().min(1),
  unitId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.number().min(0),
  deposit: z.number().min(0),
  status: z
    .enum(["DRAFT", "ACTIVE", "EXPIRING_SOON", "EXPIRED", "RENEWED", "TERMINATED"])
    .default("ACTIVE"),
});

const renewalSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.number().min(0),
  deposit: z.number().min(0),
});

function getStatusFilter(status: unknown) {
  return typeof status === "string" && status !== "all" ? status : undefined;
}

async function assertUnitAvailable(unitId: string, leaseIdToIgnore?: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, deletedAt: null },
  });

  if (!unit) {
    return "Unit not found";
  }

  if (!["VACANT", "RESERVED"].includes(unit.status) && !leaseIdToIgnore) {
    return "Unit is not available for a new lease";
  }

  const activeLease = await prisma.lease.findFirst({
    where: {
      unitId,
      deletedAt: null,
      id: leaseIdToIgnore ? { not: leaseIdToIgnore } : undefined,
      status: { in: ["ACTIVE", "EXPIRING_SOON"] },
    },
  });

  if (activeLease) {
    return "Unit already has an active lease";
  }

  return null;
}

async function assertTenantAvailable(tenantId: string, leaseIdToIgnore?: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
  });

  if (!tenant) {
    return "Tenant not found";
  }

  const activeLease = await prisma.lease.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      id: leaseIdToIgnore ? { not: leaseIdToIgnore } : undefined,
      status: { in: ["ACTIVE", "EXPIRING_SOON"] },
    },
  });

  if (activeLease) {
    return "Tenant already has an active lease";
  }

  return null;
}

const leaseInclude = {
  tenant: true,
  unit: {
    include: {
      property: true,
      building: true,
      floor: true,
    },
  },
};

leasesRouter.use(authenticate);

leasesRouter.get("/", async (request, response, next) => {
  try {
    const status = getStatusFilter(request.query.status);
    const leases = await prisma.lease.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      include: leaseInclude,
      orderBy: { endDate: "asc" },
    });

    response.json({ leases });
  } catch (error) {
    next(error);
  }
});

leasesRouter.get("/expiring", async (request, response, next) => {
  try {
    const days =
      typeof request.query.days === "string" ? Number(request.query.days) : 45;
    const until = new Date();
    until.setDate(until.getDate() + (Number.isFinite(days) ? days : 45));

    const leases = await prisma.lease.findMany({
      where: {
        deletedAt: null,
        status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        endDate: { gte: new Date(), lte: until },
      },
      include: leaseInclude,
      orderBy: { endDate: "asc" },
    });

    response.json({ leases });
  } catch (error) {
    next(error);
  }
});

leasesRouter.get("/history/:tenantId", async (request, response, next) => {
  try {
    const tenantId = String(request.params.tenantId);
    const leases = await prisma.lease.findMany({
      where: { tenantId, deletedAt: null },
      include: leaseInclude,
      orderBy: { startDate: "desc" },
    });

    response.json({ leases });
  } catch (error) {
    next(error);
  }
});

leasesRouter.get("/:id", async (request, response, next) => {
  try {
    const leaseId = String(request.params.id);
    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, deletedAt: null },
      include: leaseInclude,
    });

    if (!lease) {
      response.status(404).json({ message: "Lease not found" });
      return;
    }

    response.json({ lease });
  } catch (error) {
    next(error);
  }
});

leasesRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(leaseSchema),
  async (request, response, next) => {
    try {
      const availabilityError = await assertUnitAvailable(request.body.unitId);

      if (availabilityError) {
        response.status(409).json({ message: availabilityError });
        return;
      }

      const tenantError = await assertTenantAvailable(request.body.tenantId);

      if (tenantError) {
        response.status(409).json({ message: tenantError });
        return;
      }

      const lease = await prisma.$transaction(async (transaction) => {
        const createdLease = await transaction.lease.create({
          data: request.body,
          include: leaseInclude,
        });

        if (request.body.status === "ACTIVE" || request.body.status === "EXPIRING_SOON") {
          await transaction.unit.update({
            where: { id: request.body.unitId },
            data: { status: "OCCUPIED" },
          });
          await transaction.tenant.update({
            where: { id: request.body.tenantId },
            data: { unitId: request.body.unitId },
          });
        }

        return createdLease;
      });

      response.status(201).json({ lease });
    } catch (error) {
      next(error);
    }
  }
);

leasesRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(leaseSchema),
  async (request, response, next) => {
    try {
      const leaseId = String(request.params.id);
      const availabilityError = await assertUnitAvailable(request.body.unitId, leaseId);

      if (availabilityError) {
        response.status(409).json({ message: availabilityError });
        return;
      }

      const tenantError = await assertTenantAvailable(request.body.tenantId, leaseId);

      if (tenantError) {
        response.status(409).json({ message: tenantError });
        return;
      }

      const existingLease = await prisma.lease.findFirst({
        where: { id: leaseId, deletedAt: null },
      });

      if (!existingLease) {
        response.status(404).json({ message: "Lease not found" });
        return;
      }

      const lease = await prisma.$transaction(async (transaction) => {
        const updatedLease = await transaction.lease.update({
          where: { id: leaseId },
          data: request.body,
          include: leaseInclude,
        });

        if (existingLease.unitId !== request.body.unitId) {
          await transaction.unit.update({
            where: { id: existingLease.unitId },
            data: { status: "VACANT" },
          });
        }

        if (["ACTIVE", "EXPIRING_SOON"].includes(request.body.status)) {
          await transaction.unit.update({
            where: { id: request.body.unitId },
            data: { status: "OCCUPIED" },
          });
          await transaction.tenant.update({
            where: { id: request.body.tenantId },
            data: { unitId: request.body.unitId },
          });
        }

        if (["EXPIRED", "TERMINATED"].includes(request.body.status)) {
          await transaction.unit.update({
            where: { id: request.body.unitId },
            data: { status: "VACANT" },
          });
          await transaction.tenant.updateMany({
            where: { id: request.body.tenantId, unitId: request.body.unitId },
            data: { unitId: null },
          });
        }

        return updatedLease;
      });

      response.json({ lease });
    } catch (error) {
      next(error);
    }
  }
);

leasesRouter.post(
  "/:id/renew",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(renewalSchema),
  async (request, response, next) => {
    try {
      const leaseId = String(request.params.id);
      const existingLease = await prisma.lease.findFirst({
        where: { id: leaseId, deletedAt: null },
      });

      if (!existingLease) {
        response.status(404).json({ message: "Lease not found" });
        return;
      }

      const renewedLease = await prisma.$transaction(async (transaction) => {
        await transaction.lease.update({
          where: { id: leaseId },
          data: { status: "RENEWED" },
        });

        return transaction.lease.create({
          data: {
            tenantId: existingLease.tenantId,
            unitId: existingLease.unitId,
            startDate: request.body.startDate,
            endDate: request.body.endDate,
            monthlyRent: request.body.monthlyRent,
            deposit: request.body.deposit,
            status: "ACTIVE",
          },
          include: leaseInclude,
        });
      });

      response.status(201).json({ lease: renewedLease });
    } catch (error) {
      next(error);
    }
  }
);

leasesRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      const leaseId = String(request.params.id);
      const lease = await prisma.lease.findFirst({
        where: { id: leaseId, deletedAt: null },
      });

      if (!lease) {
        response.status(404).json({ message: "Lease not found" });
        return;
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.lease.update({
          where: { id: leaseId },
          data: { deletedAt: new Date(), status: "TERMINATED" },
        });
        await transaction.unit.update({
          where: { id: lease.unitId },
          data: { status: "VACANT" },
        });
        await transaction.tenant.updateMany({
          where: { id: lease.tenantId, unitId: lease.unitId },
          data: { unitId: null },
        });
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
