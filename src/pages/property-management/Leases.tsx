import { FormEvent, useEffect, useMemo, useState } from "react";
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

type LeaseStatus =
  | "DRAFT"
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "RENEWED"
  | "TERMINATED";

type Lease = {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
  status: LeaseStatus;
  tenant: { id: string; name: string; email: string };
  unit: {
    id: string;
    label: string;
    status: string;
    property?: { name: string };
    building?: { name: string };
    floor?: { level: number };
  };
};

type TenantOption = {
  id: string;
  name: string;
  leases: { status: LeaseStatus }[];
};

type UnitOption = {
  id: string;
  label: string;
  status: "OCCUPIED" | "VACANT" | "RESERVED" | "MAINTENANCE" | "DELINQUENT";
  monthlyRent: string;
  property?: { name: string };
};

type LeaseForm = {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
  status: LeaseStatus;
};

const defaultLeaseForm: LeaseForm = {
  id: "",
  tenantId: "",
  unitId: "",
  startDate: "2026-10-01",
  endDate: "2027-09-30",
  monthlyRent: "19500",
  deposit: "39000",
  status: "ACTIVE",
};

const statusColor = (status: string) => {
  if (["ACTIVE", "RENEWED"].includes(status)) {
    return "success";
  }

  if (["EXPIRING_SOON", "DRAFT"].includes(status)) {
    return "warning";
  }

  if (["EXPIRED", "TERMINATED"].includes(status)) {
    return "error";
  }

  return "info";
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function Leases() {
  const { token } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [leaseForm, setLeaseForm] = useState<LeaseForm>(defaultLeaseForm);
  const [renewForm, setRenewForm] = useState({
    startDate: "2027-10-01",
    endDate: "2028-09-30",
    monthlyRent: "25500",
    deposit: "51000",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  async function loadLeaseWorkspace() {
    setIsLoading(true);
    setError("");

    try {
      const [leaseResponse, tenantResponse, unitResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/leases`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/tenants`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/units`, { headers: authHeaders }),
      ]);
      const [leaseData, tenantData, unitData] = await Promise.all([
        leaseResponse.json(),
        tenantResponse.json(),
        unitResponse.json(),
      ]);

      if (!leaseResponse.ok) {
        throw new Error(leaseData.message ?? "Unable to load leases");
      }

      if (!tenantResponse.ok) {
        throw new Error(tenantData.message ?? "Unable to load tenants");
      }

      if (!unitResponse.ok) {
        throw new Error(unitData.message ?? "Unable to load units");
      }

      setLeases(leaseData.leases);
      setTenants(tenantData.tenants);
      setUnits(unitData.units);
      setSelectedLeaseId(leaseData.leases[0]?.id ?? "");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load leases"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      void loadLeaseWorkspace();
    }
  }, [token]);

  const filteredLeases = leases.filter(
    (lease) => statusFilter === "all" || lease.status === statusFilter
  );
  const selectedLease =
    leases.find((lease) => lease.id === selectedLeaseId) ?? leases[0];
  const selectedTenantHistory = selectedLease
    ? leases.filter((lease) => lease.tenantId === selectedLease.tenantId)
    : [];
  const availableUnits = units.filter((unit) =>
    ["VACANT", "RESERVED"].includes(unit.status) || unit.id === leaseForm.unitId
  );
  const availableTenants = tenants.filter(
    (tenant) =>
      tenant.id === leaseForm.tenantId ||
      !tenant.leases.some((lease) =>
        ["ACTIVE", "EXPIRING_SOON"].includes(lease.status)
      )
  );
  const expiringCount = leases.filter(
    (lease) => lease.status === "EXPIRING_SOON"
  ).length;

  function startCreateLease() {
    setLeaseForm(defaultLeaseForm);
    setMessage("");
    setError("");
  }

  function startEditLease(lease: Lease) {
    setLeaseForm({
      id: lease.id,
      tenantId: lease.tenantId,
      unitId: lease.unitId,
      startDate: lease.startDate.slice(0, 10),
      endDate: lease.endDate.slice(0, 10),
      monthlyRent: String(lease.monthlyRent),
      deposit: String(lease.deposit),
      status: lease.status,
    });
    setSelectedLeaseId(lease.id);
    setMessage("");
    setError("");
  }

  const handleSaveLease = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/leases${leaseForm.id ? `/${leaseForm.id}` : ""}`,
        {
          method: leaseForm.id ? "PUT" : "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenantId: leaseForm.tenantId,
            unitId: leaseForm.unitId,
            startDate: leaseForm.startDate,
            endDate: leaseForm.endDate,
            monthlyRent: Number(leaseForm.monthlyRent),
            deposit: Number(leaseForm.deposit),
            status: leaseForm.status,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save lease");
      }

      setLeaseForm(defaultLeaseForm);
      setMessage(leaseForm.id ? "Lease updated successfully." : "Lease created successfully.");
      await loadLeaseWorkspace();
      setSelectedLeaseId(data.lease.id);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save lease"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerminateLease = async (lease: Lease) => {
    const confirmed = window.confirm(
      `Terminate and archive ${lease.tenant.name}'s lease for ${lease.unit.label}?`
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/leases/${lease.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to terminate lease");
      }

      setLeaseForm(defaultLeaseForm);
      setMessage("Lease terminated and archived.");
      await loadLeaseWorkspace();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to terminate lease"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewLease = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedLease) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/leases/${selectedLease.id}/renew`,
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: renewForm.startDate,
            endDate: renewForm.endDate,
            monthlyRent: Number(renewForm.monthlyRent),
            deposit: Number(renewForm.deposit),
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to renew lease");
      }

      setMessage("Lease renewed successfully.");
      await loadLeaseWorkspace();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to renew lease"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Leases | Property Management Dashboard"
        description="Create leases, renew agreements, track expirations, and keep lease history."
      />
      <PageBreadcrumb pageTitle="Leases" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Lease Management
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Create, renew, and track rental agreements with live PostgreSQL data.
              </p>
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_SOON">Expiring soon</option>
              <option value="RENEWED">Renewed</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </section>

        {message && (
          <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
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
            Loading leases...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label="Total Leases" value={String(leases.length)} />
              <Metric label="Expiring Soon" value={String(expiringCount)} />
              <Metric
                label="Available Units"
                value={String(availableUnits.length)}
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Lease List
                </h2>
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
                            Dates
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Rent
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Status
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredLeases.map((lease) => (
                          <TableRow
                            key={lease.id}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                          >
                            <TableCell className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => setSelectedLeaseId(lease.id)}
                                className="text-left"
                              >
                                <span className="block text-sm font-medium text-gray-900 hover:text-brand-500 dark:text-white">
                                  {lease.tenant.name}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                  {lease.tenant.email}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {lease.unit.property?.name ?? "-"} / {lease.unit.label}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {lease.startDate.slice(0, 10)} to {lease.endDate.slice(0, 10)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(lease.monthlyRent)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm">
                              <Badge color={statusColor(lease.status)} size="sm">
                                {lease.status.toLowerCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditLease(lease)}
                                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleTerminateLease(lease)}
                                  className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                                >
                                  Terminate
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <aside className="space-y-6 xl:col-span-2">
                {selectedLease && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          Selected Lease
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {selectedLease.tenant.name} / {selectedLease.unit.label}
                        </p>
                      </div>
                      <Badge color={statusColor(selectedLease.status)} size="sm">
                        {selectedLease.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Metric
                        label="Rent"
                        value={formatCurrency(selectedLease.monthlyRent)}
                      />
                      <Metric
                        label="Deposit"
                        value={formatCurrency(selectedLease.deposit)}
                      />
                      <Metric
                        label="Start"
                        value={selectedLease.startDate.slice(0, 10)}
                      />
                      <Metric
                        label="End"
                        value={selectedLease.endDate.slice(0, 10)}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditLease(selectedLease)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Edit lease
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleTerminateLease(selectedLease)}
                        className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                      >
                        Terminate
                      </button>
                    </div>
                    <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Lease History
                      </p>
                      <div className="mt-3 space-y-3">
                        {selectedTenantHistory.map((lease) => (
                          <div
                            key={lease.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {lease.startDate.slice(0, 10)} to {lease.endDate.slice(0, 10)}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {formatCurrency(lease.monthlyRent)}/mo
                              </p>
                            </div>
                            <Badge color={statusColor(lease.status)} size="sm">
                              {lease.status.toLowerCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleSaveLease}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {leaseForm.id ? "Edit Lease" : "Create Lease"}
                    </h2>
                    {leaseForm.id && (
                      <button
                        type="button"
                        onClick={startCreateLease}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="mt-5 space-y-4">
                    <Field label="Tenant">
                      <select
                        required
                        value={leaseForm.tenantId}
                        onChange={(event) =>
                          setLeaseForm((form) => ({
                            ...form,
                            tenantId: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">Select tenant</option>
                        {availableTenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Unit">
                      <select
                        required
                        value={leaseForm.unitId}
                        onChange={(event) => {
                          const unit = units.find(
                            (item) => item.id === event.target.value
                          );
                          setLeaseForm((form) => ({
                            ...form,
                            unitId: event.target.value,
                            monthlyRent: unit?.monthlyRent ?? form.monthlyRent,
                          }));
                        }}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">Select unit</option>
                        {availableUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.property?.name ?? "Property"} / {unit.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start">
                        <Input
                          type="date"
                          value={leaseForm.startDate}
                          onChange={(value) =>
                            setLeaseForm((form) => ({ ...form, startDate: value }))
                          }
                        />
                      </Field>
                      <Field label="End">
                        <Input
                          type="date"
                          value={leaseForm.endDate}
                          onChange={(value) =>
                            setLeaseForm((form) => ({ ...form, endDate: value }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Rent">
                        <Input
                          type="number"
                          value={leaseForm.monthlyRent}
                          onChange={(value) =>
                            setLeaseForm((form) => ({
                              ...form,
                              monthlyRent: value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Deposit">
                        <Input
                          type="number"
                          value={leaseForm.deposit}
                          onChange={(value) =>
                            setLeaseForm((form) => ({ ...form, deposit: value }))
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Status">
                      <select
                        value={leaseForm.status}
                        onChange={(event) =>
                          setLeaseForm((form) => ({
                            ...form,
                            status: event.target.value as LeaseStatus,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="EXPIRING_SOON">Expiring soon</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="TERMINATED">Terminated</option>
                      </select>
                    </Field>
                    <button
                      disabled={isSubmitting}
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "Saving..." : leaseForm.id ? "Save changes" : "Create lease"}
                    </button>
                  </div>
                </form>

                {selectedLease && (
                  <form
                    onSubmit={handleRenewLease}
                    className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
                  >
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Renew Lease
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {selectedLease.tenant.name} / {selectedLease.unit.label}
                    </p>
                    <div className="mt-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="New Start">
                          <Input
                            type="date"
                            value={renewForm.startDate}
                            onChange={(value) =>
                              setRenewForm((form) => ({
                                ...form,
                                startDate: value,
                              }))
                            }
                          />
                        </Field>
                        <Field label="New End">
                          <Input
                            type="date"
                            value={renewForm.endDate}
                            onChange={(value) =>
                              setRenewForm((form) => ({ ...form, endDate: value }))
                            }
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Rent">
                          <Input
                            type="number"
                            value={renewForm.monthlyRent}
                            onChange={(value) =>
                              setRenewForm((form) => ({
                                ...form,
                                monthlyRent: value,
                              }))
                            }
                          />
                        </Field>
                        <Field label="Deposit">
                          <Input
                            type="number"
                            value={renewForm.deposit}
                            onChange={(value) =>
                              setRenewForm((form) => ({
                                ...form,
                                deposit: value,
                              }))
                            }
                          />
                        </Field>
                      </div>
                      <button
                        disabled={isSubmitting}
                        className="flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        {isSubmitting ? "Renewing..." : "Renew selected lease"}
                      </button>
                    </div>
                  </form>
                )}
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  type,
  value,
  onChange,
}: {
  type: "date" | "number";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      required
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  );
}
