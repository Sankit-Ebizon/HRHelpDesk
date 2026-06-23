import Link from "next/link";
import { ArrowLeft, Plus, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TicketListPanel } from "@/components/tickets/ticket-list-panel";
import { TicketPropertiesPanel } from "@/components/tickets/ticket-properties-panel";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import { DeleteTicketButton } from "@/components/tickets/delete-ticket-button";
import { cn, formatDateTime, getPriorityColor, getStatusColor, minutesToHHMM } from "@/lib/utils";
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "@/types";
import type {
  Profile,
  Ticket,
  TicketComment,
  TicketAttachment,
  TimeLog,
  TicketHistory,
  TicketView,
} from "@/types";
import { buildTicketViewListUrl, type TicketSearchParams } from "@/lib/ticket-url";

interface TicketsWorkspaceProps {
  tickets: Ticket[];
  selectedTicketId?: string | null;
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  currentFilters: TicketSearchParams;
  canDelete: boolean;
  canCreate: boolean;
  profile: Profile;
  ticket?: Ticket | null;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  timeLogs?: TimeLog[];
  history?: TicketHistory[];
  departments?: { id: string; name: string }[];
  categoriesFull?: { id: string; name: string; subcategories?: { id: string; name: string }[] }[];
}

export function TicketsWorkspace({
  tickets,
  selectedTicketId,
  view,
  viewCounts,
  agents,
  categories,
  currentFilters,
  canDelete,
  canCreate,
  profile,
  ticket,
  comments = [],
  attachments = [],
  timeLogs = [],
  history = [],
  departments = [],
  categoriesFull = [],
}: TicketsWorkspaceProps) {
  const hasSelection = Boolean(ticket);

  return (
    <div className="zoho-tickets flex h-[calc(100vh-var(--top-nav-height))] min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "shrink-0",
            hasSelection ? "hidden lg:flex lg:w-[280px]" : "flex w-full lg:w-[280px]"
          )}
        >
          <TicketListPanel
            tickets={tickets}
            selectedTicketId={selectedTicketId}
            view={view}
            viewCounts={viewCounts}
            agents={agents}
            categories={categories}
            currentFilters={currentFilters}
            canCreate={canCreate}
          />
        </div>

        {!hasSelection ? (
          <div className="hidden flex-1 items-center justify-center bg-white p-8 lg:flex">
            {tickets.length === 0 ? (
              <EmptyState
                icon={TicketIcon}
                title="No tickets found"
                description="Try adjusting your filters or create a new ticket."
                action={
                  canCreate ? (
                    <Button asChild size="sm" className="zoho-btn-primary h-8 px-4">
                      <Link href="/tickets/new">
                        <Plus className="h-4 w-4" />
                        New Ticket
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <p className="text-[13px] font-medium text-[#444]">Select a ticket from the list to view details.</p>
            )}
          </div>
        ) : (
          <>
            {ticket && (
              <>
                <TicketPropertiesPanel ticket={ticket} agents={agents} />

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
                  <div className="border-b border-border px-4 py-3 sm:px-5">
                    <div className="mb-2 lg:hidden">
                      <Link href={buildTicketViewListUrl(view)}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-[13px] font-medium text-[#444] hover:text-[#222]">
                          <ArrowLeft className="mr-1 h-4 w-4" />
                          All tickets
                        </Button>
                      </Link>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h1 className="text-[15px] font-bold leading-snug text-[#222] sm:text-base">
                          {ticket.subject}
                        </h1>
                        <p className="mt-1 text-[12px] font-medium text-[#444]">
                          {ticket.ticket_number} · {ticket.contact_name} · {formatDateTime(ticket.created_at)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
                              getStatusColor(ticket.status)
                            )}
                          >
                            {TICKET_STATUS_LABELS[ticket.status]}
                          </span>
                          <span
                            className={cn(
                              "inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
                              getPriorityColor(ticket.priority)
                            )}
                          >
                            {TICKET_PRIORITY_LABELS[ticket.priority]}
                          </span>
                          <span className="text-[12px] font-medium text-[#555]">
                            Time: {minutesToHHMM(ticket.total_time_minutes || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {canDelete && (
                          <DeleteTicketButton
                            ticketId={ticket.id}
                            ticketNumber={ticket.ticket_number}
                            subject={ticket.subject}
                            variant="button"
                          />
                        )}
                        {canCreate && (
                          <Button asChild size="sm" className="zoho-btn-primary h-8 px-3">
                            <Link href="/tickets/new">
                              <Plus className="h-4 w-4" />
                              New Ticket
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
                    <TicketDetailView
                      ticket={ticket}
                      comments={comments}
                      attachments={attachments}
                      timeLogs={timeLogs}
                      history={history}
                      departments={departments}
                      categories={categoriesFull}
                      agents={agents}
                      currentUser={profile}
                      variant="zoho"
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
