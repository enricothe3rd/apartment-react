-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('TRIAL', 'FREE', 'PRO');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Building" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Floor" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Unit" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Lease" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Payment" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "MaintenanceRequest" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Expense" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Notification" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'TRIAL',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_plan_idx" ON "Organization"("plan");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill: assign all pre-existing records to a default "Demo Properties" org
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- Backfill: assign all pre-existing records to a default "Demo Properties" org
-- ---------------------------------------------------------------------------
INSERT INTO "Organization" ("id", "name", "slug", "plan", "status", "trialEndsAt", "createdAt", "updatedAt")
VALUES ('org-demo', 'Demo Properties', 'demo', 'PRO', 'ACTIVE', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Property" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Building" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Floor" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Unit" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Tenant" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Lease" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Payment" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "MaintenanceRequest" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Expense" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;
UPDATE "Notification" SET "organizationId" = 'org-demo' WHERE "organizationId" IS NULL;

INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'org-demo', u."id", 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
ON CONFLICT ("organizationId", "userId") DO NOTHING;

-- Foreign keys + indexes + NOT NULL for org-scoped data tables
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Building" ADD CONSTRAINT "Building_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Property_organizationId_idx" ON "Property"("organizationId");
CREATE INDEX "Building_organizationId_idx" ON "Building"("organizationId");
CREATE INDEX "Floor_organizationId_idx" ON "Floor"("organizationId");
CREATE INDEX "Unit_organizationId_idx" ON "Unit"("organizationId");
CREATE INDEX "Tenant_organizationId_idx" ON "Tenant"("organizationId");
CREATE INDEX "Lease_organizationId_idx" ON "Lease"("organizationId");
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");
CREATE INDEX "MaintenanceRequest_organizationId_idx" ON "MaintenanceRequest"("organizationId");
CREATE INDEX "Expense_organizationId_idx" ON "Expense"("organizationId");
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

ALTER TABLE "Property" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Building" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Floor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Unit" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Tenant" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Lease" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MaintenanceRequest" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "organizationId" SET NOT NULL;
