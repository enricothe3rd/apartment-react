import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type Summary = {
  revenue: number;
  occupancyRate: number;
  vacantUnits: number;
  outstandingRent: number;
  monthlyExpenses: number;
  openMaintenance: number;
  highPriorityMaintenance: number;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  detail: string;
  targetUrl: string;
};

type ChartPoint = Record<string, string | number>;

type Lease = {
  id: string;
  endDate: string;
  tenant: { name: string };
  unit: { label: string; property?: { name: string } };
};

type MaintenanceRequest = {
  id: string;
  title: string;
  priority: string;
  status: string;
  unit: { label: string; property?: { name: string } };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default function Dashboard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenueChart, setRevenueChart] = useState<ChartPoint[]>([]);
  const [occupancyChart, setOccupancyChart] = useState<ChartPoint[]>([]);
  const [expenseChart, setExpenseChart] = useState<ChartPoint[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [
          summaryResponse,
          revenueResponse,
          occupancyResponse,
          expenseResponse,
          activityResponse,
          leaseResponse,
          maintenanceResponse,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/summary`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/dashboard/revenue-chart`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/dashboard/occupancy-chart`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/dashboard/expense-statistics`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/dashboard/recent-activities`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/dashboard/upcoming-lease-expirations`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/dashboard/high-priority-maintenance`, { headers: authHeaders }),
        ]);
        const [
          summaryData,
          revenueData,
          occupancyData,
          expenseData,
          activityData,
          leaseData,
          maintenanceData,
        ] = await Promise.all([
          summaryResponse.json(),
          revenueResponse.json(),
          occupancyResponse.json(),
          expenseResponse.json(),
          activityResponse.json(),
          leaseResponse.json(),
          maintenanceResponse.json(),
        ]);

        if (!summaryResponse.ok) throw new Error(summaryData.message ?? "Unable to load dashboard");

        setSummary(summaryData);
        setRevenueChart(revenueData.data ?? []);
        setOccupancyChart(occupancyData.data ?? []);
        setExpenseChart(expenseData.data ?? []);
        setActivities(activityData.activities ?? []);
        setLeases(leaseData.leases ?? []);
        setMaintenance(maintenanceData.requests ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    if (token) void loadDashboard();
  }, [token]);

  const maxChartValue = Math.max(
    1,
    ...revenueChart.map((item) => Number(item.total ?? 0)),
    ...occupancyChart.map((item) => Number(item.occupancyRate ?? 0)),
    ...expenseChart.map((item) => Number(item.total ?? 0))
  );

  return (
    <>
      <PageMeta
        title="Dashboard | Property Management Dashboard"
        description="Monitor revenue, occupancy, vacant units, outstanding rent, expenses, maintenance, and recent portfolio activity."
      />
      <PageBreadcrumb pageTitle="Dashboard" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Property Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Live metrics from properties, leases, payments, expenses, and maintenance.
          </p>
        </section>

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Loading dashboard...
          </div>
        ) : summary ? (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Revenue" value={formatCurrency(summary.revenue)} />
              <Metric label="Occupancy" value={`${summary.occupancyRate}%`} />
              <Metric label="Vacant Units" value={String(summary.vacantUnits)} />
              <Metric label="Outstanding Rent" value={formatCurrency(summary.outstandingRent)} />
              <Metric label="Expenses" value={formatCurrency(summary.monthlyExpenses)} />
              <Metric label="Open Maintenance" value={String(summary.openMaintenance)} />
              <Metric label="High Priority" value={String(summary.highPriorityMaintenance)} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Chart
                title="Revenue"
                data={revenueChart}
                labelKey="month"
                valueKey="total"
                max={maxChartValue}
                currency
              />
              <Chart
                title="Occupancy"
                data={occupancyChart}
                labelKey="property"
                valueKey="occupancyRate"
                max={maxChartValue}
              />
              <Chart
                title="Expenses"
                data={expenseChart}
                labelKey="category"
                valueKey="total"
                max={maxChartValue}
                currency
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Panel title="Recent Activities">
                {activities.map((activity) => (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    to={activity.targetUrl}
                    className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {activity.detail}
                    </p>
                  </Link>
                ))}
                {!activities.length && <EmptyState text="No recent activities." />}
              </Panel>

              <Panel title="Upcoming Expirations">
                {leases.map((lease) => (
                  <Link
                    key={lease.id}
                    to="/leases"
                    className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {lease.tenant.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {lease.unit.property?.name ?? "Property"} / {lease.unit.label} / Ends{" "}
                      {lease.endDate.slice(0, 10)}
                    </p>
                  </Link>
                ))}
                {!leases.length && <EmptyState text="No upcoming lease expirations." />}
              </Panel>

              <Panel title="High-Priority Maintenance">
                {maintenance.map((request) => (
                  <Link
                    key={request.id}
                    to="/maintenance"
                    className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.title}
                      </p>
                      <Badge color="error" size="sm">
                        {request.priority.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {request.unit.property?.name ?? "Property"} / {request.unit.label}
                    </p>
                  </Link>
                ))}
                {!maintenance.length && <EmptyState text="No urgent maintenance." />}
              </Panel>
            </section>
          </>
        ) : (
          <EmptyState text="No dashboard data." />
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

function Chart({
  title,
  data,
  labelKey,
  valueKey,
  max,
  currency = false,
}: {
  title: string;
  data: ChartPoint[];
  labelKey: string;
  valueKey: string;
  max: number;
  currency?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-5 space-y-3">
        {data.map((item) => {
          const value = Number(item[valueKey] ?? 0);
          return (
            <div key={String(item[labelKey])}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                  {String(item[labelKey])}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {currency ? formatCurrency(value) : value}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.max(8, (value / max) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        {!data.length && <EmptyState text="No chart data." />}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>;
}
