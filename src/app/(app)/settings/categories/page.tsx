import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, DataPanel } from "@/components/layout/page-content";
import { getCategories, getDepartments } from "@/lib/queries";
import type { Category } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsListHeader } from "@/components/settings/settings-list-header";
import { AddCategoryDialog } from "@/components/settings/add-category-dialog";
import { CategoryActions } from "@/components/settings/category-actions";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "categories", "read")) redirect("/dashboard");

  const canCreate = canAccess(ctx.permissions, "categories", "create");
  const canEdit = canAccess(ctx.permissions, "categories", "edit");
  const canDelete = canAccess(ctx.permissions, "categories", "delete");
  const [categories, departments] = await Promise.all([
    getCategories(),
    getDepartments(),
  ]) as [Category[], Awaited<ReturnType<typeof getDepartments>>];
  const showActions = canEdit || canDelete;

  return (
    <>
      <AppHeader title="Categories" profile={ctx.profile} />
      <PageContent>
        <SettingsListHeader>
          {canCreate && <AddCategoryDialog departments={departments} />}
        </SettingsListHeader>

        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Sub-categories</TableHead>
                {showActions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showActions ? 4 : 3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.department?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.subcategories
                        ?.filter((s) => s.is_active)
                        .map((s) => s.name)
                        .join(", ") || "—"}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <CategoryActions
                          category={cat}
                          departments={departments}
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
