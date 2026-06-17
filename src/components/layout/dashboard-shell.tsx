import { getCurrentProfile, getUserPermissions } from "@/lib/auth";
import { getTicketCounts, getUnreadNotificationCount } from "@/lib/queries";
import { AppSidebar, sidebarWidth } from "@/components/layout/sidebar";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [unreadCount, ticketCounts] = await Promise.all([
    getUnreadNotificationCount(profile.id),
    getTicketCounts(profile.id),
  ]);
  const openTicketCount = ticketCounts.all;

  return (
    <div className="relative min-h-screen gradient-mesh noise-overlay">
      <AppSidebar
        profile={profile}
        unreadCount={unreadCount}
        openTicketCount={openTicketCount}
      />
      <main style={{ paddingLeft: sidebarWidth }} className="relative max-lg:!pl-0">
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
