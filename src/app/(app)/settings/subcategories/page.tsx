import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, DataPanel } from "@/components/layout/page-content";
import { getCategories, getSubcategories } from "@/lib/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsListHeader } from "@/components/settings/settings-list-header";
import { AddSubcategoryDialog } from "@/components/settings/add-subcategory-dialog";
import { SubcategoryActions } from "@/components/settings/subcategory-actions";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SubcategoriesPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "categories", "read")) redirect("/dashboard");

  const canCreate = canAccess(ctx.permissions, "categories", "create");
  const canEdit = canAccess(ctx.permissions, "categories", "edit");
  const canDelete = canAccess(ctx.permissions, "categories", "delete");
  const [categories, subcategories] = await Promise.all([
    getCategories(),
    getSubcategories(),
  ]);
  const showActions = canEdit || canDelete;

  return (
    <>
      <AppHeader title="Sub-categories" profile={ctx.profile} />
      <PageContent>
        <SettingsListHeader>
          {canCreate && <AddSubcategoryDialog categories={categories} />}
        </SettingsListHeader>

        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                {showActions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showActions ? 4 : 3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No sub-categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                subcategories.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell>
                      {(sub.category as { name: string } | null)?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.description || "—"}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <SubcategoryActions
                          subcategory={sub}
                          categories={categories}
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
