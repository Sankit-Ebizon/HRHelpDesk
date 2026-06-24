import { getCurrentProfile, getUserPermissions, canAccess } from "@/lib/auth";
import { getNotifications, getTicketCounts, getUnreadNotificationCount } from "@/lib/queries";
import { AppTopNav, topNavHeight } from "@/components/layout/sidebar";
import { ProfileMissingFallback } from "@/components/layout/profile-missing-fallback";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return <ProfileMissingFallback />;
  }

  const [unreadCount, notifications, ticketCounts, permissions] = await Promise.all([
    getUnreadNotificationCount(profile.id),
    getNotifications(profile.id, 30),
    getTicketCounts(profile.id),
    getUserPermissions(profile.role),
  ]);
  const openTicketCount = ticketCounts.all;
  const showSettings = canAccess(permissions, "settings", "read");

  return (
    <div className="relative min-h-screen gradient-mesh noise-overlay">
      <AppTopNav
        profile={profile}
        notifications={notifications}
        unreadCount={unreadCount}
        openTicketCount={openTicketCount}
        showSettings={showSettings}
      />
      <main style={{ paddingTop: topNavHeight }} className="relative">
        {children}
      </main>
    </div>
  );
}

export async function getLayoutContext() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const permissions = await getUserPermissions(profile.role);
  return { profile, permissions };
}
