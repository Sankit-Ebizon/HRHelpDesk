import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/sidebar";
import { TicketStatusListView } from "@/components/tickets/ticket-status-list-view";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { canAccess } from "@/lib/auth";
import { getTicketCounts, getTickets } from "@/lib/queries";
import { TICKET_VIEWS, type TicketView } from "@/types";

interface PageProps {
  params: Promise<{ view: string }>;
}

function isTicketView(value: string): value is TicketView {
  return TICKET_VIEWS.some((item) => item.id === value);
}

export default async function TicketViewListPage({ params }: PageProps) {
  const { view: viewParam } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");
  if (!isTicketView(viewParam)) notFound();

  const view = viewParam;
  const [tickets, counts] = await Promise.all([
    getTickets(view, {}, ctx.profile.id),
    getTicketCounts(ctx.profile.id),
  ]);

  const viewMeta = TICKET_VIEWS.find((item) => item.id === view)!;
  const viewCounts = {
    my_open: counts.my_open,
    unassigned: counts.unassigned,
    all: counts.all,
    overdue: counts.overdue,
    closed: counts.closed,
  };

  return (
    <>
      <AppHeader title={viewMeta.label} profile={ctx.profile} />
      <TicketStatusListView
        tickets={tickets}
        view={view}
        viewCounts={viewCounts}
      />
    </>
  );
}
