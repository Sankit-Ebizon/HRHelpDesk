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
} from "@/lib/queries";
import { TicketsWorkspace } from "@/components/tickets/tickets-workspace";
import { canAccess } from "@/lib/auth";
import type { TicketView } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    view?: TicketView;
    status?: string;
    owner_id?: string;
    category_id?: string;
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
  const view = (query.view || "all") as TicketView;
  const currentFilters = {
    view,
    status: query.status,
    owner_id: query.owner_id,
    category_id: query.category_id,
    priority: query.priority,
    search: query.search,
    date_from: query.date_from,
    date_to: query.date_to,
  };
  const filters = {
    status: query.status?.split(",") as never,
    owner_id: query.owner_id,
    category_id: query.category_id,
    priority: query.priority?.split(",") as never,
    search: query.search,
    date_from: query.date_from,
    date_to: query.date_to,
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
  ] = await Promise.all([
    getTickets(view, filters, ctx.profile.id),
    getTicketCounts(ctx.profile.id),
    getTicketComments(id),
    getTicketAttachments(id),
    getTicketTimeLogs(id),
    getTicketHistory(id),
    getDepartments(),
    getCategories(),
    getHRAgents(),
  ]);

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
      currentFilters={currentFilters}
      canDelete={canDelete}
      canCreate={canCreate}
      profile={ctx.profile}
      ticket={ticket}
      comments={comments}
      attachments={attachments}
      timeLogs={timeLogs}
      history={history}
      departments={departments}
      categoriesFull={categories}
    />
  );
}
