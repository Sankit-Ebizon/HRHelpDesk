import { notFound, redirect } from "next/navigation";
import { UserDetailView } from "@/components/users/user-detail-view";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import {
  getDepartments,
  getRoleLabelMap,
  getRoles,
  getUserById,
} from "@/lib/queries";
import type { Profile, RoleDefinition } from "@/types";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "users", "read")) redirect("/dashboard");

  const user = await getUserById(id);
  if (!user) notFound();

  const canEdit = canAccess(ctx.permissions, "users", "edit");
  const [departments, roles, roleLabels] = await Promise.all([
    getDepartments(),
    getRoles() as Promise<RoleDefinition[]>,
    getRoleLabelMap(),
  ]);

  return (
    <UserDetailView
      user={user as Profile & { last_login_at?: string | null }}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      roles={roles}
      roleLabels={roleLabels}
      canEdit={canEdit}
    />
  );
}
