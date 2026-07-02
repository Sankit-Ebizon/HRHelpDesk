import { notFound, redirect } from "next/navigation";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import {
  getTicketById,
  getTicketComments,
  getTicketAttachments,
  getTicketTimeLogs,
  getTicketHistory,
  getDepartments,
  getCategories,
  getHRAgents,
  getTickets,
  getTicketCounts,
  getSupportEmail,
  getTicketPins,
  getSavedTicketViewById,
  getSavedViewsWithCounts,
  getStarredSystemViews,
} from "@/lib/queries";
import { TicketsWorkspace } from "@/components/tickets/tickets-workspace";
import { canAccess } from "@/lib/auth";
import { filtersFromSearchParams } from "@/lib/ticket-url";
import type { TicketFilters, TicketView } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
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
  }>;
}

export default async function TicketDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");

  const canDelete = canAccess(ctx.permissions, "tickets", "delete");
  const canCreate = canAccess(ctx.permissions, "tickets", "create");

  const { view: paramView, filters: paramFilters, customViewId } = filtersFromSearchParams(query);
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

  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const [
    tickets,
    counts,
    comments,
    attachments,
    timeLogs,
    history,
    departments,
    categories,
    agents,
    supportEmail,
    pins,
    viewsBundle,
    starredSystemViews,
  ] = await Promise.all([
    getTickets(view, filters, ctx.profile.id, { forList: true }),
    getTicketCounts(ctx.profile.id),
    getTicketComments(id),
    getTicketAttachments(id),
    getTicketTimeLogs(id),
    getTicketHistory(id),
    getDepartments(),
    getCategories(),
    getHRAgents(),
    getSupportEmail(),
    getTicketPins(id),
    getSavedViewsWithCounts(ctx.profile.id),
    getStarredSystemViews(),
  ]);

  const { savedViews, customViewCounts } = viewsBundle;

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
      selectedTicketId={id}
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
      ticket={ticket}
      comments={comments}
      attachments={attachments}
      timeLogs={timeLogs}
      history={history}
      categoriesFull={categories}
      supportEmail={supportEmail}
      pins={pins}
    />
  );
}
