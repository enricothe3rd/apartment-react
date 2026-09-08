import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { authenticate } from "../auth/auth.middleware.js";

export const reportsRouter = Router();

type ReportType = "revenue" | "expenses" | "occupancy" | "payments" | "maintenance";
type ReportRow = Record<string, string | number>;

const reportTypes: ReportType[] = [
  "revenue",
  "expenses",
  "occupancy",
  "payments",
  "maintenance",
];

function getReportType(value: string): ReportType | undefined {
  return reportTypes.find((type) => type === value);
}

function getString(value: unknown) {
  return typeof value === "string" && value !== "all" ? value : undefined;
}

function getDate(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateRange(query: Record<string, unknown>) {
  const startDate = getDate(query.startDate);
  const endDate = getDate(query.endDate);

  return startDate || endDate
    ? {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      }
    : undefined;
}

function toCsv(rows: ReportRow[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;

  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(",")),
  ].join("\n");
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function toPdf(title: string, rows: ReportRow[]) {
  const lines = [
    title,
    "",
    ...rows.flatMap((row) => [
      Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" | ")
        .slice(0, 110),
    ]),
  ].slice(0, 42);
  const text = lines
    .map((line, index) => `BT /F1 10 Tf 40 ${770 - index * 16} Td (${escapePdfText(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${text.length} >> stream\n${text}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join("\n");
  pdf += `\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

async function buildReport(type: ReportType, query: Record<string, unknown>) {
  const propertyId = getString(query.propertyId);
  const range = dateRange(query);

  if (type === "revenue") {
    const payments = await prisma.payment.findMany({
      where: {
        deletedAt: null,
        status: "PAID",
        ...(range ? { paidDate: range } : {}),
        ...(propertyId ? { unit: { propertyId } } : {}),
      },
      include: { tenant: true, unit: { include: { property: true } } },
      orderBy: { paidDate: "desc" },
    });
    const rows = payments.map((payment) => ({
      date: payment.paidDate?.toISOString().slice(0, 10) ?? "",
      property: payment.unit.property.name,
      tenant: payment.tenant.name,
      unit: payment.unit.label,
      amount: Number(payment.amount),
      method: payment.method ?? "",
    }));

    return {
      title: "Revenue Report",
      metrics: { total: rows.reduce((sum, row) => sum + Number(row.amount), 0), rows: rows.length },
      rows,
    };
  }

  if (type === "expenses") {
    const expenses = await prisma.expense.findMany({
      where: {
        deletedAt: null,
        ...(range ? { expenseDate: range } : {}),
        ...(propertyId ? { propertyId } : {}),
      },
      include: { property: true },
      orderBy: { expenseDate: "desc" },
    });
    const rows = expenses.map((expense) => ({
      date: expense.expenseDate.toISOString().slice(0, 10),
      property: expense.property.name,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount),
    }));

    return {
      title: "Expense Report",
      metrics: { total: rows.reduce((sum, row) => sum + Number(row.amount), 0), rows: rows.length },
      rows,
    };
  }

  if (type === "occupancy") {
    const properties = await prisma.property.findMany({
      where: { deletedAt: null, ...(propertyId ? { id: propertyId } : {}) },
      include: { units: { where: { deletedAt: null } } },
      orderBy: { name: "asc" },
    });
    const rows = properties.map((property) => {
      const occupied = property.units.filter((unit) => unit.status === "OCCUPIED").length;
      return {
        property: property.name,
        city: property.city,
        totalUnits: property.units.length,
        occupiedUnits: occupied,
        vacantUnits: property.units.filter((unit) => unit.status === "VACANT").length,
        occupancyRate: property.units.length ? Math.round((occupied / property.units.length) * 100) : 0,
      };
    });

    return {
      title: "Occupancy Report",
      metrics: {
        totalUnits: rows.reduce((sum, row) => sum + Number(row.totalUnits), 0),
        occupiedUnits: rows.reduce((sum, row) => sum + Number(row.occupiedUnits), 0),
      },
      rows,
    };
  }

  if (type === "payments") {
    const payments = await prisma.payment.findMany({
      where: {
        deletedAt: null,
        ...(range ? { dueDate: range } : {}),
        ...(propertyId ? { unit: { propertyId } } : {}),
      },
      include: { tenant: true, unit: { include: { property: true } } },
      orderBy: { dueDate: "desc" },
    });
    const rows = payments.map((payment) => ({
      dueDate: payment.dueDate.toISOString().slice(0, 10),
      property: payment.unit.property.name,
      tenant: payment.tenant.name,
      unit: payment.unit.label,
      amount: Number(payment.amount),
      status: payment.status,
    }));

    return {
      title: "Payment Report",
      metrics: {
        paid: rows.filter((row) => row.status === "PAID").reduce((sum, row) => sum + Number(row.amount), 0),
        outstanding: rows.filter((row) => row.status !== "PAID").reduce((sum, row) => sum + Number(row.amount), 0),
      },
      rows,
    };
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      deletedAt: null,
      ...(range ? { createdAt: range } : {}),
      ...(propertyId ? { unit: { propertyId } } : {}),
    },
    include: { unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
  const rows = requests.map((request) => ({
    createdAt: request.createdAt.toISOString().slice(0, 10),
    property: request.unit.property.name,
    unit: request.unit.label,
    title: request.title,
    priority: request.priority,
    status: request.status,
    assignedTo: request.assignedTo ?? "",
  }));

  return {
    title: "Maintenance Report",
    metrics: {
      open: rows.filter((row) => row.status !== "COMPLETED").length,
      highPriority: rows.filter((row) => ["HIGH", "EMERGENCY"].includes(String(row.priority))).length,
    },
    rows,
  };
}

reportsRouter.use(authenticate);

reportsRouter.get("/:type", async (request, response, next) => {
  try {
    const type = getReportType(request.params.type);
    if (!type) {
      response.status(404).json({ message: "Report not found" });
      return;
    }

    response.json({ report: await buildReport(type, request.query) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:type/export.csv", async (request, response, next) => {
  try {
    const type = getReportType(request.params.type);
    if (!type) {
      response.status(404).json({ message: "Report not found" });
      return;
    }

    const report = await buildReport(type, request.query);
    response.header("Content-Type", "text/csv");
    response.attachment(`${type}-report.csv`);
    response.send(toCsv(report.rows));
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:type/export.pdf", async (request, response, next) => {
  try {
    const type = getReportType(request.params.type);
    if (!type) {
      response.status(404).json({ message: "Report not found" });
      return;
    }

    const report = await buildReport(type, request.query);
    response.header("Content-Type", "application/pdf");
    response.attachment(`${type}-report.pdf`);
    response.send(toPdf(report.title, report.rows));
  } catch (error) {
    next(error);
  }
});
