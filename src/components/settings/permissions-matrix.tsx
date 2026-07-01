"use client";

import { useRouter } from "next/navigation";
import { updateRolePermission } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { getModulePermissionActions, type PermissionField } from "@/lib/permission-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRoleLabel, type RoleDefinition, type RolePermission } from "@/types";
import { cn } from "@/lib/utils";

const ALL_ACTIONS: PermissionField[] = [
  "can_read",
  "can_create",
  "can_edit",
  "can_delete",
  "can_enable",
];

const stickyCell = "sticky left-0 z-10 sticky-panel-cell shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)]";

interface PermissionsMatrixProps {
  permissions: RolePermission[];
  roles: RoleDefinition[];
  isAdmin: boolean;
}

export function PermissionsMatrix({ permissions, roles, isAdmin }: PermissionsMatrixProps) {
  const router = useRouter();
  const activeRoles = [...roles].sort((a, b) => a.label.localeCompare(b.label));
  const roleLabels = activeRoles.reduce<Record<string, string>>((acc, role) => {
    acc[role.role] = role.label;
    return acc;
  }, {});

  const modules = [...new Map(
    permissions.map((p) => [p.module?.slug, p.module])
  ).values()]
    .filter(Boolean)
    .sort((a, b) => (a!.name || "").localeCompare(b!.name || ""));

  async function toggle(permissionId: string, field: PermissionField, current: boolean) {
    if (!isAdmin) return;
    await runWithLoading(async () => {
      await updateRolePermission(permissionId, field, !current);
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl glass-panel shadow-glass">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(stickyCell, "min-w-[140px]")}>Module</TableHead>
            {activeRoles.map((role) => (
              <TableHead
                key={role.role}
                colSpan={ALL_ACTIONS.length}
                className="border-l border-border text-center text-foreground"
              >
                {role.label}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className={stickyCell} />
            {activeRoles.map((role) =>
              ALL_ACTIONS.map((action) => (
                <TableHead
                  key={`${role.role}-${action}`}
                  className="w-16 border-l border-border text-center text-2xs capitalize text-muted-foreground"
                >
                  {action.replace("can_", "")}
                </TableHead>
              ))
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((mod) => {
            const moduleActions = getModulePermissionActions(mod!.slug);
            return (
              <TableRow key={mod!.slug}>
                <TableCell className={cn(stickyCell, "font-medium text-foreground")}>
                  {mod!.name}
                </TableCell>
                {activeRoles.map((role) => {
                  const perm = permissions.find(
                    (p) => p.role === role.role && p.module?.slug === mod!.slug
                  );
                  return ALL_ACTIONS.map((action) => {
                    const applies = moduleActions.includes(action);
                    if (!perm) {
                      return (
                        <TableCell
                          key={`${role.role}-${mod!.slug}-${action}`}
                          className="border-l border-border text-center text-muted-foreground"
                        >
                          —
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        key={`${role.role}-${mod!.slug}-${action}`}
                        className="border-l border-border text-center"
                      >
                        {applies ? (
                          <input
                            type="checkbox"
                            checked={perm[action] ?? false}
                            disabled={!isAdmin || role.role === "administrator"}
                            onChange={() => toggle(perm.id, action, perm[action] ?? false)}
                            className="h-4 w-4 cursor-pointer rounded border-border bg-background accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                            title={`${getRoleLabel(role.role, roleLabels)} ${action}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  });
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
