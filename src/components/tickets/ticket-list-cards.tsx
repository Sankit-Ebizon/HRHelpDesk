import Link from "next/link";
import { cn, formatDate, formatRelative, getPriorityColor, getStatusColor } from "@/lib/utils";
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, type Ticket } from "@/types";
import { DeleteTicketButton } from "@/components/tickets/delete-ticket-button";

interface TicketListCardsProps {
  tickets: Ticket[];
  canDelete?: boolean;
}

export function TicketListCards({ tickets, canDelete }: TicketListCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {tickets.map((ticket) => {
        const isOverdue =
          ticket.due_date &&
          new Date(ticket.due_date) < new Date() &&
          ticket.status !== "closed";

        return (
          <div
            key={ticket.id}
            className="relative overflow-hidden rounded-2xl glass-panel p-4 transition-all hover-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <Link href={`/tickets/${ticket.id}`} className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold text-primary">{ticket.ticket_number}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{ticket.subject}</p>
              </Link>
              {canDelete && (
                <DeleteTicketButton
                  ticketId={ticket.id}
                  ticketNumber={ticket.ticket_number}
                  subject={ticket.subject}
                />
              )}
            </div>

            <Link href={`/tickets/${ticket.id}`} className="mt-3 block">
              <div className="text-sm font-medium">{ticket.contact_name}</div>
              <div className="truncate text-2xs text-muted-foreground">{ticket.contact_email}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide",
                    getStatusColor(ticket.status)
                  )}
                >
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide",
                    getPriorityColor(ticket.priority)
                  )}
                >
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-2xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground/70">Owner:</span>{" "}
                  {ticket.owner?.full_name || "Unassigned"}
                </p>
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    <span className="font-medium text-foreground/70">Due:</span>{" "}
                    {ticket.due_date ? (
                      <span className={isOverdue ? "font-medium text-destructive" : ""}>
                        {formatDate(ticket.due_date)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span>
                    <span className="font-medium text-foreground/70">Created:</span>{" "}
                    {formatRelative(ticket.created_at)}
                  </span>
                </p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
