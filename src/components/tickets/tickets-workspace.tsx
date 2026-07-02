import Link from "next/link";
import { ArrowLeft, Plus, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TicketListPanel } from "@/components/tickets/ticket-list-panel";
import { TicketStatusListView } from "@/components/tickets/ticket-status-list-view";
import { TicketViewsSidebar } from "@/components/tickets/ticket-views-sidebar";
import { TicketPropertiesPanel } from "@/components/tickets/ticket-properties-panel";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import { TicketConversationProvider } from "@/components/tickets/ticket-conversation-context";
import { TicketHeaderActions } from "@/components/tickets/ticket-header-actions";
import { partitionComments } from "@/lib/ticket-conversation";
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
  TicketPinnedMessage,
  SavedTicketView,
} from "@/types";
import { buildTicketsListUrl, buildTicketViewListUrl, type TicketSearchParams } from "@/lib/ticket-url";

interface TicketsWorkspaceProps {
  tickets: Ticket[];
  selectedTicketId?: string | null;
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  currentFilters: TicketSearchParams;
  savedViews?: SavedTicketView[];
  starredSystemViews?: TicketView[];
  customViewCounts?: Record<string, number>;
  activeCustomView?: SavedTicketView | null;
  canDelete: boolean;
  canCreate: boolean;
  profile: Profile;
  ticket?: Ticket | null;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  timeLogs?: TimeLog[];
  history?: TicketHistory[];
  categoriesFull?: { id: string; name: string; subcategories?: { id: string; name: string }[] }[];
  supportEmail?: string;
  pins?: TicketPinnedMessage[];
  listMode?: boolean;
}

export function TicketsWorkspace({
  tickets,
  selectedTicketId,
  view,
  viewCounts,
  agents,
  categories,
  departments = [],
  currentFilters,
  savedViews = [],
  starredSystemViews = [],
  customViewCounts = {},
  activeCustomView = null,
  canDelete,
  canCreate,
  profile,
  ticket,
  comments = [],
  attachments = [],
  timeLogs = [],
  history = [],
  categoriesFull = [],
  supportEmail = "",
  pins = [],
  listMode = false,
}: TicketsWorkspaceProps) {
  const hasSelection = Boolean(ticket);
  const showFullList = listMode && !hasSelection;
  const listBackHref = activeCustomView
    ? buildTicketsListUrl({ ...currentFilters, list: "1" })
    : buildTicketViewListUrl(view);

  return (
    <div className="zoho-tickets flex h-[calc(100vh-var(--top-nav-height))] min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className="hidden shrink-0 lg:flex">
          <TicketViewsSidebar
            view={view}
            viewCounts={viewCounts}
            savedViews={savedViews}
            starredSystemViews={starredSystemViews}
            customViewCounts={customViewCounts}
            activeCustomView={activeCustomView}
            currentFilters={currentFilters}
          />
        </div>

        {showFullList ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TicketStatusListView
              tickets={tickets}
              view={view}
              viewCounts={viewCounts}
              currentFilters={currentFilters}
              savedViews={savedViews}
              starredSystemViews={starredSystemViews}
              activeCustomView={activeCustomView}
            />
          </div>
        ) : (
          <>
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
            departments={departments}
            currentFilters={currentFilters}
            savedViews={savedViews}
            starredSystemViews={starredSystemViews}
            activeCustomView={activeCustomView}
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
              <TicketConversationProvider>
                <TicketPropertiesPanel ticket={ticket} agents={agents} categories={categoriesFull} />

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
                  <div className="border-b border-border px-4 py-3 sm:px-5">
                    <div className="mb-2 lg:hidden">
                      <Link href={listBackHref}>
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
                          {/* <span className="text-[12px] font-medium text-[#555]">
                            Time: {minutesToHHMM(ticket.total_time_minutes || 0)}
                          </span> */}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <TicketHeaderActions
                          ticket={ticket}
                          canDelete={canDelete}
                          hasInternalComments={partitionComments(comments).internalComments.length > 0}
                        />
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
                      supportEmail={supportEmail}
                      pins={pins}
                      variant="zoho"
                    />
                  </div>
                </div>
              </TicketConversationProvider>
            )}
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
}
