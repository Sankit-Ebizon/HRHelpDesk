import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { SetupHub } from "@/components/settings/setup-hub";
import { filterSetupCatalog, setupCategories } from "@/lib/settings-catalog";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "read")) redirect("/dashboard");

  const visibleCategories = filterSetupCatalog(
    setupCategories,
    ctx.profile.role,
    ctx.permissions
  );

  return <SetupHub categories={visibleCategories} />;
}
