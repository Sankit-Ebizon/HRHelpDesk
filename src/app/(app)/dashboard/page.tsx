import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, StatCard } from "@/components/layout/page-content";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getTicketCounts, getNotifications } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HRDashboardIllustration } from "@/components/illustrations/hr-dashboard-hero";
import { Ticket, Clock, AlertTriangle, CheckCircle, Inbox, Bell, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { formatRelative, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { buildTicketViewListUrl } from "@/lib/ticket-url";

const statConfig = [
  { label: "My Open", valueKey: "my_open" as const, icon: Ticket, href: buildTicketViewListUrl("my_open"), accent: "from-blue-500/15 to-transparent" },
  { label: "Unassigned", valueKey: "unassigned" as const, icon: Inbox, href: buildTicketViewListUrl("unassigned"), accent: "from-amber-500/15 to-transparent" },
  { label: "Overdue", valueKey: "overdue" as const, icon: AlertTriangle, href: buildTicketViewListUrl("overdue"), accent: "from-red-500/15 to-transparent" },
  { label: "Closed", valueKey: "closed" as const, icon: CheckCircle, href: buildTicketViewListUrl("closed"), accent: "from-emerald-500/15 to-transparent" },
  { label: "Open Tickets", valueKey: "all" as const, icon: Clock, href: buildTicketViewListUrl("all"), accent: "from-violet-500/15 to-transparent" },
];

export default async function DashboardPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;

  const counts = await getTicketCounts(ctx.profile.id);
  const notifications = await getNotifications(ctx.profile.id, 5);
  const firstName = ctx.profile.full_name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <AppHeader title="Dashboard" profile={ctx.profile}>
        <Button asChild size="sm" className="zoho-btn-primary h-8 px-4">
          <Link href="/tickets/new">
            <Plus className="h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </AppHeader>

      <PageContent className="space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl glass-panel shadow-glass animate-slide-up">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid gap-8 p-8 lg:grid-cols-2 lg:items-center lg:p-10">
            <div>
              <p className="text-sm font-medium text-primary">{greeting}</p>
              <h2 className="mt-2 text-display-sm font-bold tracking-tight sm:text-display">
                <span className="gradient-text">{firstName}</span>
                <span className="text-foreground">, your helpdesk awaits</span>
              </h2>
              <p className="mt-4 max-w-lg text-base text-muted-foreground leading-relaxed">
                Monitor employee requests, resolve issues faster, and keep your HR operations running smoothly — all from one command center.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="zoho-btn-primary h-9 px-5">
                  <Link href="/tickets">
                    View tickets
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/tickets/new">Create request</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex justify-end">
              <HRDashboardIllustration className="w-full max-w-md animate-float" />
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {statConfig.map((stat, i) => {
            const Icon = stat.icon;
            const value = counts[stat.valueKey];
            return (
              <Link key={stat.label} href={stat.href} style={{ animationDelay: `${i * 60}ms` }}>
                <StatCard
                  label={stat.label}
                  value={value}
                  icon={Icon}
                  accent={stat.accent}
                  className="animate-slide-up cursor-pointer h-full"
                />
              </Link>
            );
          })}
        </div>

        {/* Activity */}
        <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Latest updates across your workspace</p>
            </div>
            <Link href="/tickets" className="text-sm text-primary hover:text-primary/80 transition-colors">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications yet"
                description="Updates about tickets assigned to you will appear here."
              />
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0 group">
                    <div
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full transition-all",
                        n.is_read ? "bg-muted-foreground/30" : "bg-indigo-400 shadow-glow"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                      <p className="mt-1.5 text-2xs text-muted-foreground/60">{formatRelative(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
