import { UsersView } from "@/components/users/users-view";
import { getRoleLabelMap, getRoles, getUsers, getDepartments } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth";
import type { Profile, RoleDefinition } from "@/types";

export default async function UsersPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "users", "read")) redirect("/dashboard");

  const [users, departments, roles, roleLabels] = await Promise.all([
    getUsers() as Promise<Profile[]>,
    getDepartments(),
    getRoles() as Promise<RoleDefinition[]>,
    getRoleLabelMap(),
  ]);

  const canInvite = canAccess(ctx.permissions, "users", "create");
  const canEdit = canAccess(ctx.permissions, "users", "edit");
  const canDelete = canAccess(ctx.permissions, "users", "delete");

  return (
    <UsersView
      users={users}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      roles={roles}
      roleLabels={roleLabels}
      canInvite={canInvite}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
