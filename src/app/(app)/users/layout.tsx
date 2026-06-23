import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { SettingsLayoutShell } from "@/components/settings/settings-layout-shell";
import { filterSetupCatalog, setupCategories } from "@/lib/settings-catalog";
import { canAccess } from "@/lib/auth";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getLayoutContext();
  if (!ctx) return children;

  const categories = canAccess(ctx.permissions, "settings", "read")
    ? filterSetupCatalog(setupCategories, ctx.profile.role, ctx.permissions)
    : [];

  if (categories.length === 0) return children;

  return <SettingsLayoutShell categories={categories}>{children}</SettingsLayoutShell>;
}
