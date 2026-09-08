import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF" | "TENANT";
};

export type AuthenticatedRequest = Request & {
  user?: AuthTokenPayload;
};

export function authenticate(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
) {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;

  if (!token) {
    response.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    request.user = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    next();
  } catch {
    response.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(roles: AuthTokenPayload["role"][]) {
  return (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction
  ) => {
    if (!request.user) {
      response.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!roles.includes(request.user.role)) {
      response.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  };
}
