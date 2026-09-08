import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/modules/auth/password.js";

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@property.local" },
    update: {},
    create: {
      name: "Property Admin",
      email: "admin@property.local",
      passwordHash: hashPassword("password123"),
      role: "ADMIN",
    },
  });

  const trialUser = await prisma.user.upsert({
    where: { email: "manager@sunset.demo" },
    update: {},
    create: {
      name: "Sofia Reyes",
      email: "manager@sunset.demo",
      passwordHash: hashPassword("password123"),
      role: "MANAGER",
    },
  });

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  await prisma.organization.upsert({
    where: { id: "org-demo" },
    update: { plan: "PRO", status: "ACTIVE" },
    create: {
      id: "org-demo",
      name: "Demo Properties",
      slug: "demo-properties",
      plan: "PRO",
      status: "ACTIVE",
    },
  });

  await prisma.organization.upsert({
    where: { id: "org-trial" },
    update: {},
    create: {
      id: "org-trial",
      name: "Sunset Towers",
      slug: "sunset-towers",
      plan: "TRIAL",
      status: "ACTIVE",
      trialEndsAt: trialEnds,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: "org-demo", userId: adminUser.id },
    },
    update: { role: "ADMIN" },
    create: { organizationId: "org-demo", userId: adminUser.id, role: "ADMIN" },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: "org-trial", userId: trialUser.id },
    },
    update: { role: "ADMIN" },
    create: { organizationId: "org-trial", userId: trialUser.id, role: "ADMIN" },
  });

  const ORG = "org-demo";

  const property = await prisma.property.upsert({
    where: { id: "seed-property-maple" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-property-maple",
      name: "Maple Residences",
      address: "112 Maple Avenue",
      city: "Quezon City",
      buildings: {
        create: {
          organizationId: ORG,
          id: "seed-building-a",
          name: "A",
          floors: {
            create: {
              organizationId: ORG,
              id: "seed-floor-a-1",
              level: 1,
            },
          },
        },
      },
    },
  });

  const building = await prisma.building.findFirstOrThrow({
    where: { propertyId: property.id, name: "A" },
  });
  const floor = await prisma.floor.findFirstOrThrow({
    where: { buildingId: building.id, level: 1 },
  });

  const unit = await prisma.unit.upsert({
    where: { id: "seed-unit-a-101" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-unit-a-101",
      propertyId: property.id,
      buildingId: building.id,
      floorId: floor.id,
      label: "A-101",
      bedrooms: 2,
      bathrooms: 1,
      monthlyRent: 24500,
      status: "OCCUPIED",
    },
  });

  const secondUnit = await prisma.unit.upsert({
    where: { id: "seed-unit-a-102" },
    update: { status: "DELINQUENT" },
    create: {
      organizationId: ORG,
      id: "seed-unit-a-102",
      propertyId: property.id,
      buildingId: building.id,
      floorId: floor.id,
      label: "A-102",
      bedrooms: 1,
      bathrooms: 1,
      monthlyRent: 18500,
      status: "DELINQUENT",
    },
  });

  const thirdUnit = await prisma.unit.upsert({
    where: { id: "seed-unit-a-103" },
    update: { status: "MAINTENANCE" },
    create: {
      organizationId: ORG,
      id: "seed-unit-a-103",
      propertyId: property.id,
      buildingId: building.id,
      floorId: floor.id,
      label: "A-103",
      bedrooms: 2,
      bathrooms: 2,
      monthlyRent: 31500,
      status: "MAINTENANCE",
    },
  });

  const fourthUnit = await prisma.unit.upsert({
    where: { id: "seed-unit-a-104" },
    update: { status: "VACANT" },
    create: {
      organizationId: ORG,
      id: "seed-unit-a-104",
      propertyId: property.id,
      buildingId: building.id,
      floorId: floor.id,
      label: "A-104",
      bedrooms: 1,
      bathrooms: 1,
      monthlyRent: 19500,
      status: "VACANT",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { email: "angela.reyes@example.com" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-tenant-angela",
      name: "Angela Reyes",
      email: "angela.reyes@example.com",
      phone: "+63 917 555 0101",
      unitId: unit.id,
    },
  });

  const secondTenant = await prisma.tenant.upsert({
    where: { email: "marco.santos@example.com" },
    update: { unitId: secondUnit.id },
    create: {
      organizationId: ORG,
      id: "seed-tenant-marco",
      name: "Marco Santos",
      email: "marco.santos@example.com",
      phone: "+63 918 555 0198",
      unitId: secondUnit.id,
    },
  });

  await prisma.tenant.upsert({
    where: { email: "lina.cruz@example.com" },
    update: { unitId: null },
    create: {
      id: "seed-tenant-lina",
      name: "Lina Cruz",
      email: "lina.cruz@example.com",
      phone: "+63 919 555 0182",
    },
  });

  const lease = await prisma.lease.upsert({
    where: { id: "seed-lease-angela-2026" },
    update: { status: "EXPIRING_SOON", endDate: new Date("2026-09-30") },
    create: {
      organizationId: ORG,
      id: "seed-lease-angela-2026",
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-09-30"),
      monthlyRent: 24500,
      deposit: 49000,
      status: "EXPIRING_SOON",
    },
  });

  await prisma.payment.upsert({
    where: { id: "seed-payment-september" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-payment-september",
      tenantId: tenant.id,
      unitId: unit.id,
      leaseId: lease.id,
      dueDate: new Date("2026-09-01"),
      paidDate: new Date("2026-09-01"),
      amount: 24500,
      status: "PAID",
      method: "bank_transfer",
    },
  });

  const secondLease = await prisma.lease.upsert({
    where: { id: "seed-lease-marco-2026" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-lease-marco-2026",
      tenantId: secondTenant.id,
      unitId: secondUnit.id,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2027-02-28"),
      monthlyRent: 18500,
      deposit: 37000,
      status: "ACTIVE",
    },
  });

  await prisma.payment.upsert({
    where: { id: "seed-payment-marco-overdue" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-payment-marco-overdue",
      tenantId: secondTenant.id,
      unitId: secondUnit.id,
      leaseId: secondLease.id,
      dueDate: new Date("2026-09-01"),
      amount: 18500,
      status: "OVERDUE",
    },
  });

  await prisma.expense.upsert({
    where: { id: "seed-expense-aircon" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-expense-aircon",
      propertyId: property.id,
      category: "Repairs",
      description: "Aircon service and parts",
      amount: 6200,
      expenseDate: new Date("2026-09-05"),
    },
  });

  await prisma.maintenanceRequest.upsert({
    where: { id: "seed-maintenance-aircon" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-maintenance-aircon",
      title: "Aircon leak in bedroom",
      description: "Tenant reported water leaking from the bedroom aircon.",
      unitId: thirdUnit.id,
      priority: "HIGH",
      status: "ASSIGNED",
      assignedTo: "R. Mendoza",
    },
  });

  await prisma.payment.upsert({
    where: { id: "seed-payment-vacant-hold" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-payment-vacant-hold",
      tenantId: tenant.id,
      unitId: unit.id,
      leaseId: lease.id,
      dueDate: new Date("2026-10-01"),
      amount: 24500,
      status: "PENDING",
    },
  });

  await prisma.notification.upsert({
    where: { id: "seed-notification-lease" },
    update: {},
    create: {
      organizationId: ORG,
      id: "seed-notification-lease",
      type: "lease",
      title: "Lease review",
      message: "Review active lease terms for Angela Reyes.",
      targetUrl: "/leases",
    },
  });

  console.log(
    `Seeded property: ${property.name} with units ${unit.label}, ${secondUnit.label}, ${thirdUnit.label}, ${fourthUnit.label}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
