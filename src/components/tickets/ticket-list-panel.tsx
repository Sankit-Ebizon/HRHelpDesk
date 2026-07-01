"use client";

import Link from "next/link";
import { useState } from "react";
import { Filter, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatTicketListDate, getInitials, getStatusColor } from "@/lib/utils";
import {
  TICKET_STATUS_LABELS,
  type SavedTicketView,
  type Ticket,
  type TicketView,
} from "@/types";
import { TicketFilterPanel, countActiveFilters, filtersToTicketFilters } from "@/components/tickets/ticket-filters";
import { DeleteCustomViewButton } from "@/components/tickets/custom-view-dialog";
import { TicketViewsDropdown } from "@/components/tickets/ticket-views-dropdown";
import { useRouter } from "next/navigation";
import { buildTicketDetailUrl, buildTicketsQuery, type TicketSearchParams } from "@/lib/ticket-url";

interface TicketListPanelProps {
  tickets: Ticket[];
  selectedTicketId?: string | null;
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  currentFilters: TicketSearchParams;
  savedViews?: SavedTicketView[];
  activeCustomView?: SavedTicketView | null;
  starredSystemViews?: TicketView[];
  canCreate?: boolean;
}

export function TicketListPanel({
  tickets,
  selectedTicketId,
  view,
  viewCounts,
  agents,
  categories,
  departments = [],
  currentFilters,
  savedViews = [],
  activeCustomView,
  starredSystemViews = [],
  canCreate,
}: TicketListPanelProps) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const createViewHref = `/tickets/views/custom/new${buildTicketsQuery(currentFilters)}`;

  const activeFilterCount = countActiveFilters(currentFilters);
  const ticketFilters = filtersToTicketFilters(currentFilters);

  return (
    <aside className="relative flex h-full w-full shrink-0 flex-col border-r border-border bg-[#f5f7f9] lg:w-[280px]">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-white px-3 py-2.5">
        <TicketViewsDropdown
          view={view}
          viewCounts={viewCounts}
          currentFilters={currentFilters}
          savedViews={savedViews}
          starredSystemViews={starredSystemViews}
          activeCustomView={activeCustomView}
          listCount={tickets.length}
          variant="panel"
        />

        <div className="flex shrink-0 items-center gap-1">
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
          {canCreate && (
            <Button asChild size="sm" className="zoho-btn-primary h-8 w-8 shrink-0 p-0">
              <Link href="/tickets/new" aria-label="New ticket" title="New Ticket">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {activeCustomView && (
        <div className="flex items-center gap-1 border-b border-border bg-white px-3 py-1.5">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href={`/tickets/views/custom/${activeCustomView.id}/edit`}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Link>
          </Button>
          <DeleteCustomViewButton view={activeCustomView} />
        </div>
      )}

      {filterOpen && (
        <div className="absolute inset-y-0 left-0 z-20 flex w-full max-w-[280px] flex-col border-r border-border bg-white shadow-lg lg:relative lg:max-w-none lg:shadow-none">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[13px] font-semibold text-[#222]">Filters</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilterOpen(false)}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
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
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {tickets.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] font-medium text-[#444]">No tickets in this view.</p>
        ) : (
          <ul className="space-y-1.5">
            {tickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicketId;
              const href = buildTicketDetailUrl(ticket.id, { ...currentFilters, view });

              return (
                <li key={ticket.id}>
                  <Link
                    href={href}
                    className={cn(
                      "block rounded border px-3 py-2.5 transition-colors",
                      isSelected
                        ? "border-[#c5d9f0] bg-white shadow-sm"
                        : "border-transparent bg-white/70 hover:border-border hover:bg-white"
                    )}
                  >
                    <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[#222]">
                      {ticket.subject}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-medium text-[#444]">
                      {ticket.ticket_number} · {ticket.contact_name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#555]">
                        {formatTicketListDate(ticket.created_at)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          getStatusColor(ticket.status)
                        )}
                      >
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                    {ticket.owner && (
                      <div className="mt-2 flex items-center justify-end">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8eef5] text-[10px] font-semibold text-[#333]"
                          title={ticket.owner.full_name}
                        >
                          {getInitials(ticket.owner.full_name).charAt(0)}
                        </span>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
