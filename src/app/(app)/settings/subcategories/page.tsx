import { SubcategoriesView } from "@/components/settings/subcategories-view";
import { getAllSubcategoriesForSettings, getCategories } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Subcategory } from "@/types";

export default async function SubcategoriesPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "categories", "read")) redirect("/dashboard");

  const canCreate = canAccess(ctx.permissions, "categories", "create");
  const canEdit = canAccess(ctx.permissions, "categories", "edit");
  const canDelete = canAccess(ctx.permissions, "categories", "delete");
  const [subcategories, categories] = await Promise.all([
    getAllSubcategoriesForSettings(),
    getCategories(),
  ]);

  return (
    <SubcategoriesView
      subcategories={subcategories as Subcategory[]}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
