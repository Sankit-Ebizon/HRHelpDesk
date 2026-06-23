import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import { ProfilesListView } from "@/components/settings/profiles-list-view";
import { NewProfileButton } from "@/components/settings/new-profile-button";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getRoles } from "@/lib/queries";
import { redirect } from "next/navigation";
import type { RoleDefinition } from "@/types";
import { canAccess } from "@/lib/auth";

export default async function PermissionsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "read")) redirect("/dashboard");
  if (!canAccess(ctx.permissions, "settings", "edit")) redirect("/dashboard");

  const roles = (await getRoles()) as RoleDefinition[];
  const isAdmin = ctx.profile.role === "administrator";

  return (
    <div className="min-h-full bg-white">
      <SettingsDetailHeader
        category="User Management"
        title="Profiles"
        breadcrumbLabel="Profiles"
        description="Profiles define what each role can access in HR Helpdesk. Select a profile to configure module permissions for tickets, contacts, users, reports, and settings."
        actions={isAdmin ? <NewProfileButton roles={roles} /> : undefined}
      />
      <ProfilesListView roles={roles} />
    </div>
  );
}
