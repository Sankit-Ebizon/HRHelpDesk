import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, DataPanel } from "@/components/layout/page-content";
import { getRoleLabelMap, getRoles, getUsers, getDepartments } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getRoleLabel, USER_STATUS_LABELS, type Profile, type RoleDefinition } from "@/types";
import { cn } from "@/lib/utils";
import { InviteUserForm } from "@/components/users/invite-user-form";
import { EditUserButton } from "@/components/users/edit-user-dialog";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth";

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

  return (
    <>
      <AppHeader title="Users & Profiles" profile={ctx.profile} />
      <PageContent className="space-y-6">
        {canInvite && <InviteUserForm departments={departments} roles={roles} />}

        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-16">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getRoleLabel(user.role, roleLabels)}</Badge>
                  </TableCell>
                  <TableCell>{user.department?.name || "—"}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      user.status === "active" && "bg-green-100 text-green-800",
                      user.status === "invited" && "bg-amber-100 text-amber-800",
                      user.status === "rejected" && "bg-red-100 text-red-800",
                      user.status === "inactive" && "bg-gray-100 text-gray-600"
                    )}>
                      {USER_STATUS_LABELS[user.status]}
                    </span>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <EditUserButton user={user} departments={departments} roles={roles} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      </PageContent>
    </>
  );
}
