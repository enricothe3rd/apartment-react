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

type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";

type Payment = {
  id: string;
  tenantId: string;
  unitId: string;
  leaseId?: string | null;
  dueDate: string;
  paidDate?: string | null;
  amount: string;
  status: PaymentStatus;
  method?: string | null;
  tenant: { id: string; name: string; email: string };
  unit: {
    id: string;
    label: string;
    property?: { name: string };
  };
};

type TenantOption = { id: string; name: string };
type UnitOption = {
  id: string;
  label: string;
  monthlyRent: string;
  property?: { name: string };
};
type LeaseOption = {
  id: string;
  tenantId: string;
  unitId: string;
  monthlyRent: string;
  tenant: { name: string };
  unit: { label: string; property?: { name: string } };
};

type PaymentForm = {
  id: string;
  tenantId: string;
  unitId: string;
  leaseId: string;
  dueDate: string;
  paidDate: string;
  amount: string;
  status: PaymentStatus;
  method: string;
};

const emptyPaymentForm: PaymentForm = {
  id: "",
  tenantId: "",
  unitId: "",
  leaseId: "",
  dueDate: "2026-10-01",
  paidDate: "",
  amount: "0",
  status: "PENDING",
  method: "",
};

const statusColor = (status: string) => {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "OVERDUE") return "error";
  return "info";
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function Payments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
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

  async function loadPaymentsWorkspace(nextSelectedId?: string) {
    setIsLoading(true);
    setError("");

    try {
      const [paymentResponse, tenantResponse, unitResponse, leaseResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/payments`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/tenants`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/units`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/leases`, { headers: authHeaders }),
        ]);
      const [paymentData, tenantData, unitData, leaseData] = await Promise.all([
        paymentResponse.json(),
        tenantResponse.json(),
        unitResponse.json(),
        leaseResponse.json(),
      ]);

      if (!paymentResponse.ok) throw new Error(paymentData.message ?? "Unable to load payments");
      if (!tenantResponse.ok) throw new Error(tenantData.message ?? "Unable to load tenants");
      if (!unitResponse.ok) throw new Error(unitData.message ?? "Unable to load units");
      if (!leaseResponse.ok) throw new Error(leaseData.message ?? "Unable to load leases");

      setPayments(paymentData.payments);
      setTenants(tenantData.tenants);
      setUnits(unitData.units);
      setLeases(leaseData.leases);
      setSelectedPaymentId(nextSelectedId ?? paymentData.payments[0]?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payments");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadPaymentsWorkspace();
  }, [token]);

  const filteredPayments = payments.filter((payment) => {
    const normalizedSearch = search.toLowerCase();
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesSearch =
      payment.tenant.name.toLowerCase().includes(normalizedSearch) ||
      payment.tenant.email.toLowerCase().includes(normalizedSearch) ||
      payment.unit.label.toLowerCase().includes(normalizedSearch) ||
      payment.unit.property?.name.toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
  const selectedPayment =
    payments.find((payment) => payment.id === selectedPaymentId) ?? payments[0];
  const paidTotal = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const outstandingTotal = payments
    .filter((payment) => payment.status !== "PAID")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const overdueTotal = payments
    .filter((payment) => payment.status === "OVERDUE")
    .reduce((total, payment) => total + Number(payment.amount), 0);

  function startCreatePayment() {
    setPaymentForm(emptyPaymentForm);
    setMessage("");
    setError("");
  }

  function startEditPayment(payment: Payment) {
    setPaymentForm({
      id: payment.id,
      tenantId: payment.tenantId,
      unitId: payment.unitId,
      leaseId: payment.leaseId ?? "",
      dueDate: payment.dueDate.slice(0, 10),
      paidDate: payment.paidDate?.slice(0, 10) ?? "",
      amount: String(payment.amount),
      status: payment.status,
      method: payment.method ?? "",
    });
    setSelectedPaymentId(payment.id);
    setMessage("");
    setError("");
  }

  function applyLeaseSelection(leaseId: string) {
    const lease = leases.find((item) => item.id === leaseId);
    setPaymentForm((form) => ({
      ...form,
      leaseId,
      tenantId: lease?.tenantId ?? form.tenantId,
      unitId: lease?.unitId ?? form.unitId,
      amount: lease?.monthlyRent ?? form.amount,
    }));
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/payments${paymentForm.id ? `/${paymentForm.id}` : ""}`,
        {
          method: paymentForm.id ? "PUT" : "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: paymentForm.tenantId,
            unitId: paymentForm.unitId,
            leaseId: paymentForm.leaseId || null,
            dueDate: paymentForm.dueDate,
            paidDate: paymentForm.paidDate || null,
            amount: Number(paymentForm.amount),
            status: paymentForm.status,
            method: paymentForm.method || null,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.message ?? "Unable to save payment");

      setPaymentForm(emptyPaymentForm);
      setMessage(paymentForm.id ? "Payment updated." : "Payment recorded.");
      await loadPaymentsWorkspace(data.payment.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function voidPayment(payment: Payment) {
    const confirmed = window.confirm(
      `Void and archive ${formatCurrency(payment.amount)} for ${payment.tenant.name}?`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/payments/${payment.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to void payment");
      }

      setPaymentForm(emptyPaymentForm);
      setMessage("Payment voided and archived.");
      await loadPaymentsWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to void payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function generateRentCharges() {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/payments/generate-rent-charges`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: paymentForm.dueDate }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message ?? "Unable to generate rent charges");

      setMessage(`${data.payments.length} rent charge(s) ready.`);
      await loadPaymentsWorkspace(data.payments[0]?.id);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to generate rent charges"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Payments | Property Management Dashboard"
        description="Track rent collection, overdue balances, payment details, and receipts."
      />
      <PageBreadcrumb pageTitle="Payments" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Payments And Receipts
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Record rent, track overdue balances, void entries, and print receipts from live PostgreSQL data.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search payments"
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>
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
            Loading payments...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label="Collected" value={formatCurrency(paidTotal)} />
              <Metric label="Outstanding" value={formatCurrency(outstandingTotal)} />
              <Metric label="Overdue" value={formatCurrency(overdueTotal)} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Payment List
                  </h2>
                  <button
                    type="button"
                    onClick={startCreatePayment}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                  >
                    New payment
                  </button>
                </div>

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
                            Due
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Amount
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
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <TableCell className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => setSelectedPaymentId(payment.id)}
                                className="text-left"
                              >
                                <span className="block text-sm font-medium text-gray-900 hover:text-brand-500 dark:text-white">
                                  {payment.tenant.name}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                  {payment.tenant.email}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {payment.unit.property?.name ?? "-"} / {payment.unit.label}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {payment.dueDate.slice(0, 10)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm">
                              <Badge color={statusColor(payment.status)} size="sm">
                                {payment.status.toLowerCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditPayment(payment)}
                                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void voidPayment(payment)}
                                  className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                                >
                                  Void
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
                <form
                  onSubmit={savePayment}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {paymentForm.id ? "Edit Payment" : "Record Payment"}
                    </h2>
                    {paymentForm.id && (
                      <button
                        type="button"
                        onClick={startCreatePayment}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="mt-5 space-y-4">
                    <Field label="Lease">
                      <select
                        value={paymentForm.leaseId}
                        onChange={(event) => applyLeaseSelection(event.target.value)}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">No lease selected</option>
                        {leases.map((lease) => (
                          <option key={lease.id} value={lease.id}>
                            {lease.tenant.name} / {lease.unit.property?.name ?? "Property"} / {lease.unit.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tenant">
                      <select
                        required
                        value={paymentForm.tenantId}
                        onChange={(event) =>
                          setPaymentForm((form) => ({ ...form, tenantId: event.target.value }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">Select tenant</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Unit">
                      <select
                        required
                        value={paymentForm.unitId}
                        onChange={(event) => {
                          const unit = units.find((item) => item.id === event.target.value);
                          setPaymentForm((form) => ({
                            ...form,
                            unitId: event.target.value,
                            amount: unit?.monthlyRent ?? form.amount,
                          }));
                        }}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">Select unit</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.property?.name ?? "Property"} / {unit.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Due Date">
                        <Input
                          type="date"
                          value={paymentForm.dueDate}
                          onChange={(value) =>
                            setPaymentForm((form) => ({ ...form, dueDate: value }))
                          }
                        />
                      </Field>
                      <Field label="Paid Date">
                        <Input
                          type="date"
                          value={paymentForm.paidDate}
                          required={false}
                          onChange={(value) =>
                            setPaymentForm((form) => ({ ...form, paidDate: value }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount">
                        <Input
                          type="number"
                          value={paymentForm.amount}
                          onChange={(value) =>
                            setPaymentForm((form) => ({ ...form, amount: value }))
                          }
                        />
                      </Field>
                      <Field label="Status">
                        <select
                          value={paymentForm.status}
                          onChange={(event) =>
                            setPaymentForm((form) => ({
                              ...form,
                              status: event.target.value as PaymentStatus,
                              paidDate:
                                event.target.value === "PAID" && !form.paidDate
                                  ? new Date().toISOString().slice(0, 10)
                                  : form.paidDate,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PAID">Paid</option>
                          <option value="OVERDUE">Overdue</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Method">
                      <input
                        value={paymentForm.method}
                        onChange={(event) =>
                          setPaymentForm((form) => ({ ...form, method: event.target.value }))
                        }
                        placeholder="cash, bank transfer, gcash"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </Field>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        disabled={isSubmitting}
                        className="flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? "Saving..." : paymentForm.id ? "Save changes" : "Save payment"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void generateRentCharges()}
                        className="flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Generate rent
                      </button>
                    </div>
                  </div>
                </form>

                {selectedPayment && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          Payment Detail
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Receipt PM-{selectedPayment.id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <Badge color={statusColor(selectedPayment.status)} size="sm">
                        {selectedPayment.status.toLowerCase()}
                      </Badge>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Metric label="Amount" value={formatCurrency(selectedPayment.amount)} />
                      <Metric label="Due" value={selectedPayment.dueDate.slice(0, 10)} />
                      <Metric
                        label="Paid"
                        value={selectedPayment.paidDate?.slice(0, 10) ?? "-"}
                      />
                      <Metric label="Method" value={selectedPayment.method ?? "-"} />
                    </div>

                    <div className="mt-5 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <p className="text-xs uppercase text-gray-500">Receipt</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            PM-{selectedPayment.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                        <ReceiptRow label="Tenant" value={selectedPayment.tenant.name} />
                        <ReceiptRow
                          label="Unit"
                          value={`${selectedPayment.unit.property?.name ?? "Property"} / ${selectedPayment.unit.label}`}
                        />
                        <ReceiptRow label="Amount" value={formatCurrency(selectedPayment.amount)} />
                        <ReceiptRow label="Due Date" value={selectedPayment.dueDate.slice(0, 10)} />
                        <ReceiptRow
                          label="Paid Date"
                          value={selectedPayment.paidDate?.slice(0, 10) ?? "-"}
                        />
                        <ReceiptRow label="Status" value={selectedPayment.status.toLowerCase()} />
                        <ReceiptRow label="Method" value={selectedPayment.method ?? "-"} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditPayment(selectedPayment)}
                        className="flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
                      >
                        Print
                      </button>
                    </div>
                  </div>
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
  required = true,
}: {
  type: "date" | "number";
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <input
      required={required}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}
