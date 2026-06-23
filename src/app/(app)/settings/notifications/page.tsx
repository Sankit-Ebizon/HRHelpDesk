import { redirect } from "next/navigation";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getNotificationPreferences } from "@/lib/queries";
import { NotificationPrefsForm } from "@/components/settings/notification-prefs-form";
import { canAccess } from "@/lib/auth";

export default async function NotificationsSettingsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "edit")) redirect("/dashboard");

  const saved = await getNotificationPreferences(ctx.profile.id);

  return (
    <div className="min-h-full bg-white">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h1 className="text-[15px] font-medium text-zinc-900">Notification Rules</h1>
      </div>

      <div className="px-6 py-6 sm:px-8">
        <NotificationPrefsForm saved={saved} />
      </div>
    </div>
  );
}
