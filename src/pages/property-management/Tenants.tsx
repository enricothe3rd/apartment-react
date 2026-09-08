import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type TenantLease = {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "RENEWED" | "TERMINATED";
};

type TenantPayment = {
  id: string;
  dueDate: string;
  paidDate?: string;
  amount: string;
  status: "PAID" | "PENDING" | "OVERDUE";
  method?: string;
};

type MaintenanceItem = {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  status: string;
};

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit?: {
    id: string;
    label: string;
    property?: { name: string };
    building?: { name: string };
    floor?: { level: number };
    maintenanceRequests: MaintenanceItem[];
  };
  leases: TenantLease[];
  payments: TenantPayment[];
};

type UnitOption = {
  id: string;
  label: string;
  property?: { name: string };
  building?: { name: string };
  floor?: { level: number };
};

type TenantForm = {
  id: string;
  name: string;
  email: string;
  phone: string;
  unitId: string;
};

type SortKey = "name" | "balance" | "lastPaymentDate";
type ProfileTab = "overview" | "lease" | "payments" | "maintenance" | "documents";

const emptyTenantForm: TenantForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  unitId: "",
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));

const statusColor = (status: string) => {
  if (["ACTIVE", "PAID", "COMPLETED"].includes(status)) {
    return "success";
  }

  if (["PENDING", "EXPIRING_SOON", "WAITING", "MEDIUM"].includes(status)) {
    return "warning";
  }

  if (["OVERDUE", "TERMINATED", "EMERGENCY", "HIGH"].includes(status)) {
    return "error";
  }

  return "info";
};

function getTenantBalance(tenant: Tenant) {
  return tenant.payments
    .filter((payment) => payment.status !== "PAID")
    .reduce((total, payment) => total + Number(payment.amount), 0);
}

function getLastPaymentDate(tenant: Tenant) {
  return (
    tenant.payments.find((payment) => payment.status === "PAID")?.paidDate ??
    "No payments"
  );
}

export default function Tenants() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [tenantForm, setTenantForm] = useState<TenantForm>(emptyTenantForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadTenants() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/tenants`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Unable to load tenants");
        }

        setTenants(data.tenants);
        setSelectedTenantId((current) => current || data.tenants[0]?.id || "");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load tenants"
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      void loadTenants();
    }
  }, [token]);

  useEffect(() => {
    async function loadUnits() {
      try {
        const response = await fetch(`${API_BASE_URL}/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Unable to load units");
        }

        setUnits(data.units);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load units");
      }
    }

    if (token) {
      void loadUnits();
    }
  }, [token]);

  const filteredTenants = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return tenants
      .filter((tenant) => {
        const activeLease = tenant.leases[0];
        const matchesSearch =
          tenant.name.toLowerCase().includes(normalizedSearch) ||
          tenant.email.toLowerCase().includes(normalizedSearch) ||
          tenant.phone.toLowerCase().includes(normalizedSearch) ||
          tenant.unit?.label.toLowerCase().includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "all" || activeLease?.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortKey === "balance") {
          return getTenantBalance(b) - getTenantBalance(a);
        }

        if (sortKey === "lastPaymentDate") {
          return getLastPaymentDate(b).localeCompare(getLastPaymentDate(a));
        }

        return a.name.localeCompare(b.name);
      });
  }, [search, sortKey, statusFilter, tenants]);

  const selectedTenant =
    tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0];
  const activeLease = selectedTenant?.leases[0];
  const balance = selectedTenant ? getTenantBalance(selectedTenant) : 0;
  const paidCount = selectedTenant?.payments.filter(
    (payment) => payment.status === "PAID"
  ).length;

  async function refreshTenants(nextSelectedId?: string) {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load tenants");
    }

    setTenants(data.tenants);
    setSelectedTenantId(nextSelectedId ?? data.tenants[0]?.id ?? "");
  }

  function startCreateTenant() {
    setTenantForm(emptyTenantForm);
    setSuccess("");
    setError("");
  }

  function startEditTenant(tenant: Tenant) {
    setTenantForm({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      unitId: tenant.unit?.id ?? "",
    });
    setSelectedTenantId(tenant.id);
    setSuccess("");
    setError("");
  }

  async function saveTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/tenants${tenantForm.id ? `/${tenantForm.id}` : ""}`,
        {
          method: tenantForm.id ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: tenantForm.name,
            email: tenantForm.email,
            phone: tenantForm.phone,
            unitId: tenantForm.unitId || null,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save tenant");
      }

      setTenantForm(emptyTenantForm);
      setSuccess("Tenant saved.");
      await refreshTenants(data.tenant.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save tenant");
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveTenant(tenant: Tenant) {
    const confirmed = window.confirm(`Archive ${tenant.name}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/tenants/${tenant.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to archive tenant");
      }

      setTenantForm(emptyTenantForm);
      setSuccess("Tenant archived.");
      await refreshTenants();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Unable to archive tenant"
      );
    }
  }

  return (
    <>
      <PageMeta
        title="Tenants | Property Management Dashboard"
        description="Search tenants, review profiles, and inspect lease and payment history."
      />
      <PageBreadcrumb pageTitle="Tenants" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Tenant Directory
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Search tenants, open profiles, and review lease and payment history from PostgreSQL.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tenant"
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All leases</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRING_SOON">Expiring soon</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="name">Sort by name</option>
                <option value="balance">Sort by balance</option>
                <option value="lastPaymentDate">Sort by last payment</option>
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            {success}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Loading tenant directory...
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Tenants
                </h2>
                <button
                  type="button"
                  onClick={startCreateTenant}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                >
                  New tenant
                </button>
              </div>

              <form
                onSubmit={saveTenant}
                className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-2"
              >
                <input
                  value={tenantForm.name}
                  onChange={(event) =>
                    setTenantForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Tenant name"
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  required
                />
                <input
                  value={tenantForm.email}
                  onChange={(event) =>
                    setTenantForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Email"
                  type="email"
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  required
                />
                <input
                  value={tenantForm.phone}
                  onChange={(event) =>
                    setTenantForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="Phone"
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  required
                />
                <select
                  value={tenantForm.unitId}
                  onChange={(event) =>
                    setTenantForm((current) => ({ ...current, unitId: event.target.value }))
                  }
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Unassigned</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.property?.name ?? "Property"} / {unit.building?.name ?? "Building"} / Floor{" "}
                      {unit.floor?.level ?? "-"} / {unit.label}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : tenantForm.id ? "Save changes" : "Create tenant"}
                  </button>
                  {tenantForm.id && (
                    <button
                      type="button"
                      onClick={startCreateTenant}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                      <TableRow>
                        <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                          Tenant
                        </TableCell>
                        <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                          Unit
                        </TableCell>
                        <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                          Lease
                        </TableCell>
                        <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                          Balance
                        </TableCell>
                        <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredTenants.map((tenant) => (
                        <TableRow
                          key={tenant.id}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        >
                          <TableCell className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTenantId(tenant.id);
                                setActiveTab("overview");
                              }}
                              className="text-left"
                            >
                              <span className="block text-sm font-medium text-gray-900 hover:text-brand-500 dark:text-white">
                                {tenant.name}
                              </span>
                              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                {tenant.email}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {tenant.unit?.property?.name ?? "-"} / {tenant.unit?.label ?? "-"}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm">
                            <Badge color={statusColor(tenant.leases[0]?.status ?? "")} size="sm">
                              {(tenant.leases[0]?.status ?? "none").toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(getTenantBalance(tenant))}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEditTenant(tenant)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void archiveTenant(tenant)}
                                className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                              >
                                Archive
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!filteredTenants.length && (
                        <TableRow>
                          <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
                            No tenants found.
                          </TableCell>
                          <TableCell className="px-5 py-6"> </TableCell>
                          <TableCell className="px-5 py-6"> </TableCell>
                          <TableCell className="px-5 py-6"> </TableCell>
                          <TableCell className="px-5 py-6"> </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-2">
              {selectedTenant ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedTenant.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {selectedTenant.phone}
                      </p>
                    </div>
                    <Badge color={statusColor(activeLease?.status ?? "")} size="sm">
                      {(activeLease?.status ?? "no lease").toLowerCase()}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditTenant(selectedTenant)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      Edit profile
                    </button>
                    <button
                      type="button"
                      onClick={() => void archiveTenant(selectedTenant)}
                      className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                    >
                      Archive
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Metric label="Balance" value={formatCurrency(balance)} />
                    <Metric label="Paid Items" value={String(paidCount ?? 0)} />
                    <Metric
                      label="Unit"
                      value={selectedTenant.unit?.label ?? "Unassigned"}
                    />
                    <Metric
                      label="Last Payment"
                      value={getLastPaymentDate(selectedTenant)}
                    />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    {(["overview", "lease", "payments", "maintenance", "documents"] as ProfileTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${
                          activeTab === tab
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                            : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5">
                    {activeTab === "overview" && (
                      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <p>{selectedTenant.email}</p>
                        <p>
                          {selectedTenant.unit?.property?.name ?? "No property"} /{" "}
                          {selectedTenant.unit?.building?.name ?? "-"} / Floor{" "}
                          {selectedTenant.unit?.floor?.level ?? "-"}
                        </p>
                      </div>
                    )}
                    {activeTab === "lease" && (
                      <Stack>
                        {selectedTenant.leases.map((lease) => (
                          <HistoryRow
                            key={lease.id}
                            title={`${formatCurrency(lease.monthlyRent)}/mo`}
                            detail={`${lease.startDate.slice(0, 10)} to ${lease.endDate.slice(0, 10)}`}
                            status={lease.status}
                          />
                        ))}
                      </Stack>
                    )}
                    {activeTab === "payments" && (
                      <Stack>
                        {selectedTenant.payments.map((payment) => (
                          <HistoryRow
                            key={payment.id}
                            title={formatCurrency(payment.amount)}
                            detail={`Due ${payment.dueDate.slice(0, 10)}${payment.paidDate ? ` / Paid ${payment.paidDate.slice(0, 10)}` : ""}`}
                            status={payment.status}
                          />
                        ))}
                      </Stack>
                    )}
                    {activeTab === "maintenance" && (
                      <Stack>
                        {(selectedTenant.unit?.maintenanceRequests ?? []).map((item) => (
                          <HistoryRow
                            key={item.id}
                            title={item.title}
                            detail={item.status.toLowerCase()}
                            status={item.priority}
                          />
                        ))}
                      </Stack>
                    )}
                    {activeTab === "documents" && (
                      <div className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        Tenant document storage is ready for a later file upload milestone.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a tenant to view the profile.
                </p>
              )}
            </aside>
          </section>
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

function Stack({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-gray-100 dark:divide-gray-800">{children}</div>;
}

function HistoryRow({
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
        {status.toLowerCase()}
      </Badge>
    </div>
  );
}
