import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { authenticate, authorize, requireOrg } from "../auth/auth.middleware.js";
import { hashPassword } from "../auth/password.js";
import { PLAN_LIMITS, effectivePlan } from "../billing/plans.js";

export const organizationsRouter = Router();

organizationsRouter.use(authenticate, requireOrg);

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and dashes")
    .optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "TENANT"]).default("MANAGER"),
});

const roleSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "TENANT"]),
});

function orgIdOf(request: AuthenticatedRequest): string {
  if (!request.user?.orgId) {
    throw new Error("No organization assigned to account");
  }

  return request.user.orgId;
}

function serializeOrg(organization: { plan: string; status: string; trialEndsAt: Date | null }) {
  const plan = effectivePlan({
    plan: organization.plan as "TRIAL" | "FREE" | "PRO",
    status: organization.status,
    trialEndsAt: organization.trialEndsAt,
  });

  return {
    ...organization,
    plan,
    effectivePlan: plan,
    limits: PLAN_LIMITS[plan],
  };
}

// GET /api/organizations - organizations the current user belongs to
organizationsRouter.get("/", async (request, response, next) => {
  try {
    const userId = (request as AuthenticatedRequest).user?.sub;

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    response.json({
      organizations: memberships.map((membership) => ({
        ...serializeOrg(membership.organization),
        membershipRole: membership.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/current
organizationsRouter.get("/current", async (request, response, next) => {
  try {
    const organizationId = orgIdOf(request as AuthenticatedRequest);
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      response.status(404).json({ message: "Organization not found" });
      return;
    }

    const usage = await Promise.all([
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.unit.count({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.organizationMember.count({ where: { organizationId } }),
    ]);

    response.json({
      organization: serializeOrg(organization),
      usage: {
        properties: usage[0],
        units: usage[1],
        tenants: usage[2],
        members: usage[3],
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/organizations/current - rename / change slug (ADMIN)
organizationsRouter.patch(
  "/current",
  authorize(["ADMIN"]),
  validateBody(updateSchema),
  async (request, response, next) => {
    try {
      const organizationId = orgIdOf(request as AuthenticatedRequest);

      if (request.body.slug) {
        const existing = await prisma.organization.findUnique({
          where: { slug: request.body.slug },
        });

        if (existing && existing.id !== organizationId) {
          response.status(409).json({ message: "Slug is already in use" });
          return;
        }
      }

      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: request.body,
      });

      response.json({ organization: serializeOrg(organization) });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/organizations/current - delete org + all data (ADMIN)
organizationsRouter.delete("/current", authorize(["ADMIN"]), async (request, response, next) => {
  try {
    const organizationId = orgIdOf(request as AuthenticatedRequest);
    await prisma.organization.delete({ where: { id: organizationId } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/current/members
organizationsRouter.get("/current/members", async (request, response, next) => {
  try {
    const organizationId = orgIdOf(request as AuthenticatedRequest);

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    response.json({
      members: members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/organizations/current/members - testing-only invite (creates user + member)
organizationsRouter.post(
  "/current/members",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(inviteSchema),
  async (request, response, next) => {
    try {
      const organizationId = orgIdOf(request as AuthenticatedRequest);
      const email = request.body.email.toLowerCase();

      const existingMember = await prisma.organizationMember.findFirst({
        where: { organizationId, user: { email } },
      });

      if (existingMember) {
        response.status(409).json({ message: "User is already a member of this organization" });
        return;
      }

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: request.body.name ?? email.split("@")[0],
            email,
            passwordHash: hashPassword("password123"),
            role: request.body.role,
          },
        });
      }

      const member = await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: request.body.role,
        },
      });

      response.status(201).json({
        member: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: member.role,
        },
        note: "Testing invite: the user can sign in with password123",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/organizations/current/members/:userId - change role (ADMIN)
organizationsRouter.patch(
  "/current/members/:userId",
  authorize(["ADMIN"]),
  validateBody(roleSchema),
  async (request, response, next) => {
    try {
      const organizationId = orgIdOf(request as AuthenticatedRequest);
      const userId = String(request.params.userId);

      const member = await prisma.organizationMember.update({
        where: { organizationId_userId: { organizationId, userId } },
        data: { role: request.body.role },
      });

      response.json({ member });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/organizations/current/members/:userId - remove member (ADMIN)
organizationsRouter.delete(
  "/current/members/:userId",
  authorize(["ADMIN"]),
  async (request, response, next) => {
    try {
      const organizationId = orgIdOf(request as AuthenticatedRequest);
      const userId = String(request.params.userId);

      const actorId = (request as AuthenticatedRequest).user?.sub;

      if (userId === actorId) {
        response.status(400).json({ message: "You cannot remove yourself" });
        return;
      }

      await prisma.organizationMember.delete({
        where: { organizationId_userId: { organizationId, userId } },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

