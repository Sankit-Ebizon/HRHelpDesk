import type { PermissionAction, UserRole } from "@/types";

export interface SetupItem {
  label: string;
  href: string;
  keywords?: string[];
  roles?: UserRole[];
  permission?: { module: string; action: PermissionAction };
}

export interface SetupCategory {
  title: string;
  items: SetupItem[];
}

export const setupCategories: SetupCategory[] = [
  {
    title: "Organization",
    items: [
      {
        label: "Departments",
        href: "/settings/departments",
        keywords: ["teams", "org", "structure"],
        permission: { module: "departments", action: "read" },
      },
      {
        label: "Categories",
        href: "/settings/categories",
        keywords: ["types", "classification", "topics"],
        permission: { module: "categories", action: "read" },
      },
      {
        label: "Sub-categories",
        href: "/settings/subcategories",
        keywords: ["types", "classification", "nested"],
        permission: { module: "categories", action: "read" },
      },
      {
        label: "General Settings",
        href: "/settings/general",
        keywords: ["company", "support", "inbox", "email"],
        roles: ["administrator"],
        permission: { module: "settings", action: "edit" },
      },
    ],
  },
  {
    title: "User Management",
    items: [
      {
        label: "Users & Profiles",
        href: "/users",
        keywords: ["agents", "staff", "invite", "roles"],
        permission: { module: "users", action: "read" },
      },
      {
        label: "Role Permission",
        href: "/settings/permissions",
        keywords: ["access", "roles", "security", "permissions", "profiles"],
        roles: ["administrator", "hr_manager"],
        permission: { module: "settings", action: "edit" },
      },
    ],
  },
  {
    title: "Customization",
    items: [
      {
        label: "Notification Preferences",
        href: "/settings/notifications",
        keywords: ["email", "alerts", "reminders"],
        permission: { module: "settings", action: "edit" },
      },
    ],
  },
];

export function findSetupCategoryForPath(pathname: string): SetupCategory | undefined {
  return setupCategories.find((category) =>
    category.items.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  );
}

export function findSetupItemForPath(
  pathname: string,
  categories: SetupCategory[]
): SetupItem | undefined {
  for (const category of categories) {
    const item = category.items.find(
      (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`)
    );
    if (item) return item;
  }
  return undefined;
}
