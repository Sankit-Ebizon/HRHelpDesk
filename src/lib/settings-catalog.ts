import { canAccess } from "@/lib/auth";
import type { RolePermission, UserRole } from "@/types";
import {
  setupCategories,
  type SetupCategory,
  type SetupItem,
} from "@/lib/settings-catalog-data";

export { setupCategories };
export type { SetupCategory, SetupItem };
export { findSetupCategoryForPath, findSetupItemForPath } from "@/lib/settings-catalog-data";

export function filterSetupCatalog(
  categories: SetupCategory[],
  role: UserRole,
  permissions: RolePermission[]
): SetupCategory[] {
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => isSetupItemVisible(item, role, permissions)),
    }))
    .filter((category) => category.items.length > 0);
}

function isSetupItemVisible(
  item: SetupItem,
  role: UserRole,
  permissions: RolePermission[]
): boolean {
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.permission && !canAccess(permissions, item.permission.module, item.permission.action)) {
    return false;
  }
  return true;
}
