import { notFound, redirect } from "next/navigation";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { TicketsWorkspace } from "@/components/tickets/tickets-workspace";
import { canAccess } from "@/lib/auth";
import {
  getTicketCounts,
  getTickets,
  getHRAgents,
  getCategories,
  getDepartments,
  getSavedTicketViews,
  getCustomViewCounts,
  getStarredSystemViews,
} from "@/lib/queries";
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
  const canDelete = canAccess(ctx.permissions, "tickets", "delete");
  const canCreate = canAccess(ctx.permissions, "tickets", "create");

  const currentFilters = { view };

  const [tickets, counts, agents, categories, departments, savedViews, starredSystemViews] =
    await Promise.all([
      getTickets(view, {}, ctx.profile.id),
      getTicketCounts(ctx.profile.id),
      getHRAgents(),
      getCategories(),
      getDepartments(),
      getSavedTicketViews(),
      getStarredSystemViews(),
    ]);

  const customViewCounts = await getCustomViewCounts(savedViews, ctx.profile.id);

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
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      currentFilters={currentFilters}
      savedViews={savedViews}
      starredSystemViews={starredSystemViews}
      customViewCounts={customViewCounts}
      canDelete={canDelete}
      canCreate={canCreate}
      profile={ctx.profile}
      listMode
    />
  );
}
