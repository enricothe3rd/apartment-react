import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const notificationsRouter = Router();

const notificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  targetUrl: z.string().nullable().optional(),
  read: z.boolean().optional(),
});

async function generateSystemNotifications() {
  const overduePayments = await prisma.payment.findMany({
    where: { deletedAt: null, status: "OVERDUE" },
    include: { tenant: true },
  });
  const expiringLeases = await prisma.lease.findMany({
    where: { deletedAt: null, status: "EXPIRING_SOON" },
    include: { tenant: true, unit: true },
  });
  const urgentMaintenance = await prisma.maintenanceRequest.findMany({
    where: {
      deletedAt: null,
      status: { not: "COMPLETED" },
      priority: { in: ["HIGH", "EMERGENCY"] },
    },
  });

  await prisma.$transaction([
    ...overduePayments.map((payment) =>
      prisma.notification.upsert({
        where: { id: `rent-${payment.id}` },
        update: {},
        create: {
          id: `rent-${payment.id}`,
          type: "rent",
          title: "Overdue rent",
          message: `${payment.tenant.name} has overdue rent of ${Number(payment.amount).toLocaleString()}.`,
          targetUrl: "/payments",
        },
      })
    ),
    ...expiringLeases.map((lease) =>
      prisma.notification.upsert({
        where: { id: `lease-${lease.id}` },
        update: {},
        create: {
          id: `lease-${lease.id}`,
          type: "lease",
          title: "Lease expiring soon",
          message: `${lease.tenant.name}'s lease for ${lease.unit.label} needs review.`,
          targetUrl: "/leases",
        },
      })
    ),
    ...urgentMaintenance.map((request) =>
      prisma.notification.upsert({
        where: { id: `maintenance-${request.id}` },
        update: {},
        create: {
          id: `maintenance-${request.id}`,
          type: "maintenance",
          title: "Priority maintenance",
          message: request.title,
          targetUrl: "/maintenance",
        },
      })
    ),
  ]);
}

notificationsRouter.use(authenticate);

notificationsRouter.get("/", async (request, response, next) => {
  try {
    await generateSystemNotifications();
    const unreadOnly = request.query.unread === "true";
    const notifications = await prisma.notification.findMany({
      where: {
        deletedAt: null,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    const unreadCount = await prisma.notification.count({
      where: { deletedAt: null, read: false },
    });

    response.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(notificationSchema),
  async (request, response, next) => {
    try {
      const notification = await prisma.notification.create({
        data: request.body,
      });

      response.status(201).json({ notification });
    } catch (error) {
      next(error);
    }
  }
);

notificationsRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  validateBody(notificationSchema),
  async (request, response, next) => {
    try {
      const notification = await prisma.notification.update({
        where: { id: String(request.params.id) },
        data: request.body,
      });

      response.json({ notification });
    } catch (error) {
      next(error);
    }
  }
);

notificationsRouter.patch("/:id/read", async (request, response, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: String(request.params.id) },
      data: { read: true },
    });

    response.json({ notification });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/mark-all-read", async (_request, response, next) => {
  try {
    await prisma.notification.updateMany({
      where: { deletedAt: null, read: false },
      data: { read: true },
    });

    response.json({ message: "Notifications marked as read" });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER"]),
  async (request, response, next) => {
    try {
      await prisma.notification.update({
        where: { id: String(request.params.id) },
        data: { deletedAt: new Date() },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
