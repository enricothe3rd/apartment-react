/// <reference types="node" />

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.property.findMany({
    where: { deletedAt: null },
    include: {
      buildings: {
        where: { deletedAt: null },
        include: {
          floors: { where: { deletedAt: null } },
          units: {
            where: { deletedAt: null },
            include: {
              tenants: { where: { deletedAt: null } },
              leases: { where: { deletedAt: null } },
              payments: { where: { deletedAt: null } },
            },
          },
        },
      },
      expenses: { where: { deletedAt: null } },
    },
  });

  const summary = properties.map((property) => ({
    property: property.name,
    buildings: property.buildings.length,
    floors: property.buildings.reduce(
      (total, building) => total + building.floors.length,
      0
    ),
    units: property.buildings.reduce(
      (total, building) => total + building.units.length,
      0
    ),
    tenants: property.buildings.reduce(
      (total, building) =>
        total +
        building.units.reduce(
          (unitTotal, unit) => unitTotal + unit.tenants.length,
          0
        ),
      0
    ),
    leases: property.buildings.reduce(
      (total, building) =>
        total +
        building.units.reduce(
          (unitTotal, unit) => unitTotal + unit.leases.length,
          0
        ),
      0
    ),
    payments: property.buildings.reduce(
      (total, building) =>
        total +
        building.units.reduce(
          (unitTotal, unit) => unitTotal + unit.payments.length,
          0
        ),
      0
    ),
    expenses: property.expenses.length,
  }));

  console.table(summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
