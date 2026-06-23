import { CategoriesView } from "@/components/settings/categories-view";
import { getAllCategoriesForSettings, getDepartments } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Category } from "@/types";

export default async function CategoriesPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "categories", "read")) redirect("/dashboard");

  const canCreate = canAccess(ctx.permissions, "categories", "create");
  const canEdit = canAccess(ctx.permissions, "categories", "edit");
  const canDelete = canAccess(ctx.permissions, "categories", "delete");
  const [categories, departments] = await Promise.all([
    getAllCategoriesForSettings(),
    getDepartments(),
  ]);

  return (
    <CategoriesView
      categories={categories as Category[]}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
