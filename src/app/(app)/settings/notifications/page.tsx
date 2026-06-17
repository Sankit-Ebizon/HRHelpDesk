import { AppHeader } from "@/components/layout/sidebar";
import { PageContent } from "@/components/layout/page-content";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getNotificationPreferences } from "@/lib/queries";
import { NotificationPrefsForm } from "@/components/settings/notification-prefs-form";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NotificationsSettingsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "edit")) redirect("/dashboard");

  const saved = await getNotificationPreferences(ctx.profile.id);

  return (
    <>
      <AppHeader title="Notification Preferences" profile={ctx.profile} />
      <PageContent className="max-w-2xl">
        <p className="text-sm text-muted-foreground mb-6">
          Configure which email and in-app notifications you receive.
        </p>
        <NotificationPrefsForm saved={saved} />
      </PageContent>
    </>
  );
}
