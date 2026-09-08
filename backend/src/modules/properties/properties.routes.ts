import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const propertiesRouter = Router();

const propertySchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(2),
  status: z.string().default("active"),
});

propertiesRouter.use(authenticate);

propertiesRouter.get("/", async (_request, response, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: { deletedAt: null },
      include: {
        buildings: {
          where: { deletedAt: null },
          include: {
            floors: { where: { deletedAt: null }, orderBy: { level: "asc" } },
            units: {
              where: { deletedAt: null },
              include: { building: true, floor: true },
              orderBy: { label: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
        units: {
          where: { deletedAt: null },
          include: { building: true, floor: true },
          orderBy: { label: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    response.json({ properties });
  } catch (error) {
    next(error);
  }
});

propertiesRouter.get("/:id", async (request, response, next) => {
  try {
    const propertyId = String(request.params.id);
    const property = await prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      include: {
        buildings: {
          where: { deletedAt: null },
          include: {
            floors: { where: { deletedAt: null }, orderBy: { level: "asc" } },
            units: {
              where: { deletedAt: null },
              include: { building: true, floor: true },
              orderBy: { label: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
        units: {
          where: { deletedAt: null },
          include: { building: true, floor: true },
          orderBy: { label: "asc" },
        },
      },
    });

    if (!property) {
      response.status(404).json({ message: "Property not found" });
      return;
    }

    response.json({ property });
  } catch (error) {
    next(error);
  }
});

propertiesRouter.get("/:id/summary", async (request, response, next) => {
  try {
    const propertyId = String(request.params.id);
    const [totalUnits, occupiedUnits, vacantUnits, maintenanceUnits] =
      await Promise.all([
        prisma.unit.count({
          where: { propertyId, deletedAt: null },
        }),
        prisma.unit.count({
          where: {
            propertyId,
            status: "OCCUPIED",
            deletedAt: null,
          },
        }),
        prisma.unit.count({
          where: {
            propertyId,
            status: "VACANT",
            deletedAt: null,
          },
        }),
        prisma.unit.count({
          where: {
            propertyId,
            status: "MAINTENANCE",
            deletedAt: null,
          },
        }),
      ]);

    response.json({
      summary: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate:
          totalUnits === 0 ? 0 : Math.round((occupiedUnits / totalUnits) * 100),
      },
    });
  } catch (error) {
    next(error);
  }
});

propertiesRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(propertySchema),
  async (request, response, next) => {
    try {
      const property = await prisma.property.create({
        data: request.body,
      });

      response.status(201).json({ property });
    } catch (error) {
      next(error);
    }
  }
);

propertiesRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(propertySchema),
  async (request, response, next) => {
    try {
      const propertyId = String(request.params.id);
      const property = await prisma.property.update({
        where: { id: propertyId },
        data: request.body,
      });

      response.json({ property });
    } catch (error) {
      next(error);
    }
  }
);

propertiesRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      const propertyId = String(request.params.id);
      await prisma.property.update({
        where: { id: propertyId },
        data: { deletedAt: new Date(), status: "archived" },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
