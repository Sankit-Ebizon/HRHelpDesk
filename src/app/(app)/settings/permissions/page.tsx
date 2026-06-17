import { AppHeader } from "@/components/layout/sidebar";
import { PageContent } from "@/components/layout/page-content";
import { getRolePermissionsMatrix, getRoles } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { PermissionsMatrix } from "@/components/settings/permissions-matrix";
import { redirect } from "next/navigation";
import type { RoleDefinition, RolePermission } from "@/types";
import { canAccess } from "@/lib/auth";

export default async function PermissionsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "read")) redirect("/dashboard");
  if (!canAccess(ctx.permissions, "settings", "edit")) redirect("/dashboard");

  const [permissions, roles] = await Promise.all([
    getRolePermissionsMatrix() as Promise<RolePermission[]>,
    getRoles() as Promise<RoleDefinition[]>,
  ]);

  return (
    <>
      <AppHeader title="Role Permissions" profile={ctx.profile} />
      <PageContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure Read, Create, Edit, and Delete access per module for each role.
          {ctx.profile.role !== "administrator" && " (View only — contact an administrator to make changes.)"}
        </p>
        <PermissionsMatrix permissions={permissions} roles={roles} isAdmin={ctx.profile.role === "administrator"} />
      </PageContent>
    </>
  );
}
