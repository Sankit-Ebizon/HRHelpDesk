import { redirect } from "next/navigation";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import {
  getTickets,
  getTicketCounts,
  getHRAgents,
  getCategories,
  getDepartments,
  getSavedTicketViews,
  getSavedTicketViewById,
  getCustomViewCounts,
  getStarredSystemViews,
} from "@/lib/queries";
import { TicketsWorkspace } from "@/components/tickets/tickets-workspace";
import { buildTicketDetailUrl, filtersFromSearchParams } from "@/lib/ticket-url";
import { canAccess } from "@/lib/auth";
import type { TicketFilters, TicketView } from "@/types";

interface PageProps {
  searchParams: Promise<{
    view?: TicketView;
    custom_view?: string;
    status?: string;
    owner_id?: string;
    category_id?: string;
    department_id?: string;
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

  const { view: paramView, filters: paramFilters, customViewId } = filtersFromSearchParams(params);
  const activeCustomView = customViewId ? await getSavedTicketViewById(customViewId) : null;
  const view = (activeCustomView?.base_view || paramView || "all") as TicketView;
  const filters: TicketFilters = activeCustomView
    ? { ...activeCustomView.filters, ...paramFilters }
    : paramFilters;

  const currentFilters = {
    view,
    custom_view: customViewId,
    status: filters.status?.join(","),
    owner_id: filters.owner_id,
    category_id: filters.category_id,
    department_id: filters.department_id,
    priority: filters.priority?.join(","),
    search: filters.search,
    date_from: filters.date_from,
    date_to: filters.date_to,
  };

  const [tickets, counts, agents, categories, departments, savedViews, starredSystemViews] =
    await Promise.all([
    getTickets(view, filters, ctx.profile.id),
    getTicketCounts(ctx.profile.id),
    getHRAgents(),
    getCategories(),
    getDepartments(),
    getSavedTicketViews(),
    getStarredSystemViews(),
  ]);

  const customViewCounts = await getCustomViewCounts(savedViews, ctx.profile.id);

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
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      currentFilters={currentFilters}
      savedViews={savedViews}
      starredSystemViews={starredSystemViews}
      customViewCounts={customViewCounts}
      activeCustomView={activeCustomView}
      canDelete={canDelete}
      canCreate={canCreate}
      profile={ctx.profile}
      listMode={params.list === "1"}
    />
  );
}
