import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const maintenanceRouter = Router();

const requestSchema = z.object({
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  unitId: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).default("MEDIUM"),
  status: z.enum(["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING", "COMPLETED"]).default("NEW"),
  assignedTo: z.string().nullable().optional(),
});

const assignmentSchema = z.object({
  assignedTo: z.string().nullable(),
});

const prioritySchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]),
});

const statusSchema = z.object({
  status: z.enum(["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING", "COMPLETED"]),
});

const commentSchema = z.object({
  author: z.string().min(1),
  body: z.string().min(1),
});

const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
});

const requestInclude = {
  unit: {
    include: {
      property: true,
      building: true,
      floor: true,
    },
  },
  comments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
  },
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
  },
};

function getFilter(value: unknown) {
  return typeof value === "string" && value !== "all" ? value : undefined;
}

maintenanceRouter.use(authenticate);

maintenanceRouter.get("/", async (request, response, next) => {
  try {
    const status = getFilter(request.query.status);
    const priority = getFilter(request.query.priority);

    const requests = await prisma.maintenanceRequest.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(priority ? { priority: priority as never } : {}),
      },
      include: requestInclude,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    response.json({ requests });
  } catch (error) {
    next(error);
  }
});

maintenanceRouter.get("/:id", async (request, response, next) => {
  try {
    const maintenanceRequest = await prisma.maintenanceRequest.findFirst({
      where: { id: String(request.params.id), deletedAt: null },
      include: requestInclude,
    });

    if (!maintenanceRequest) {
      response.status(404).json({ message: "Maintenance request not found" });
      return;
    }

    response.json({ request: maintenanceRequest });
  } catch (error) {
    next(error);
  }
});

maintenanceRouter.get("/:id/activity", async (request, response, next) => {
  try {
    const maintenanceRequest = await prisma.maintenanceRequest.findFirst({
      where: { id: String(request.params.id), deletedAt: null },
      include: requestInclude,
    });

    if (!maintenanceRequest) {
      response.status(404).json({ message: "Maintenance request not found" });
      return;
    }

    response.json({
      activity: [
        {
          id: `${maintenanceRequest.id}-created`,
          type: "created",
          label: "Request created",
          createdAt: maintenanceRequest.createdAt,
        },
        {
          id: `${maintenanceRequest.id}-updated`,
          type: "updated",
          label: `Status is ${maintenanceRequest.status.toLowerCase()}`,
          createdAt: maintenanceRequest.updatedAt,
        },
        ...maintenanceRequest.comments.map((comment) => ({
          id: comment.id,
          type: "comment",
          label: `${comment.author}: ${comment.body}`,
          createdAt: comment.createdAt,
        })),
        ...maintenanceRequest.attachments.map((attachment) => ({
          id: attachment.id,
          type: "attachment",
          label: attachment.fileName,
          createdAt: attachment.createdAt,
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    next(error);
  }
});

maintenanceRouter.post(
  "/",
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  validateBody(requestSchema),
  async (request, response, next) => {
    try {
      const maintenanceRequest = await prisma.maintenanceRequest.create({
        data: request.body,
        include: requestInclude,
      });

      response.status(201).json({ request: maintenanceRequest });
    } catch (error) {
      next(error);
    }
  }
);

maintenanceRouter.put(
  "/:id",
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  validateBody(requestSchema),
  async (request, response, next) => {
    try {
      const maintenanceRequest = await prisma.maintenanceRequest.update({
        where: { id: String(request.params.id) },
        data: request.body,
        include: requestInclude,
      });

      response.json({ request: maintenanceRequest });
    } catch (error) {
      next(error);
    }
  }
);

maintenanceRouter.patch(
  "/:id/assignment",
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  validateBody(assignmentSchema),
  async (request, response, next) => {
    try {
      const maintenanceRequest = await prisma.maintenanceRequest.update({
        where: { id: String(request.params.id) },
        data: { assignedTo: request.body.assignedTo },
        include: requestInclude,
      });

      response.json({ request: maintenanceRequest });
    } catch (error) {
      next(error);
    }
  }
);

maintenanceRouter.patch(
  "/:id/priority",
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  validateBody(prioritySchema),
  async (request, response, next) => {
    try {
      const maintenanceRequest = await prisma.maintenanceRequest.update({
        where: { id: String(request.params.id) },
        data: { priority: request.body.priority },
        include: requestInclude,
      });

      response.json({ request: maintenanceRequest });
    } catch (error) {
      next(error);
    }
  }
);

maintenanceRouter.patch(
  "/:id/status",
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  validateBody(statusSchema),
  async (request, response, next) => {
    try {
      const maintenanceRequest = await prisma.maintenanceRequest.update({
        where: { id: String(request.params.id) },
        data: { status: request.body.status },
        include: requestInclude,
      });

      response.json({ request: maintenanceRequest });
    } catch (error) {
      next(error);
    }
  }
);

maintenanceRouter.post(
  "/:id/comments",
  authorize(["ADMIN", "MANAGER", "STAFF", "TENANT"]),
  validateBody(commentSchema),
  async (request, response, next) => {
    try {
      const comment = await prisma.maintenanceComment.create({
        data: {
          requestId: String(request.params.id),
          author: request.body.author,
          body: request.body.body,
        },
      });

      response.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  }
);

maintenanceRouter.post(
  "/:id/attachments",
  authorize(["ADMIN", "MANAGER", "STAFF", "TENANT"]),
  validateBody(attachmentSchema),
  async (request, response, next) => {
    try {
      const attachment = await prisma.maintenanceAttachment.create({
        data: {
          requestId: String(request.params.id),
          fileName: request.body.fileName,
          fileUrl: request.body.fileUrl,
        },
      });

      response.status(201).json({ attachment });
    } catch (error) {
      next(error);
    }
  }
);

maintenanceRouter.delete(
  "/:id",
  authorize(["ADMIN", "MANAGER", "STAFF"]),
  async (request, response, next) => {
    try {
      await prisma.maintenanceRequest.update({
        where: { id: String(request.params.id) },
        data: { deletedAt: new Date() },
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
