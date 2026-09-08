export type PlanKey = "TRIAL" | "FREE" | "PRO";

export type PlanLimits = {
  maxProperties: number;
  maxUnits: number;
  maxTenants: number;
  maxMembers: number;
  features: {
    reports: boolean;
    export: boolean;
  };
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  TRIAL: {
    maxProperties: 1,
    maxUnits: 5,
    maxTenants: 3,
    maxMembers: 2,
    features: { reports: false, export: false },
  },
  FREE: {
    maxProperties: 0,
    maxUnits: 0,
    maxTenants: 0,
    maxMembers: 1,
    features: { reports: false, export: false },
  },
  PRO: {
    maxProperties: 100,
    maxUnits: 1000,
    maxTenants: 1000,
    maxMembers: 50,
    features: { reports: true, export: true },
  },
};

export type EffectiveOrg = {
  plan: PlanKey;
  status: string;
  trialEndsAt?: Date | null;
};

export function effectivePlan(org: EffectiveOrg): PlanKey {
  if (org.status === "CANCELED") {
    return "FREE";
  }

  if (org.plan === "TRIAL" && org.trialEndsAt && org.trialEndsAt.getTime() <= Date.now()) {
    return "FREE";
  }

  return org.plan;
}
