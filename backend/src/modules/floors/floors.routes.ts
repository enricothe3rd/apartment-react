import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const floorsRouter = Router();

const floorSchema = z.object({
  buildingId: z.string().min(1),
  level: z.number().int(),
});

floorsRouter.use(authenticate);

floorsRouter.get("/", async (_request, response, next) => {
  try {
    const floors = await prisma.floor.findMany({
      where: { deletedAt: null },
      include: { building: true },
      orderBy: [{ buildingId: "asc" }, { level: "asc" }],
    });

    response.json({ floors });
  } catch (error) {
    next(error);
  }
});

floorsRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(floorSchema),
  async (request, response, next) => {
    try {
      const floor = await prisma.floor.create({ data: request.body });
      response.status(201).json({ floor });
    } catch (error) {
      next(error);
    }
  }
);

floorsRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(floorSchema),
  async (request, response, next) => {
    try {
      const floorId = String(request.params.id);
      const floor = await prisma.floor.update({
        where: { id: floorId },
        data: request.body,
      });
      response.json({ floor });
    } catch (error) {
      next(error);
    }
  }
);

floorsRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      const floorId = String(request.params.id);
      await prisma.floor.update({
        where: { id: floorId },
        data: { deletedAt: new Date() },
      });
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
