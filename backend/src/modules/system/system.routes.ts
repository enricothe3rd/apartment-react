import { Router } from "express";
import { prisma } from "../../config/prisma.js";

export const systemRouter = Router();

systemRouter.get("/database", async (_request, response, next) => {
  try {
    const propertyCount = await prisma.property.count();

    response.json({
      status: "ok",
      database: "postgresql",
      propertyCount,
    });
  } catch (error) {
    next(error);
  }
});
