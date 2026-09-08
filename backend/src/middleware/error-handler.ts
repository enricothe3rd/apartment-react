import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  void _next;
  console.error(error);

  if (error instanceof Prisma.PrismaClientInitializationError) {
    response.status(503).json({
      message: "Database connection failed. Check DATABASE_URL and run migrations.",
      code: "DATABASE_CONNECTION_FAILED",
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    response.status(400).json({
      message: error.message,
      code: error.code,
    });
    return;
  }

  response.status(500).json({
    message:
      error instanceof Error ? error.message : "Unexpected server error",
    code: "UNEXPECTED_SERVER_ERROR",
  });
};
