import { FormEvent, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";
type MaintenanceStatus = "NEW" | "ASSIGNED" | "IN_PROGRESS" | "WAITING" | "COMPLETED";
type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

type MaintenanceComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

type MaintenanceAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
};

type MaintenanceRequest = {
  id: string;
  title: string;
  description?: string | null;
  unitId: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  unit: {
    id: string;
    label: string;
    property?: { name: string };
    building?: { name: string };
    floor?: { level: number };
  };
  comments: MaintenanceComment[];
  attachments: MaintenanceAttachment[];
};

type UnitOption = {
  id: string;
  label: string;
  property?: { name: string };
  building?: { name: string };
  floor?: { level: number };
};

type RequestForm = {
  id: string;
  title: string;
  description: string;
  unitId: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo: string;
};

const columns: { status: MaintenanceStatus; label: string }[] = [
  { status: "NEW", label: "New" },
  { status: "ASSIGNED", label: "Assigned" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "WAITING", label: "Waiting" },
  { status: "COMPLETED", label: "Completed" },
];

const emptyRequestForm: RequestForm = {
  id: "",
  title: "",
  description: "",
  unitId: "",
  priority: "MEDIUM",
  status: "NEW",
  assignedTo: "",
};

const priorityColor = (priority: MaintenancePriority): BadgeColor => {
  if (priority === "LOW") return "light";
  if (priority === "MEDIUM") return "warning";
  if (priority === "HIGH") return "error";
  return "dark";
};

const statusColor = (status: MaintenanceStatus): BadgeColor => {
  if (status === "COMPLETED") return "success";
  if (status === "WAITING") return "warning";
  if (status === "IN_PROGRESS") return "info";
  return "primary";
};

export default function Maintenance() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestForm, setRequestForm] = useState<RequestForm>(emptyRequestForm);
  const [commentBody, setCommentBody] = useState("");
  const [attachmentForm, setAttachmentForm] = useState({ fileName: "", fileUrl: "" });
  const [priorityFilter, setPriorityFilter] = useState("all");
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

  async function loadMaintenanceWorkspace(nextSelectedId?: string) {
    setIsLoading(true);
    setError("");

    try {
      const [requestResponse, unitResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/maintenance`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/units`, { headers: authHeaders }),
      ]);
      const [requestData, unitData] = await Promise.all([
        requestResponse.json(),
        unitResponse.json(),
      ]);

      if (!requestResponse.ok) {
        throw new Error(requestData.message ?? "Unable to load maintenance requests");
      }

      if (!unitResponse.ok) {
        throw new Error(unitData.message ?? "Unable to load units");
      }

      setRequests(requestData.requests);
      setUnits(unitData.units);
      setSelectedRequestId(nextSelectedId ?? requestData.requests[0]?.id ?? "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load maintenance requests"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadMaintenanceWorkspace();
  }, [token]);

  const filteredRequests = requests.filter(
    (request) => priorityFilter === "all" || request.priority === priorityFilter
  );
  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? requests[0];
  const openCount = requests.filter((request) => request.status !== "COMPLETED").length;
  const highPriorityCount = requests.filter((request) =>
    ["HIGH", "EMERGENCY"].includes(request.priority)
  ).length;

  function startCreateRequest() {
    setRequestForm(emptyRequestForm);
    setMessage("");
    setError("");
  }

  function startEditRequest(request: MaintenanceRequest) {
    setRequestForm({
      id: request.id,
      title: request.title,
      description: request.description ?? "",
      unitId: request.unitId,
      priority: request.priority,
      status: request.status,
      assignedTo: request.assignedTo ?? "",
    });
    setSelectedRequestId(request.id);
    setMessage("");
    setError("");
  }

  async function saveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance${requestForm.id ? `/${requestForm.id}` : ""}`,
        {
          method: requestForm.id ? "PUT" : "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: requestForm.title,
            description: requestForm.description || null,
            unitId: requestForm.unitId,
            priority: requestForm.priority,
            status: requestForm.status,
            assignedTo: requestForm.assignedTo || null,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save maintenance request");
      }

      setRequestForm(emptyRequestForm);
      setMessage(requestForm.id ? "Request updated." : "Request created.");
      await loadMaintenanceWorkspace(data.request.id);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save maintenance request"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateRequestField(
    requestId: string,
    endpoint: "assignment" | "priority" | "status",
    payload: Record<string, string | null>
  ) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/${requestId}/${endpoint}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update request");
      }

      setMessage("Request updated.");
      await loadMaintenanceWorkspace(data.request.id);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to update request"
      );
    }
  }

  async function archiveRequest(request: MaintenanceRequest) {
    const confirmed = window.confirm(`Archive maintenance request "${request.title}"?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/${request.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to archive request");
      }

      setRequestForm(emptyRequestForm);
      setMessage("Request archived.");
      await loadMaintenanceWorkspace();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to archive request"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRequest) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/${selectedRequest.id}/comments`,
        {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            author: user?.name ?? user?.email ?? "Team member",
            body: commentBody,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to add comment");
      }

      setCommentBody("");
      setMessage("Comment added.");
      await loadMaintenanceWorkspace(selectedRequest.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function addAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRequest) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/${selectedRequest.id}/attachments`,
        {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(attachmentForm),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to add attachment");
      }

      setAttachmentForm({ fileName: "", fileUrl: "" });
      setMessage("Attachment saved.");
      await loadMaintenanceWorkspace(selectedRequest.id);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to add attachment"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Maintenance | Property Management Dashboard"
        description="Coordinate maintenance requests with priority, assignment, comments, attachments, and Kanban workflow."
      />
      <PageBreadcrumb pageTitle="Maintenance" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Maintenance Board
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Track work orders by status, priority, assignment, comments, and saved attachment links.
              </p>
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
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
            Loading maintenance requests...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label="Open Requests" value={String(openCount)} />
              <Metric label="High Priority" value={String(highPriorityCount)} />
              <Metric label="Completed" value={String(requests.length - openCount)} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="xl:col-span-3">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  {columns.map((column) => {
                    const columnRequests = filteredRequests.filter(
                      (request) => request.status === column.status
                    );

                    return (
                      <div
                        key={column.status}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          const requestId = event.dataTransfer.getData("text/plain");
                          if (requestId) {
                            void updateRequestField(requestId, "status", {
                              status: column.status,
                            });
                          }
                        }}
                        className="min-h-72 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {column.label}
                          </h2>
                          <Badge color={statusColor(column.status)} size="sm">
                            {String(columnRequests.length)}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {columnRequests.map((request) => (
                            <button
                              key={request.id}
                              type="button"
                              draggable
                              onDragStart={(event) =>
                                event.dataTransfer.setData("text/plain", request.id)
                              }
                              onClick={() => setSelectedRequestId(request.id)}
                              className="block w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-left hover:border-brand-200 hover:bg-brand-50/40 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {request.title}
                                </span>
                                <Badge color={priorityColor(request.priority)} size="sm">
                                  {request.priority.toLowerCase()}
                                </Badge>
                              </div>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {request.unit.property?.name ?? "Property"} / {request.unit.label}
                              </p>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {request.assignedTo || "Unassigned"}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="space-y-6 xl:col-span-2">
                <form
                  onSubmit={saveRequest}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {requestForm.id ? "Edit Request" : "Create Request"}
                    </h2>
                    {requestForm.id && (
                      <button
                        type="button"
                        onClick={startCreateRequest}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="mt-5 space-y-4">
                    <Field label="Title">
                      <input
                        required
                        value={requestForm.title}
                        onChange={(event) =>
                          setRequestForm((form) => ({
                            ...form,
                            title: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </Field>
                    <Field label="Unit">
                      <select
                        required
                        value={requestForm.unitId}
                        onChange={(event) =>
                          setRequestForm((form) => ({
                            ...form,
                            unitId: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">Select unit</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.property?.name ?? "Property"} / {unit.building?.name ?? "Building"} / Floor{" "}
                            {unit.floor?.level ?? "-"} / {unit.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Priority">
                        <select
                          value={requestForm.priority}
                          onChange={(event) =>
                            setRequestForm((form) => ({
                              ...form,
                              priority: event.target.value as MaintenancePriority,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="EMERGENCY">Emergency</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <select
                          value={requestForm.status}
                          onChange={(event) =>
                            setRequestForm((form) => ({
                              ...form,
                              status: event.target.value as MaintenanceStatus,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                          {columns.map((column) => (
                            <option key={column.status} value={column.status}>
                              {column.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Assigned To">
                      <input
                        value={requestForm.assignedTo}
                        onChange={(event) =>
                          setRequestForm((form) => ({
                            ...form,
                            assignedTo: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        value={requestForm.description}
                        onChange={(event) =>
                          setRequestForm((form) => ({
                            ...form,
                            description: event.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </Field>
                    <button
                      disabled={isSubmitting}
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "Saving..." : requestForm.id ? "Save changes" : "Create request"}
                    </button>
                  </div>
                </form>

                {selectedRequest && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          Request Detail
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {selectedRequest.title}
                        </p>
                      </div>
                      <Badge color={priorityColor(selectedRequest.priority)} size="sm">
                        {selectedRequest.priority.toLowerCase()}
                      </Badge>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Metric label="Status" value={selectedRequest.status.toLowerCase()} />
                      <Metric
                        label="Assigned"
                        value={selectedRequest.assignedTo ?? "Unassigned"}
                      />
                      <Metric label="Unit" value={selectedRequest.unit.label} />
                      <Metric label="Comments" value={String(selectedRequest.comments.length)} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditRequest(selectedRequest)}
                        className="flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void archiveRequest(selectedRequest)}
                        className="flex h-10 items-center justify-center rounded-lg border border-error-200 px-4 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                      >
                        Archive
                      </button>
                    </div>

                    <div className="mt-5 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <Field label="Quick Status">
                        <select
                          value={selectedRequest.status}
                          onChange={(event) =>
                            void updateRequestField(selectedRequest.id, "status", {
                              status: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                          {columns.map((column) => (
                            <option key={column.status} value={column.status}>
                              {column.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Quick Priority">
                        <select
                          value={selectedRequest.priority}
                          onChange={(event) =>
                            void updateRequestField(selectedRequest.id, "priority", {
                              priority: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="EMERGENCY">Emergency</option>
                        </select>
                      </Field>
                      <Field label="Quick Assignment">
                        <input
                          defaultValue={selectedRequest.assignedTo ?? ""}
                          onBlur={(event) =>
                            void updateRequestField(selectedRequest.id, "assignment", {
                              assignedTo: event.target.value || null,
                            })
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </Field>
                    </div>

                    <form onSubmit={addComment} className="mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <Field label="Comment">
                        <textarea
                          required
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </Field>
                      <button
                        disabled={isSubmitting}
                        className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Add comment
                      </button>
                    </form>

                    <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedRequest.comments.map((comment) => (
                        <div key={comment.id} className="py-3 text-sm">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {comment.author}
                          </p>
                          <p className="mt-1 text-gray-500 dark:text-gray-400">
                            {comment.body}
                          </p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={addAttachment} className="mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <Field label="Attachment Name">
                        <input
                          required
                          value={attachmentForm.fileName}
                          onChange={(event) =>
                            setAttachmentForm((form) => ({
                              ...form,
                              fileName: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </Field>
                      <Field label="Attachment URL">
                        <input
                          required
                          value={attachmentForm.fileUrl}
                          onChange={(event) =>
                            setAttachmentForm((form) => ({
                              ...form,
                              fileUrl: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </Field>
                      <button
                        disabled={isSubmitting}
                        className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                      >
                        Save attachment
                      </button>
                    </form>

                    <div className="mt-4 space-y-2">
                      {selectedRequest.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border border-gray-100 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-gray-800 dark:text-brand-400 dark:hover:bg-brand-500/10"
                        >
                          {attachment.fileName}
                        </a>
                      ))}
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
