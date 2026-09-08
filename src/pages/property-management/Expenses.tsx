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

type Expense = {
  id: string;
  propertyId: string;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
  property: { id: string; name: string; city: string };
};

type PropertyOption = {
  id: string;
  name: string;
  city: string;
};

type ExpenseForm = {
  id: string;
  propertyId: string;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
};

const emptyExpenseForm: ExpenseForm = {
  id: "",
  propertyId: "",
  category: "Repairs",
  description: "",
  amount: "0",
  expenseDate: "2026-09-08",
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function Expenses() {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState("");
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

  async function loadExpensesWorkspace(nextSelectedId?: string) {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (propertyFilter !== "all") params.set("propertyId", propertyFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const [expenseResponse, propertyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/expenses?${params.toString()}`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE_URL}/properties`, { headers: authHeaders }),
      ]);
      const [expenseData, propertyData] = await Promise.all([
        expenseResponse.json(),
        propertyResponse.json(),
      ]);

      if (!expenseResponse.ok) {
        throw new Error(expenseData.message ?? "Unable to load expenses");
      }

      if (!propertyResponse.ok) {
        throw new Error(propertyData.message ?? "Unable to load properties");
      }

      setExpenses(expenseData.expenses);
      setProperties(propertyData.properties);
      setSelectedExpenseId(nextSelectedId ?? expenseData.expenses[0]?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load expenses");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadExpensesWorkspace();
  }, [token, propertyFilter, categoryFilter, startDate, endDate]);

  const categories = useMemo(
    () => Array.from(new Set(["Repairs", "Utilities", "Security", "Cleaning", "Supplies", ...expenses.map((expense) => expense.category)])).sort(),
    [expenses]
  );
  const selectedExpense =
    expenses.find((expense) => expense.id === selectedExpenseId) ?? expenses[0];
  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0
  );
  const monthlyTotals = expenses.reduce<Record<string, number>>((totals, expense) => {
    const month = expense.expenseDate.slice(0, 7);
    totals[month] = (totals[month] ?? 0) + Number(expense.amount);
    return totals;
  }, {});
  const categoryTotals = expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category] = (totals[expense.category] ?? 0) + Number(expense.amount);
    return totals;
  }, {});
  const propertyTotals = expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.property.name] =
      (totals[expense.property.name] ?? 0) + Number(expense.amount);
    return totals;
  }, {});
  const maxChartValue = Math.max(
    1,
    ...Object.values(monthlyTotals),
    ...Object.values(categoryTotals),
    ...Object.values(propertyTotals)
  );

  function startCreateExpense() {
    setExpenseForm(emptyExpenseForm);
    setMessage("");
    setError("");
  }

  function startEditExpense(expense: Expense) {
    setExpenseForm({
      id: expense.id,
      propertyId: expense.propertyId,
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate.slice(0, 10),
    });
    setSelectedExpenseId(expense.id);
    setMessage("");
    setError("");
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/expenses${expenseForm.id ? `/${expenseForm.id}` : ""}`,
        {
          method: expenseForm.id ? "PUT" : "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: expenseForm.propertyId,
            category: expenseForm.category,
            description: expenseForm.description,
            amount: Number(expenseForm.amount),
            expenseDate: expenseForm.expenseDate,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save expense");
      }

      setExpenseForm(emptyExpenseForm);
      setMessage(expenseForm.id ? "Expense updated." : "Expense recorded.");
      await loadExpensesWorkspace(data.expense.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save expense");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function archiveExpense(expense: Expense) {
    const confirmed = window.confirm(`Archive expense "${expense.description}"?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expense.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to archive expense");
      }

      setExpenseForm(emptyExpenseForm);
      setMessage("Expense archived.");
      await loadExpensesWorkspace();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to archive expense"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Expenses | Property Management Dashboard"
        description="Track operating expenses by property, category, and month."
      />
      <PageBreadcrumb pageTitle="Expenses" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Expenses
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Track costs by property, category, and date with live PostgreSQL totals.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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
            Loading expenses...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label="Filtered Total" value={formatCurrency(totalExpenses)} />
              <Metric label="Expense Count" value={String(expenses.length)} />
              <Metric label="Categories" value={String(Object.keys(categoryTotals).length)} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="space-y-6 xl:col-span-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Expense List
                    </h2>
                    <button
                      type="button"
                      onClick={startCreateExpense}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                    >
                      New expense
                    </button>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="max-w-full overflow-x-auto">
                      <Table>
                        <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                          <TableRow>
                            <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                              Property
                            </TableCell>
                            <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                              Category
                            </TableCell>
                            <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                              Date
                            </TableCell>
                            <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                              Amount
                            </TableCell>
                            <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {expenses.map((expense) => (
                            <TableRow key={expense.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                              <TableCell className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedExpenseId(expense.id)}
                                  className="text-left"
                                >
                                  <span className="block text-sm font-medium text-gray-900 hover:text-brand-500 dark:text-white">
                                    {expense.property.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                    {expense.description}
                                  </span>
                                </button>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-sm">
                                <Badge color="info" size="sm">
                                  {expense.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {expense.expenseDate.slice(0, 10)}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(expense.amount)}
                              </TableCell>
                              <TableCell className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEditExpense(expense)}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void archiveExpense(expense)}
                                    className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                                  >
                                    Archive
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

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Chart title="Monthly Expenses" data={monthlyTotals} max={maxChartValue} />
                  <Chart title="Category Breakdown" data={categoryTotals} max={maxChartValue} />
                </div>
              </div>

              <aside className="space-y-6 xl:col-span-2">
                <form
                  onSubmit={saveExpense}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {expenseForm.id ? "Edit Expense" : "Record Expense"}
                    </h2>
                    {expenseForm.id && (
                      <button
                        type="button"
                        onClick={startCreateExpense}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="mt-5 space-y-4">
                    <Field label="Property">
                      <select
                        required
                        value={expenseForm.propertyId}
                        onChange={(event) =>
                          setExpenseForm((form) => ({
                            ...form,
                            propertyId: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">Select property</option>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Category">
                      <input
                        required
                        list="expense-categories"
                        value={expenseForm.category}
                        onChange={(event) =>
                          setExpenseForm((form) => ({
                            ...form,
                            category: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                      <datalist id="expense-categories">
                        {categories.map((category) => (
                          <option key={category} value={category} />
                        ))}
                      </datalist>
                    </Field>
                    <Field label="Description">
                      <input
                        required
                        value={expenseForm.description}
                        onChange={(event) =>
                          setExpenseForm((form) => ({
                            ...form,
                            description: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount">
                        <input
                          required
                          type="number"
                          value={expenseForm.amount}
                          onChange={(event) =>
                            setExpenseForm((form) => ({
                              ...form,
                              amount: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </Field>
                      <Field label="Date">
                        <input
                          required
                          type="date"
                          value={expenseForm.expenseDate}
                          onChange={(event) =>
                            setExpenseForm((form) => ({
                              ...form,
                              expenseDate: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </Field>
                    </div>
                    <button
                      disabled={isSubmitting}
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "Saving..." : expenseForm.id ? "Save changes" : "Save expense"}
                    </button>
                  </div>
                </form>

                {selectedExpense && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          Expense Detail
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {selectedExpense.description}
                        </p>
                      </div>
                      <Badge color="info" size="sm">
                        {selectedExpense.category}
                      </Badge>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Metric label="Amount" value={formatCurrency(selectedExpense.amount)} />
                      <Metric label="Date" value={selectedExpense.expenseDate.slice(0, 10)} />
                      <Metric label="Property" value={selectedExpense.property.name} />
                      <Metric label="City" value={selectedExpense.property.city} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditExpense(selectedExpense)}
                        className="flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void archiveExpense(selectedExpense)}
                        className="flex h-10 items-center justify-center rounded-lg border border-error-200 px-4 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                )}

                <Chart title="Property Totals" data={propertyTotals} max={maxChartValue} />
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

function Chart({
  title,
  data,
  max,
}: {
  title: string;
  data: Record<string, number>;
  max: number;
}) {
  const rows = Object.entries(data);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-5 space-y-3">
        {rows.map(([label, total]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.max(8, (total / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {!rows.length && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No expenses in this filter.
          </p>
        )}
      </div>
    </div>
  );
}
