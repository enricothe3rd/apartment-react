import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type ReportType = "revenue" | "expenses" | "occupancy" | "payments" | "maintenance";
type ReportRow = Record<string, string | number>;

type Report = {
  title: string;
  metrics: Record<string, string | number>;
  rows: ReportRow[];
};

type PropertyOption = {
  id: string;
  name: string;
};

type SavedReportConfig = {
  id: string;
  name: string;
  reportType: ReportType;
  propertyFilter: string;
  startDate: string;
  endDate: string;
};

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "expenses", label: "Expenses" },
  { value: "occupancy", label: "Occupancy" },
  { value: "payments", label: "Payments" },
  { value: "maintenance", label: "Maintenance" },
];

const formatValue = (value: string | number) => {
  if (typeof value === "number" && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return String(value);
};

export default function Reports() {
  const { token } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<SavedReportConfig[]>(() => {
    const stored = window.localStorage.getItem("property-report-configs");
    return stored ? (JSON.parse(stored) as SavedReportConfig[]) : [];
  });
  const [configName, setConfigName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (propertyFilter !== "all") params.set("propertyId", propertyFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString();
  }, [endDate, propertyFilter, startDate]);

  async function loadReport() {
    setIsLoading(true);
    setError("");

    try {
      const [reportResponse, propertyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/${reportType}?${queryString}`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE_URL}/properties`, { headers: authHeaders }),
      ]);
      const [reportData, propertyData] = await Promise.all([
        reportResponse.json(),
        propertyResponse.json(),
      ]);

      if (!reportResponse.ok) {
        throw new Error(reportData.message ?? "Unable to load report");
      }

      if (!propertyResponse.ok) {
        throw new Error(propertyData.message ?? "Unable to load properties");
      }

      setReport(reportData.report);
      setProperties(propertyData.properties);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load report");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadReport();
  }, [token, reportType, queryString]);

  const headers = report?.rows[0] ? Object.keys(report.rows[0]) : [];
  const maxMetric = Math.max(
    1,
    ...Object.values(report?.metrics ?? {}).map((value) =>
      typeof value === "number" ? Math.abs(value) : 0
    )
  );

  function persistConfigs(nextConfigs: SavedReportConfig[]) {
    setSavedConfigs(nextConfigs);
    window.localStorage.setItem("property-report-configs", JSON.stringify(nextConfigs));
  }

  function saveCurrentConfig() {
    const trimmedName = configName.trim();
    if (!trimmedName) {
      setError("Configuration name is required.");
      return;
    }

    const nextConfig: SavedReportConfig = {
      id: trimmedName.toLowerCase().split(" ").join("-"),
      name: trimmedName,
      reportType,
      propertyFilter,
      startDate,
      endDate,
    };
    persistConfigs([
      ...savedConfigs.filter((config) => config.id !== nextConfig.id),
      nextConfig,
    ]);
    setConfigName("");
    setMessage("Report configuration saved.");
    setError("");
  }

  function applyConfig(config: SavedReportConfig) {
    setReportType(config.reportType);
    setPropertyFilter(config.propertyFilter);
    setStartDate(config.startDate);
    setEndDate(config.endDate);
    setConfigName(config.name);
  }

  function deleteConfig(configId: string) {
    persistConfigs(savedConfigs.filter((config) => config.id !== configId));
    setMessage("Report configuration deleted.");
  }

  async function downloadExport(format: "csv" | "pdf") {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/${reportType}/export.${format}?${queryString}`,
        { headers: authHeaders }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? `Unable to download ${format.toUpperCase()}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-report.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage(`${format.toUpperCase()} export downloaded.`);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : `Unable to download ${format.toUpperCase()}`
      );
    }
  }

  return (
    <>
      <PageMeta
        title="Reports | Property Management Dashboard"
        description="Review revenue, expenses, occupancy, payments, and maintenance reports with CSV and PDF export."
      />
      <PageBreadcrumb pageTitle="Reports" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Reports And Export
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Generate filtered operational reports and export them as CSV or PDF.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                value={propertyFilter}
                onChange={(event) => setPropertyFilter(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Loading report...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Object.entries(report?.metrics ?? {}).map(([label, value]) => (
                <Metric key={label} label={label} value={formatValue(value)} />
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {report?.title ?? "Report"}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadExport("csv")}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadExport("pdf")}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
                    >
                      PDF
                    </button>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="max-w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                        <TableRow>
                          {headers.map((header) => (
                            <TableCell
                              key={header}
                              isHeader
                              className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500"
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {(report?.rows ?? []).map((row, index) => (
                          <TableRow key={`${reportType}-${index}`}>
                            {headers.map((header) => (
                              <TableCell
                                key={header}
                                className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300"
                              >
                                {formatValue(row[header] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <aside className="space-y-6 xl:col-span-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Report Chart
                  </h2>
                  <div className="mt-5 space-y-4">
                    {Object.entries(report?.metrics ?? {}).map(([label, value]) => {
                      const numericValue = typeof value === "number" ? Math.abs(value) : 0;

                      return (
                        <div key={label}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {label}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {formatValue(value)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{
                                width: `${Math.max(8, (numericValue / maxMetric) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Saved Configurations
                  </h2>
                  <div className="mt-4 flex gap-2">
                    <input
                      value={configName}
                      onChange={(event) => setConfigName(event.target.value)}
                      placeholder="Configuration name"
                      className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                    <button
                      type="button"
                      onClick={saveCurrentConfig}
                      className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
                    >
                      Save
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {savedConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                      >
                        <button
                          type="button"
                          onClick={() => applyConfig(config)}
                          className="min-w-0 flex-1 text-left text-sm font-medium text-gray-700 hover:text-brand-500 dark:text-gray-300"
                        >
                          <span className="block truncate">{config.name}</span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {config.reportType}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteConfig(config.id)}
                          className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    {!savedConfigs.length && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No saved configurations.
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
