import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { authenticate } from "../auth/auth.middleware.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get("/summary", async (_request, response, next) => {
  try {
    const [
      totalUnits,
      occupiedUnits,
      vacantUnits,
      paidPayments,
      outstandingPayments,
      monthlyExpenses,
      openMaintenance,
      highPriorityMaintenance,
    ] = await Promise.all([
      prisma.unit.count({ where: { deletedAt: null } }),
      prisma.unit.count({ where: { deletedAt: null, status: "OCCUPIED" } }),
      prisma.unit.count({ where: { deletedAt: null, status: "VACANT" } }),
      prisma.payment.aggregate({
        where: { deletedAt: null, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { deletedAt: null, status: { in: ["PENDING", "OVERDUE"] } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.maintenanceRequest.count({
        where: { deletedAt: null, status: { not: "COMPLETED" } },
      }),
      prisma.maintenanceRequest.count({
        where: {
          deletedAt: null,
          status: { not: "COMPLETED" },
          priority: { in: ["HIGH", "EMERGENCY"] },
        },
      }),
    ]);

    response.json({
      revenue: Number(paidPayments._sum.amount ?? 0),
      occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      vacantUnits,
      outstandingRent: Number(outstandingPayments._sum.amount ?? 0),
      monthlyExpenses: Number(monthlyExpenses._sum.amount ?? 0),
      openMaintenance,
      highPriorityMaintenance,
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/revenue-chart", async (_request, response, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { deletedAt: null, status: "PAID" },
      select: { amount: true, paidDate: true },
      orderBy: { paidDate: "asc" },
    });
    const monthly = payments.reduce<Record<string, number>>((totals, payment) => {
      const month = (payment.paidDate ?? new Date()).toISOString().slice(0, 7);
      totals[month] = (totals[month] ?? 0) + Number(payment.amount);
      return totals;
    }, {});

    response.json({
      data: Object.entries(monthly).map(([month, total]) => ({ month, total })),
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/occupancy-chart", async (_request, response, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: { deletedAt: null },
      include: { units: { where: { deletedAt: null } } },
      orderBy: { name: "asc" },
    });

    response.json({
      data: properties.map((property) => {
        const occupied = property.units.filter((unit) => unit.status === "OCCUPIED").length;
        return {
          property: property.name,
          total: property.units.length,
          occupied,
          occupancyRate: property.units.length
            ? Math.round((occupied / property.units.length) * 100)
            : 0,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/expense-statistics", async (_request, response, next) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      select: { amount: true, category: true },
    });
    const data = expenses.reduce<Record<string, number>>((totals, expense) => {
      totals[expense.category] = (totals[expense.category] ?? 0) + Number(expense.amount);
      return totals;
    }, {});

    response.json({
      data: Object.entries(data).map(([category, total]) => ({ category, total })),
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/recent-activities", async (_request, response, next) => {
  try {
    const [payments, maintenance, leases] = await Promise.all([
      prisma.payment.findMany({
        where: { deletedAt: null },
        include: { tenant: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.maintenanceRequest.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.lease.findMany({
        where: { deletedAt: null },
        include: { tenant: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    response.json({
      activities: [
        ...payments.map((payment) => ({
          id: payment.id,
          type: "payment",
          title: `${payment.status.toLowerCase()} payment`,
          detail: `${payment.tenant.name} - ${Number(payment.amount).toLocaleString()}`,
          createdAt: payment.updatedAt,
          targetUrl: "/payments",
        })),
        ...maintenance.map((request) => ({
          id: request.id,
          type: "maintenance",
          title: request.title,
          detail: `${request.priority.toLowerCase()} / ${request.status.toLowerCase()}`,
          createdAt: request.updatedAt,
          targetUrl: "/maintenance",
        })),
        ...leases.map((lease) => ({
          id: lease.id,
          type: "lease",
          title: `${lease.status.toLowerCase()} lease`,
          detail: lease.tenant.name,
          createdAt: lease.updatedAt,
          targetUrl: "/leases",
        })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/upcoming-lease-expirations", async (_request, response, next) => {
  try {
    const leases = await prisma.lease.findMany({
      where: { deletedAt: null, status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
      include: { tenant: true, unit: { include: { property: true } } },
      orderBy: { endDate: "asc" },
      take: 8,
    });

    response.json({ leases });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/high-priority-maintenance", async (_request, response, next) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      where: {
        deletedAt: null,
        status: { not: "COMPLETED" },
        priority: { in: ["HIGH", "EMERGENCY"] },
      },
      include: { unit: { include: { property: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    });

    response.json({ requests });
  } catch (error) {
    next(error);
  }
});
