import { AppHeader } from "@/components/layout/sidebar";
import { PageContent } from "@/components/layout/page-content";
import { createClient } from "@/lib/supabase/server";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportsCharts } from "@/components/reports/reports-charts";
import { ReportsListView } from "@/components/reports/reports-list-view";
import { canAccess } from "@/lib/auth";
import { getVisibleReportSectionsForRole } from "@/lib/queries";
import { REPORT_DEFINITIONS } from "@/lib/reports/types";
import { CUSTOM_REPORT_SECTION } from "@/lib/reports/sections";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "reports", "read")) redirect("/dashboard");
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { count: totalTickets },
    { count: openTickets },
    { count: closedTickets },
    { count: overdueTickets },
    { data: ticketsByCategory },
    { data: timeByUser },
    { data: recentTickets },
    visibleSections,
  ] = await Promise.all([
    supabase.from("tickets").select("id", { count: "exact", head: true }),
    supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress", "on_hold", "reopened"]),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "closed"),
    supabase.from("tickets").select("id", { count: "exact", head: true }).lt("due_date", new Date().toISOString()).not("status", "eq", "closed"),
    supabase.from("tickets").select("category_id, categories(name)").gte("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("time_logs").select("user_id, time_spent_minutes, profiles(full_name)").gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]),
    supabase.from("tickets").select("created_at, closed_at, status").eq("status", "closed").gte("closed_at", thirtyDaysAgo.toISOString()),
    getVisibleReportSectionsForRole(ctx.profile.role),
  ]);

  const visibleReports = REPORT_DEFINITIONS.filter((report) =>
    visibleSections.includes(report.id)
  );
  const showCustomReport = visibleSections.includes(CUSTOM_REPORT_SECTION);

  const categoryMap: Record<string, number> = {};
  ticketsByCategory?.forEach((t) => {
    const cat = t.categories as unknown as { name: string } | null;
    categoryMap[cat?.name || "Uncategorized"] = (categoryMap[cat?.name || "Uncategorized"] || 0) + 1;
  });

  const userTimeMap: Record<string, { name: string; minutes: number }> = {};
  timeByUser?.forEach((log) => {
    const profile = log.profiles as unknown as { full_name: string } | null;
    const name = profile?.full_name || "Unknown";
    if (!userTimeMap[log.user_id]) userTimeMap[log.user_id] = { name, minutes: 0 };
    userTimeMap[log.user_id].minutes += log.time_spent_minutes;
  });

  let avgResolutionHours = 0;
  if (recentTickets && recentTickets.length > 0) {
    const totalHours = recentTickets.reduce((sum, t) => {
      if (t.closed_at && t.created_at) {
        return sum + (new Date(t.closed_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
      }
      return sum;
    }, 0);
    avgResolutionHours = Math.round(totalHours / recentTickets.length);
  }

  const stats = [
    { label: "Total Tickets", value: totalTickets || 0 },
    { label: "Open Tickets", value: openTickets || 0 },
    { label: "Closed Tickets", value: closedTickets || 0 },
    { label: "Overdue Tickets", value: overdueTickets || 0 },
    { label: "Avg Resolution (hrs)", value: avgResolutionHours },
  ];

  return (
    <>
      <AppHeader title="Reports" profile={ctx.profile} />
      <PageContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6">
                <div className="text-2xl font-bold sm:text-3xl">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <ReportsCharts
          categoryData={Object.entries(categoryMap).map(([name, count]) => ({ name, count }))}
          timeData={Object.values(userTimeMap).map((u) => ({ name: u.name, hours: Math.round(u.minutes / 60 * 10) / 10 }))}
        />

        <ReportsListView reports={visibleReports} showCustomReport={showCustomReport} />
      </PageContent>
    </>
  );
}
