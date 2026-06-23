import { redirect } from "next/navigation";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getTickets, getTicketCounts, getHRAgents, getCategories } from "@/lib/queries";
import { TicketsWorkspace } from "@/components/tickets/tickets-workspace";
import { buildTicketDetailUrl } from "@/lib/ticket-url";
import { canAccess } from "@/lib/auth";
import type { TicketView } from "@/types";

interface PageProps {
  searchParams: Promise<{
    view?: TicketView;
    status?: string;
    owner_id?: string;
    category_id?: string;
    priority?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    list?: string;
  }>;
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");

  const canDelete = canAccess(ctx.permissions, "tickets", "delete");
  const canCreate = canAccess(ctx.permissions, "tickets", "create");
  const view = (params.view || "all") as TicketView;
  const currentFilters = {
    view,
    status: params.status,
    owner_id: params.owner_id,
    category_id: params.category_id,
    priority: params.priority,
    search: params.search,
    date_from: params.date_from,
    date_to: params.date_to,
  };
  const filters = {
    status: params.status?.split(",") as never,
    owner_id: params.owner_id,
    category_id: params.category_id,
    priority: params.priority?.split(",") as never,
    search: params.search,
    date_from: params.date_from,
    date_to: params.date_to,
  };

  const [tickets, counts, agents, categories] = await Promise.all([
    getTickets(view, filters, ctx.profile.id),
    getTicketCounts(ctx.profile.id),
    getHRAgents(),
    getCategories(),
  ]);

  if (tickets.length > 0 && params.list !== "1") {
    redirect(buildTicketDetailUrl(tickets[0].id, currentFilters));
  }

  const viewCounts = {
    my_open: counts.my_open,
    unassigned: counts.unassigned,
    all: counts.all,
    overdue: counts.overdue,
    closed: counts.closed,
  };

  return (
    <TicketsWorkspace
      tickets={tickets}
      view={view}
      viewCounts={viewCounts}
      agents={agents}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      currentFilters={currentFilters}
      canDelete={canDelete}
      canCreate={canCreate}
      profile={ctx.profile}
    />
  );
}
