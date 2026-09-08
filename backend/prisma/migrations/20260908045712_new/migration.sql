-- DropForeignKey
ALTER TABLE "Building" DROP CONSTRAINT "Building_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Floor" DROP CONSTRAINT "Floor_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequest" DROP CONSTRAINT "MaintenanceRequest_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_organizationId_fkey";

-- DropIndex
DROP INDEX "Building_organizationId_idx";

-- DropIndex
DROP INDEX "Expense_organizationId_idx";

-- DropIndex
DROP INDEX "Floor_organizationId_idx";

-- DropIndex
DROP INDEX "Lease_organizationId_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_organizationId_idx";

-- DropIndex
DROP INDEX "Notification_organizationId_idx";

-- DropIndex
DROP INDEX "Payment_organizationId_idx";

-- DropIndex
DROP INDEX "Property_organizationId_idx";

-- DropIndex
DROP INDEX "Tenant_organizationId_idx";

-- DropIndex
DROP INDEX "Unit_organizationId_idx";

-- AlterTable
ALTER TABLE "Building" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Floor" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Lease" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceRequest" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "organizationId" DROP NOT NULL;
