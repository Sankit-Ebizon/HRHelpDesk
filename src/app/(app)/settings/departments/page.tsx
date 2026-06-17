import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, DataPanel } from "@/components/layout/page-content";
import { getDepartments } from "@/lib/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsListHeader } from "@/components/settings/settings-list-header";
import { AddDepartmentDialog } from "@/components/settings/add-department-dialog";
import { DepartmentActions } from "@/components/settings/department-actions";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DepartmentsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "departments", "read")) redirect("/dashboard");

  const canCreate = canAccess(ctx.permissions, "departments", "create");
  const canEdit = canAccess(ctx.permissions, "departments", "edit");
  const canDelete = canAccess(ctx.permissions, "departments", "delete");
  const departments = await getDepartments();
  const showActions = canEdit || canDelete;

  return (
    <>
      <AppHeader title="Departments" profile={ctx.profile} />
      <PageContent>
        <SettingsListHeader>
          {canCreate && <AddDepartmentDialog />}
        </SettingsListHeader>

        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                {showActions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showActions ? 3 : 2}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No departments yet.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dept.description || "—"}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <DepartmentActions
                          department={dept}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataPanel>
      </PageContent>
    </>
  );
}
