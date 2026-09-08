import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { authenticate, authorize, requireOrg } from "../auth/auth.middleware.js";
import { PLAN_LIMITS, effectivePlan } from "./plans.js";

export const billingRouter = Router();

billingRouter.use(authenticate, requireOrg);

const planSchema = z.object({
  plan: z.enum(["TRIAL", "FREE", "PRO"]),
});

function orgIdOf(request: AuthenticatedRequest): string {
  if (!request.user?.orgId) {
    throw new Error("No organization assigned to account");
  }

  return request.user.orgId;
}

// GET /api/billing/entitlements - plan, limits, current usage, features
billingRouter.get("/entitlements", async (request, response, next) => {
  try {
    const organizationId = orgIdOf(request as AuthenticatedRequest);
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      response.status(404).json({ message: "Organization not found" });
      return;
    }

    const plan = effectivePlan({
      plan: organization.plan as "TRIAL" | "FREE" | "PRO",
      status: organization.status,
      trialEndsAt: organization.trialEndsAt,
    });

    const [properties, units, tenants, members] = await Promise.all([
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.unit.count({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.organizationMember.count({ where: { organizationId } }),
    ]);

    const limits = PLAN_LIMITS[plan];

    response.json({
      plan,
      status: organization.status,
      trialEndsAt: organization.trialEndsAt,
      limits,
      features: limits.features,
      usage: { properties, units, tenants, members },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/billing/upgrade - testing-only plan switch (no real payment)
billingRouter.post(
  "/upgrade",
  authorize(["ADMIN"]),
  validateBody(planSchema),
  async (request, response, next) => {
    try {
      const organizationId = orgIdOf(request as AuthenticatedRequest);
      const plan = request.body.plan as "TRIAL" | "FREE" | "PRO";

      const trialEndsAt =
        plan === "TRIAL" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;

      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: { plan, status: "ACTIVE", trialEndsAt },
      });

      response.json({
        message: `Plan switched to ${plan} (testing mode)`,
        plan: effectivePlan({
          plan: organization.plan as "TRIAL" | "FREE" | "PRO",
          status: organization.status,
          trialEndsAt: organization.trialEndsAt,
        }),
        limits: PLAN_LIMITS[
          effectivePlan({
            plan: organization.plan as "TRIAL" | "FREE" | "PRO",
            status: organization.status,
            trialEndsAt: organization.trialEndsAt,
          })
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);
