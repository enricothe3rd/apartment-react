import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import {
  expenses,
  leases,
  maintenanceRequests,
  notifications,
  payments,
  portfolioSummary,
  properties,
  tenants,
  units,
} from "../../data/property-management";

type ModulePageProps = {
  title: string;
  description: string;
  highlights: string[];
  checklist: string[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

const statusColor = (status: string) => {
  if (["paid", "occupied", "active", "completed", "success"].includes(status)) {
    return "success";
  }

  if (["pending", "reserved", "expiring_soon", "waiting"].includes(status)) {
    return "warning";
  }

  if (["overdue", "delinquent", "emergency"].includes(status)) {
    return "error";
  }

  if (["maintenance", "assigned", "in_progress"].includes(status)) {
    return "info";
  }

  return "light";
};

export default function ModulePage({
  title,
  description,
  highlights,
  checklist,
}: ModulePageProps) {
  const occupancy =
    portfolioSummary.totalUnits === 0
      ? 0
      : Math.round(
          (portfolioSummary.occupiedUnits / portfolioSummary.totalUnits) * 100
        );

  return (
    <>
      <PageMeta
        title={`${title} | Property Management Dashboard`}
        description={description}
      />
      <PageBreadcrumb pageTitle={title} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Planned Capability
              </p>
              <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                {item}
              </p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Portfolio Snapshot
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Revenue" value={formatCurrency(portfolioSummary.revenue)} />
              <Metric label="Occupancy" value={`${occupancy}%`} />
              <Metric label="Vacant Units" value={`${portfolioSummary.vacantUnits}`} />
              <Metric
                label="Outstanding Rent"
                value={formatCurrency(portfolioSummary.outstandingRent)}
              />
              <Metric
                label="Monthly Expenses"
                value={formatCurrency(portfolioSummary.monthlyExpenses)}
              />
              <Metric
                label="Open Maintenance"
                value={`${maintenanceRequests.filter((item) => item.status !== "completed").length}`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Milestone Checklist
            </h2>
            <div className="mt-4 space-y-3">
              {checklist.map((item) => (
                <label
                  key={item}
                  className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    disabled
                    className="mt-0.5 size-4 rounded border-gray-300 text-brand-500"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DataPanel title="Properties">
            {properties.map((property) => (
              <Row
                key={property.id}
                title={property.name}
                detail={`${property.city} - ${property.occupiedUnits}/${property.units} occupied`}
                status={property.status}
              />
            ))}
          </DataPanel>

          <DataPanel title="Units">
            {units.map((unit) => (
              <Row
                key={unit.id}
                title={unit.label}
                detail={`Building ${unit.building}, Floor ${unit.floor} - ${formatCurrency(unit.monthlyRent)}`}
                status={unit.status}
              />
            ))}
          </DataPanel>

          <DataPanel title="Tenants">
            {tenants.map((tenant) => (
              <Row
                key={tenant.id}
                title={tenant.name}
                detail={`${tenant.email} - Balance ${formatCurrency(tenant.balance)}`}
                status={tenant.leaseStatus}
              />
            ))}
          </DataPanel>

          <DataPanel title="Payments">
            {payments.map((payment) => (
              <Row
                key={payment.id}
                title={`${payment.id.toUpperCase()} - ${formatCurrency(payment.amount)}`}
                detail={`Due ${payment.dueDate}${payment.paidDate ? ` - Paid ${payment.paidDate}` : ""}`}
                status={payment.status}
              />
            ))}
          </DataPanel>

          <DataPanel title="Leases">
            {leases.map((lease) => (
              <Row
                key={lease.id}
                title={`${lease.id.toUpperCase()} - ${formatCurrency(lease.monthlyRent)}/mo`}
                detail={`${lease.startDate} to ${lease.endDate}`}
                status={lease.status}
              />
            ))}
          </DataPanel>

          <DataPanel title="Maintenance">
            {maintenanceRequests.map((request) => (
              <Row
                key={request.id}
                title={request.title}
                detail={`${request.assignedTo} - Opened ${request.openedAt}`}
                status={request.status}
              />
            ))}
          </DataPanel>

          <DataPanel title="Expenses">
            {expenses.map((expense) => (
              <Row
                key={expense.id}
                title={expense.description}
                detail={`${expense.category} - ${expense.expenseDate}`}
                status={formatCurrency(expense.amount)}
              />
            ))}
          </DataPanel>

          <DataPanel title="Notifications">
            {notifications.map((notification) => (
              <Row
                key={notification.id}
                title={notification.title}
                detail={notification.message}
                status={notification.read ? "read" : "unread"}
              />
            ))}
          </DataPanel>
        </section>
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
      <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function DataPanel({
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
      <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </div>
    </div>
  );
}

function Row({
  title,
  detail,
  status,
}: {
  title: string;
  detail: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
          {detail}
        </p>
      </div>
      <Badge color={statusColor(status)} size="sm">
        {status.replace(/_/g, " ")}
      </Badge>
    </div>
  );
}
