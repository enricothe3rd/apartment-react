import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";

const ORG_SCOPED_MODELS = new Set([
  "Property",
  "Building",
  "Floor",
  "Unit",
  "Tenant",
  "Lease",
  "Payment",
  "MaintenanceRequest",
  "Expense",
  "Notification",
]);

/**
 * Holds the organizationId for the current request. Set by the auth
 * middleware via `orgContext.run(orgId, next)`. When present, the extended
 * Prisma client below automatically scopes every query on org-owned models.
 */
export const orgContext = new AsyncLocalStorage<string | undefined>();

const base = new PrismaClient();

type WhereInput = { AND?: unknown[]; OR?: unknown[]; organizationId?: unknown } & Record<
  string,
  unknown
>;

function withOrgFilter(where: unknown, organizationId: string): WhereInput {
  const existing = (where ?? {}) as WhereInput;

  if (existing.organizationId) {
    return existing;
  }

  return { AND: [existing, { organizationId }] };
}

function notFoundError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("No record found", {
    code: "P2025",
    clientVersion: Prisma.prismaVersion.client,
  });
}

const extended = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const organizationId = orgContext.getStore();
        const modelName = model as string;

        if (!organizationId || !ORG_SCOPED_MODELS.has(modelName)) {
          return query(args);
        }

        const anyArgs = args as { where?: unknown; data?: unknown };

        switch (operation) {
          case "findMany":
          case "findFirst":
          case "count":
          case "aggregate":
          case "groupBy":
            anyArgs.where = withOrgFilter(anyArgs.where, organizationId);
            break;

          case "findFirstOrThrow":
            anyArgs.where = withOrgFilter(anyArgs.where, organizationId);
            break;

          case "findUnique": {
            const record = await query(args);
            if (
              record &&
              (record as { organizationId?: string | null }).organizationId !==
                organizationId
            ) {
              return null;
            }
            return record;
          }

          case "findUniqueOrThrow": {
            const record = await query(args);
            if (
              !record ||
              (record as { organizationId?: string | null }).organizationId !==
                organizationId
            ) {
              throw notFoundError();
            }
            return record;
          }

          case "create":
            anyArgs.data = {
              ...(anyArgs.data as object),
              organizationId,
            };
            break;

          case "createMany": {
            const records = anyArgs.data as { organizationId?: string }[];
            anyArgs.data = records.map((record) => ({
              ...record,
              organizationId,
            }));
            break;
          }

          case "update":
          case "delete": {
            const where = (args as { where: { id?: string } }).where;
            const owned = await (base as never as Record<
              string,
              {
                findUnique: (input: {
                  where: unknown;
                  select: { organizationId: true };
                }) => Promise<{ organizationId: string | null } | null>;
              }
            >)[modelName].findUnique({
              where,
              select: { organizationId: true },
            });

            if (!owned || owned.organizationId !== organizationId) {
              throw notFoundError();
            }
            break;
          }

          case "updateMany":
          case "deleteMany":
            anyArgs.where = withOrgFilter(anyArgs.where, organizationId);
            break;

          default:
            break;
        }

        return query(args);
      },
    },
  },
});

/** Org-scoped Prisma client. Outside a request context it behaves like a normal client. */
export const prisma = extended as unknown as PrismaClient;

/** Unscoped client for auth / system queries that must never leak into tenant context. */
export const rawPrisma = base;
