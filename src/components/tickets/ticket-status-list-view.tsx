"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Mail, Pencil, Ticket as TicketIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { DeleteCustomViewButton } from "@/components/tickets/custom-view-dialog";
import { TicketViewsDropdown } from "@/components/tickets/ticket-views-dropdown";
import {
  TicketFilterPanel,
  countActiveFilters,
  filtersToTicketFilters,
} from "@/components/tickets/ticket-filters";
import {
  cn,
  formatDate,
  formatTicketListDate,
  getInitials,
  getPriorityColor,
  getStatusColor,
} from "@/lib/utils";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_VIEWS,
  type SavedTicketView,
  type Ticket,
  type TicketView,
} from "@/types";
import {
  buildTicketDetailFromViewUrl,
  buildTicketDetailUrl,
  buildTicketsQuery,
  type TicketSearchParams,
} from "@/lib/ticket-url";

interface TicketStatusListViewProps {
  tickets: Ticket[];
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  agents?: { id: string; full_name: string }[];
  categories?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  currentFilters: TicketSearchParams;
  savedViews?: SavedTicketView[];
  starredSystemViews?: TicketView[];
  activeCustomView?: SavedTicketView | null;
}

export function TicketStatusListView({
  tickets,
  view,
  viewCounts,
  agents = [],
  categories = [],
  departments = [],
  currentFilters,
  savedViews = [],
  starredSystemViews = [],
  activeCustomView,
}: TicketStatusListViewProps) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const currentView = TICKET_VIEWS.find((item) => item.id === view) ?? TICKET_VIEWS[2];
  const title = activeCustomView?.name ?? currentView.label;
  const activeFilterCount = countActiveFilters(currentFilters);
  const ticketFilters = filtersToTicketFilters(currentFilters);
  const createViewHref = `/tickets/views/custom/new${buildTicketsQuery(currentFilters)}`;

  function ticketHref(ticketId: string) {
    if (activeCustomView && currentFilters) {
      return buildTicketDetailUrl(ticketId, currentFilters);
    }
    return buildTicketDetailFromViewUrl(ticketId, view);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <TicketViewsDropdown
            view={view}
            viewCounts={viewCounts}
            currentFilters={currentFilters}
            savedViews={savedViews}
            starredSystemViews={starredSystemViews}
            activeCustomView={activeCustomView}
            variant="status-list"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-[#555]">
            Total Count: <span className="tabular-nums text-[#222]">{tickets.length}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 text-[#444] hover:text-[#222]"
            onClick={() => setFilterOpen((open) => !open)}
            aria-label={filterOpen ? "Close filters" : "Open filters"}
          >
            <Filter className="h-4 w-4" />
            {!filterOpen && activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount > 9 ? "9+" : activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {filterOpen && (
        <>
          <div
            className="absolute inset-0 z-20 bg-black/20"
            onClick={() => setFilterOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[320px] flex-col border-l border-border bg-white shadow-lg">
            <div className="flex-1 overflow-y-auto">
              <TicketFilterPanel
                agents={agents}
                categories={categories}
                departments={departments}
                currentFilters={currentFilters}
                ticketFilters={ticketFilters}
                baseView={view}
                onClose={() => setFilterOpen(false)}
                onSaveAsView={() => router.push(createViewHref)}
              />
            </div>
          </div>
        </>
      )}

      {activeCustomView && (
        <div className="flex items-center gap-1 border-b border-border px-4 py-1.5 sm:px-6">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href={`/tickets/views/custom/${activeCustomView.id}/edit`}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Link>
          </Button>
          <DeleteCustomViewButton view={activeCustomView} />
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-8">
          <EmptyState
            icon={TicketIcon}
            title={`No ${title.toLowerCase()}`}
            description={activeCustomView ? "No tickets match this custom view." : currentView.description}
          />
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {tickets.map((ticket) => {
            const isOverdue =
              ticket.due_date &&
              new Date(ticket.due_date) < new Date() &&
              ticket.status !== "closed";

            return (
              <li key={ticket.id}>
                <Link
                  href={ticketHref(ticket.id)}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f8fbff] sm:px-6 sm:py-3.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-[#444]">
                    <Mail className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#222]">{ticket.subject}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[#555]">
                      {ticket.ticket_number}
                      {ticket.contact_name ? ` · ${ticket.contact_name}` : ""}
                      {ticket.department?.name ? ` · ${ticket.department.name}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#777]">
                      {formatTicketListDate(ticket.created_at)}
                      {ticket.due_date && (
                        <>
                          {" · Due "}
                          <span className={isOverdue ? "font-medium text-red-600" : ""}>
                            {formatDate(ticket.due_date, "dd MMM hh:mm a")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-[#555]">Status</span>
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
                          getStatusColor(ticket.status)
                        )}
                      >
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <span className="text-[11px] font-medium text-[#555]">Priority</span>
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
                          getPriorityColor(ticket.priority)
                        )}
                      >
                        {TICKET_PRIORITY_LABELS[ticket.priority]}
                      </span>
                    </div>
                    <div className="flex min-w-[7rem] items-center gap-1.5">
                      {ticket.owner ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-[10px] font-semibold text-[#333]"
                            title={ticket.owner.full_name}
                          >
                            {getInitials(ticket.owner.full_name).charAt(0)}
                          </span>
                          <span className="truncate text-[12px] font-medium text-[#333]">
                            {ticket.owner.full_name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[12px] font-medium text-[#888]">Not assigned yet</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
