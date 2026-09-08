export type AuthRole = "ADMIN" | "MANAGER" | "STAFF" | "TENANT";

export type Permission =
  | "view_dashboard"
  | "manage_properties"
  | "manage_tenants"
  | "manage_leases"
  | "manage_payments"
  | "manage_maintenance"
  | "manage_expenses"
  | "view_reports"
  | "view_notifications"
  | "manage_settings";

const rolePermissions: Record<AuthRole, Permission[]> = {
  ADMIN: [
    "view_dashboard",
    "manage_properties",
    "manage_tenants",
    "manage_leases",
    "manage_payments",
    "manage_maintenance",
    "manage_expenses",
    "view_reports",
    "view_notifications",
    "manage_settings",
  ],
  MANAGER: [
    "view_dashboard",
    "manage_properties",
    "manage_tenants",
    "manage_leases",
    "manage_payments",
    "manage_maintenance",
    "manage_expenses",
    "view_reports",
    "view_notifications",
    "manage_settings",
  ],
  STAFF: ["view_dashboard", "manage_maintenance", "view_notifications"],
  TENANT: ["view_dashboard", "manage_payments", "view_notifications"],
};

export function hasPermission(role: AuthRole | undefined, permission: Permission) {
  if (!role) {
    return false;
  }

  return rolePermissions[role].includes(permission);
}
