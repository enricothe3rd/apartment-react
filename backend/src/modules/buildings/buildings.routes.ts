import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const buildingsRouter = Router();

const buildingSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1),
});

buildingsRouter.use(authenticate);

buildingsRouter.get("/", async (_request, response, next) => {
  try {
    const buildings = await prisma.building.findMany({
      where: { deletedAt: null },
      include: { property: true },
      orderBy: [{ propertyId: "asc" }, { name: "asc" }],
    });

    response.json({ buildings });
  } catch (error) {
    next(error);
  }
});

buildingsRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(buildingSchema),
  async (request, response, next) => {
    try {
      const building = await prisma.building.create({ data: request.body });
      response.status(201).json({ building });
    } catch (error) {
      next(error);
    }
  }
);

buildingsRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(buildingSchema),
  async (request, response, next) => {
    try {
      const buildingId = String(request.params.id);
      const building = await prisma.building.update({
        where: { id: buildingId },
        data: request.body,
      });
      response.json({ building });
    } catch (error) {
      next(error);
    }
  }
);

buildingsRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      const buildingId = String(request.params.id);
      await prisma.building.update({
        where: { id: buildingId },
        data: { deletedAt: new Date() },
      });
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
