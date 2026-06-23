import { Badge } from "@/components/ui/badge";
import { EditUserButton } from "@/components/users/edit-user-dialog";
import { cn } from "@/lib/utils";
import { getRoleLabel, USER_STATUS_LABELS, type Profile, type RoleDefinition } from "@/types";

interface UserListCardsProps {
  users: Profile[];
  departments: { id: string; name: string }[];
  roles: RoleDefinition[];
  roleLabels: Record<string, string>;
  canEdit?: boolean;
}

export function UserListCards({
  users,
  departments,
  roles,
  roleLabels,
  canEdit,
}: UserListCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {users.map((user) => (
        <div
          key={user.id}
          className="overflow-hidden rounded-2xl glass-panel p-4 transition-all hover-lift"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{user.full_name}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            {canEdit && (
              <EditUserButton user={user} departments={departments} roles={roles} />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getRoleLabel(user.role, roleLabels)}</Badge>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-2xs font-medium",
                user.status === "active" && "bg-green-100 text-green-800",
                user.status === "invited" && "bg-amber-100 text-amber-800",
                user.status === "rejected" && "bg-red-100 text-red-800",
                user.status === "inactive" && "bg-gray-100 text-gray-600"
              )}
            >
              {USER_STATUS_LABELS[user.status]}
            </span>
          </div>

          <p className="mt-3 text-2xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Department:</span>{" "}
            {user.department?.name || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
