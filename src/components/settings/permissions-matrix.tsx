"use client";

import { useRouter } from "next/navigation";
import { updateRolePermission } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRoleLabel, type RoleDefinition, type RolePermission } from "@/types";
import { cn } from "@/lib/utils";

const ACTIONS = ["can_read", "can_create", "can_edit", "can_delete"] as const;

const stickyCell = "sticky left-0 z-10 sticky-panel-cell shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.4)]";

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

  async function toggle(permissionId: string, field: typeof ACTIONS[number], current: boolean) {
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
                colSpan={4}
                className="border-l border-border text-center text-foreground"
              >
                {role.label}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className={stickyCell} />
            {activeRoles.map((role) =>
              ACTIONS.map((action) => (
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
          {modules.map((mod) => (
            <TableRow key={mod!.slug}>
              <TableCell className={cn(stickyCell, "font-medium text-foreground")}>
                {mod!.name}
              </TableCell>
              {activeRoles.map((role) => {
                const perm = permissions.find(
                  (p) => p.role === role.role && p.module?.slug === mod!.slug
                );
                if (!perm) {
                  return ACTIONS.map((a) => (
                    <TableCell
                      key={`${role.role}-${mod!.slug}-${a}`}
                      className="border-l border-border text-center text-muted-foreground"
                    >
                      —
                    </TableCell>
                  ));
                }
                return ACTIONS.map((action) => (
                  <TableCell
                    key={`${role.role}-${mod!.slug}-${action}`}
                    className="border-l border-border text-center"
                  >
                    <input
                      type="checkbox"
                      checked={perm[action]}
                      disabled={!isAdmin || role.role === "administrator"}
                      onChange={() => toggle(perm.id, action, perm[action])}
                      className="h-4 w-4 cursor-pointer rounded border-border bg-background accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                      title={`${getRoleLabel(role.role, roleLabels)} ${action}`}
                    />
                  </TableCell>
                ));
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
