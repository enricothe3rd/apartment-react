import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  targetUrl?: string | null;
  createdAt: string;
};

export default function NotificationDropdown() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  async function loadNotifications() {
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      headers: authHeaders,
    });
    const data = await response.json();
    if (response.ok) {
      setNotifications(data.notifications.slice(0, 8));
      setUnreadCount(data.unreadCount);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, [token]);

  async function markRead(id: string) {
    await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: authHeaders,
    });
    await loadNotifications();
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => setIsOpen((current) => !current)}
      >
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085H8.00004Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <button
            onClick={closeDropdown}
            className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Close
          </button>
        </div>
        <ul className="flex h-auto flex-col overflow-y-auto custom-scrollbar">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <DropdownItem
                onItemClick={() => {
                  void markRead(notification.id);
                  closeDropdown();
                }}
                to={notification.targetUrl ?? "/notifications"}
                className="flex gap-3 rounded-lg border-b border-gray-100 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
              >
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? "bg-gray-300" : "bg-orange-500"}`} />
                <span className="block min-w-0">
                  <span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    {notification.title}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    {notification.message}
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
          {!notifications.length && (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No notifications.
            </li>
          )}
        </ul>
        <Link
          to="/notifications"
          onClick={closeDropdown}
          className="mt-3 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View all notifications
        </Link>
      </Dropdown>
    </div>
  );
}
