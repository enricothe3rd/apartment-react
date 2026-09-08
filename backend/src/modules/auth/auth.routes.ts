import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { authenticate, type AuthenticatedRequest } from "./auth.middleware.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createRefreshToken, hashRefreshToken } from "./token.js";

export const authRouter = Router();
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "TENANT"]).default("MANAGER"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32),
});

function createAccessToken(user: {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF" | "TENANT";
}) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      subject: user.id,
      expiresIn: "1h",
    }
  );
}

async function createStoredRefreshToken(userId: string) {
  const refreshToken = createRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt,
    },
  });

  return refreshToken;
}

authRouter.post("/register", authRateLimit, validateBody(registerSchema), async (request, response, next) => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: request.body.email },
    });

    if (existingUser) {
      response.status(409).json({ message: "Email is already registered" });
      return;
    }

    const user = await prisma.user.create({
      data: {
        name: request.body.name,
        email: request.body.email,
        passwordHash: hashPassword(request.body.password),
        role: request.body.role,
      },
      select: userSelect,
    });

    response.status(201).json({
      user,
      accessToken: createAccessToken(user),
      refreshToken: await createStoredRefreshToken(user.id),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", authRateLimit, validateBody(loginSchema), async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: request.body.email },
    });

    if (!user || !verifyPassword(request.body.password, user.passwordHash)) {
      response.status(401).json({ message: "Invalid email or password" });
      return;
    }

    response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: createAccessToken(user),
      refreshToken: await createStoredRefreshToken(user.id),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/profile", authenticate, async (request: AuthenticatedRequest, response, next) => {
  try {
    const userId = request.user?.sub;

    if (!userId) {
      response.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      response.status(404).json({ message: "User not found" });
      return;
    }

    response.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", authRateLimit, validateBody(refreshSchema), async (request, response, next) => {
  try {
    const tokenHash = hashRefreshToken(request.body.refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: userSelect } },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt.getTime() <= Date.now()
    ) {
      response.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    response.json({
      user: storedToken.user,
      accessToken: createAccessToken(storedToken.user),
      refreshToken: await createStoredRefreshToken(storedToken.user.id),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", authRateLimit, validateBody(refreshSchema), async (request, response, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashRefreshToken(request.body.refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    response.json({
      message: "Logged out",
    });
  } catch (error) {
    next(error);
  }
});
