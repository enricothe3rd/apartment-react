import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const unitsRouter = Router();

const unitSchema = z.object({
  propertyId: z.string().min(1),
  buildingId: z.string().min(1),
  floorId: z.string().min(1),
  label: z.string().min(1),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  monthlyRent: z.number().min(0),
  status: z
    .enum(["OCCUPIED", "VACANT", "RESERVED", "MAINTENANCE", "DELINQUENT"])
    .default("VACANT"),
});

const unitStatusSchema = z.object({
  status: z.enum(["OCCUPIED", "VACANT", "RESERVED", "MAINTENANCE", "DELINQUENT"]),
});

unitsRouter.use(authenticate);

unitsRouter.get("/", async (_request, response, next) => {
  try {
    const units = await prisma.unit.findMany({
      where: { deletedAt: null },
      include: {
        property: true,
        building: true,
        floor: true,
        tenants: true,
        leases: true,
        maintenanceRequests: true,
      },
      orderBy: [{ propertyId: "asc" }, { label: "asc" }],
    });

    response.json({ units });
  } catch (error) {
    next(error);
  }
});

unitsRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(unitSchema),
  async (request, response, next) => {
    try {
      const unit = await prisma.unit.create({
        data: {
          ...request.body,
          monthlyRent: request.body.monthlyRent,
        },
      });

      response.status(201).json({ unit });
    } catch (error) {
      next(error);
    }
  }
);

unitsRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(unitSchema),
  async (request, response, next) => {
    try {
      const unitId = String(request.params.id);
      const unit = await prisma.unit.update({
        where: { id: unitId },
        data: request.body,
      });

      response.json({ unit });
    } catch (error) {
      next(error);
    }
  }
);

unitsRouter.patch(
  "/:id/status",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(unitStatusSchema),
  async (request, response, next) => {
    try {
      const unitId = String(request.params.id);
      const unit = await prisma.unit.update({
        where: { id: unitId },
        data: { status: request.body.status },
      });

      response.json({ unit });
    } catch (error) {
      next(error);
    }
  }
);

unitsRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      const unitId = String(request.params.id);
      await prisma.unit.update({
        where: { id: unitId },
        data: { deletedAt: new Date() },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
