import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  targetUrl?: string | null;
  createdAt: string;
};

type NotificationForm = {
  id: string;
  type: string;
  title: string;
  message: string;
  targetUrl: string;
  read: boolean;
};

const emptyNotificationForm: NotificationForm = {
  id: "",
  type: "system",
  title: "",
  message: "",
  targetUrl: "/dashboard",
  read: false,
};

export default function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [form, setForm] = useState<NotificationForm>(emptyNotificationForm);
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

  async function loadNotifications() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Unable to load notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load notifications"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadNotifications();
  }, [token]);

  function startEdit(notification: Notification) {
    setForm({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetUrl: notification.targetUrl ?? "",
      read: notification.read,
    });
    setMessage("");
    setError("");
  }

  async function saveNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications${form.id ? `/${form.id}` : ""}`,
        {
          method: form.id ? "PUT" : "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: form.type,
            title: form.title,
            message: form.message,
            targetUrl: form.targetUrl || null,
            read: form.read,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Unable to save notification");
      setForm(emptyNotificationForm);
      setMessage(form.id ? "Notification updated." : "Notification created.");
      await loadNotifications();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save notification"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markRead(id: string) {
    await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: authHeaders,
    });
    await loadNotifications();
  }

  async function markAllRead() {
    await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: "PATCH",
      headers: authHeaders,
    });
    await loadNotifications();
  }

  async function archiveNotification(notification: Notification) {
    const confirmed = window.confirm(`Archive notification "${notification.title}"?`);
    if (!confirmed) return;
    await fetch(`${API_BASE_URL}/notifications/${notification.id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    setMessage("Notification archived.");
    await loadNotifications();
  }

  return (
    <>
      <PageMeta
        title="Notifications | Property Management Dashboard"
        description="Surface rent reminders, lease expiration alerts, maintenance updates, and system notifications."
      />
      <PageBreadcrumb pageTitle="Notifications" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Manage unread alerts, system messages, and links into property workflows.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              Mark all read
            </button>
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
            Loading notifications...
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="space-y-4 xl:col-span-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Metric label="Unread" value={String(unreadCount)} />
                <Metric label="Total" value={String(notifications.length)} />
                <Metric
                  label="System"
                  value={String(notifications.filter((item) => item.type === "system").length)}
                />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {notification.title}
                            </h2>
                            <Badge color={notification.read ? "light" : "warning"} size="sm">
                              {notification.read ? "read" : "unread"}
                            </Badge>
                            <Badge color="info" size="sm">
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            to={notification.targetUrl ?? "/dashboard"}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                          >
                            Open
                          </Link>
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => void markRead(notification.id)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                            >
                              Read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(notification)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveNotification(notification)}
                            className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!notifications.length && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No notifications.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <aside className="xl:col-span-2">
              <form
                onSubmit={saveNotification}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {form.id ? "Edit Notification" : "Create Notification"}
                  </h2>
                  {form.id && (
                    <button
                      type="button"
                      onClick={() => setForm(emptyNotificationForm)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div className="mt-5 space-y-4">
                  <Field label="Type">
                    <input
                      required
                      value={form.type}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, type: event.target.value }))
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </Field>
                  <Field label="Title">
                    <input
                      required
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, title: event.target.value }))
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </Field>
                  <Field label="Message">
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, message: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </Field>
                  <Field label="Link">
                    <input
                      value={form.targetUrl}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, targetUrl: event.target.value }))
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </Field>
                  <label className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={form.read}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, read: event.target.checked }))
                      }
                      className="size-4 rounded border-gray-300"
                    />
                    Read
                  </label>
                  <button
                    disabled={isSubmitting}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : form.id ? "Save changes" : "Create notification"}
                  </button>
                </div>
              </form>
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
