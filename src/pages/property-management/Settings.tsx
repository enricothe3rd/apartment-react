import ModulePage from "./ModulePage";

export default function Settings() {
  return (
    <ModulePage
      title="Settings"
      description="Manage profile, account preferences, protected routes, and role-based user interface rules."
      highlights={[
        "Profile settings",
        "Protected routes",
        "Role-based UI",
        "Account preferences",
      ]}
      checklist={[
        "Connect profile settings to authenticated user data.",
        "Add protected route wrapper.",
        "Centralize role permission rules.",
      ]}
    />
  );
}
