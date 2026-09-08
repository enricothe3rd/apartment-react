import cors from "cors";
import express from "express";
import helmet from "helmet";
import { isAllowedOrigin } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { buildingsRouter } from "./modules/buildings/buildings.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { expensesRouter } from "./modules/expenses/expenses.routes.js";
import { floorsRouter } from "./modules/floors/floors.routes.js";
import { leasesRouter } from "./modules/leases/leases.routes.js";
import { maintenanceRouter } from "./modules/maintenance/maintenance.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { createPlaceholderRouter } from "./modules/placeholder-router.js";
import { propertiesRouter } from "./modules/properties/properties.routes.js";
import { billingRouter } from "./modules/billing/billing.routes.js";
import { organizationsRouter } from "./modules/organizations/organizations.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { systemRouter } from "./modules/system/system.routes.js";
import { tenantsRouter } from "./modules/tenants/tenants.routes.js";
import { unitsRouter } from "./modules/units/units.routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "property-management-backend",
  });
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "property-management-backend",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/system", systemRouter);
app.use("/api/users", createPlaceholderRouter("users"));
app.use("/api/properties", propertiesRouter);
app.use("/api/buildings", buildingsRouter);
app.use("/api/floors", floorsRouter);
app.use("/api/units", unitsRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/leases", leasesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/billing", billingRouter);

app.use("/api", (request, response) => {
  response.status(404).json({
    message: `API route not found: ${request.method} ${request.originalUrl}`,
  });
});

app.use(errorHandler);
