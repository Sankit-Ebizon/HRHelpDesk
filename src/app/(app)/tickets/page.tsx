import Link from "next/link";
import { AppHeader } from "@/components/layout/sidebar";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { getTickets, getTicketCounts, getHRAgents, getCategories } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Ticket } from "lucide-react";
import { formatDate, formatRelative, getStatusColor, getPriorityColor } from "@/lib/utils";
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, type TicketView } from "@/types";
import { TicketViewsSidebar, TicketMobileFilterButton } from "@/components/tickets/ticket-views-sidebar";
import { DeleteTicketButton } from "@/components/tickets/delete-ticket-button";
import { DataPanel } from "@/components/layout/page-content";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  }>;
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");

  const canDelete = canAccess(ctx.permissions, "tickets", "delete");
  const view = (params.view || "all") as TicketView;
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

  const viewCounts: Record<TicketView, number> = {
    my_open: counts.my_open,
    unassigned: counts.unassigned,
    all: counts.all,
    overdue: counts.overdue,
    closed: counts.closed,
  };

  return (
    <>
      <AppHeader title="Tickets" profile={ctx.profile}>
        <Link href="/tickets/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Button>
        </Link>
      </AppHeader>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <TicketViewsSidebar
          view={view}
          viewCounts={viewCounts}
          agents={agents}
          categories={categories}
          currentFilters={params}
        />

        <div className="flex-1 p-4 sm:p-6 space-y-4">
          <div className="flex justify-end md:hidden">
            <TicketMobileFilterButton
              agents={agents}
              categories={categories}
              currentFilters={params}
            />
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No tickets found"
              description="Try adjusting your filters or create a new ticket."
              action={
                <Link href="/tickets/new">
                  <Button size="sm"><Plus className="h-4 w-4" /> New ticket</Button>
                </Link>
              }
            />
          ) : (
            <DataPanel>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  {canDelete && <TableHead className="w-[60px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="group">
                    <TableCell>
                      <Link href={`/tickets/${ticket.id}`} className="font-mono text-sm font-semibold text-primary hover:underline underline-offset-4">
                        {ticket.ticket_number}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{ticket.subject}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{ticket.contact_name}</div>
                      <div className="text-2xs text-muted-foreground">{ticket.contact_email}</div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide", getStatusColor(ticket.status))}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide", getPriorityColor(ticket.priority))}>
                        {TICKET_PRIORITY_LABELS[ticket.priority]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ticket.owner?.full_name || <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {ticket.due_date ? (
                        <span className={new Date(ticket.due_date) < new Date() && ticket.status !== "closed" ? "text-destructive font-medium" : ""}>
                          {formatDate(ticket.due_date)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelative(ticket.created_at)}</TableCell>
                    {canDelete && (
                      <TableCell>
                        <DeleteTicketButton
                          ticketId={ticket.id}
                          ticketNumber={ticket.ticket_number}
                          subject={ticket.subject}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataPanel>
          )}
        </div>
      </div>
    </>
  );
}
