import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/sidebar";
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
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DeleteTicketButton } from "@/components/tickets/delete-ticket-button";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import { cn, formatDate, getStatusColor, getPriorityColor, minutesToHHMM } from "@/lib/utils";
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/types";
import { canAccess } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");

  const canDelete = canAccess(ctx.permissions, "tickets", "delete");

  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const [comments, attachments, timeLogs, history, departments, categories, agents] =
    await Promise.all([
      getTicketComments(id),
      getTicketAttachments(id),
      getTicketTimeLogs(id),
      getTicketHistory(id),
      getDepartments(),
      getCategories(),
      getHRAgents(),
    ]);

  return (
    <>
      <AppHeader title={ticket.ticket_number} profile={ctx.profile}>
        <div className="flex items-center gap-2">
          {canDelete && (
            <DeleteTicketButton
              ticketId={ticket.id}
              ticketNumber={ticket.ticket_number}
              subject={ticket.subject}
              variant="button"
            />
          )}
          <Link href="/tickets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Tickets
            </Button>
          </Link>
        </div>
      </AppHeader>

      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{ticket.subject}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {ticket.contact_name} &lt;{ticket.contact_email}&gt;
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", getStatusColor(ticket.status))}>
                {TICKET_STATUS_LABELS[ticket.status]}
              </span>
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", getPriorityColor(ticket.priority))}>
                {TICKET_PRIORITY_LABELS[ticket.priority]}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>Owner: <strong className="text-foreground">{ticket.owner?.full_name || "Unassigned"}</strong></span>
            <span>Category: <strong className="text-foreground">{ticket.category?.name || "—"}</strong></span>
            <span>Due: <strong className="text-foreground">{ticket.due_date ? formatDate(ticket.due_date) : "—"}</strong></span>
            <span>Total Time: <strong className="text-foreground">{minutesToHHMM(ticket.total_time_minutes || 0)}</strong></span>
          </div>
        </div>

        <TicketDetailView
          ticket={ticket}
          comments={comments}
          attachments={attachments}
          timeLogs={timeLogs}
          history={history}
          departments={departments}
          categories={categories}
          agents={agents}
          currentUser={ctx.profile}
        />
      </div>
    </>
  );
}
