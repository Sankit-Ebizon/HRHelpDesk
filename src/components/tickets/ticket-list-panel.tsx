"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Filter, Plus } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn, formatTicketListDate, getInitials, getStatusColor } from "@/lib/utils";
import { TICKET_STATUS_LABELS, TICKET_VIEWS, type Ticket, type TicketView } from "@/types";
import { buildTicketDetailUrl, buildTicketsListUrl, type TicketSearchParams } from "@/lib/ticket-url";
import { TicketFilterPanel, countActiveFilters } from "@/components/tickets/ticket-filters";

interface TicketListPanelProps {
  tickets: Ticket[];
  selectedTicketId?: string | null;
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  currentFilters: TicketSearchParams;
  canCreate?: boolean;
}

export function TicketListPanel({
  tickets,
  selectedTicketId,
  view,
  viewCounts,
  agents,
  categories,
  currentFilters,
  canCreate,
}: TicketListPanelProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = countActiveFilters(currentFilters);
  const currentView = TICKET_VIEWS.find((v) => v.id === view) ?? TICKET_VIEWS[2];

  return (
    <aside className="relative flex h-full w-full shrink-0 flex-col border-r border-border bg-[#f5f7f9] lg:w-[280px]">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-white px-3 py-2.5">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1 text-left text-[13px] font-semibold text-[#222]"
            >
              <span className="truncate">{currentView.label}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#444]" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={4}
              className="z-50 min-w-[14rem] rounded border border-border bg-white p-1 shadow-md"
            >
              {TICKET_VIEWS.map((v) => (
                <DropdownMenu.Item key={v.id} asChild>
                  <Link
                    href={buildTicketsListUrl({ ...currentFilters, view: v.id })}
                    className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                  >
                    <span>{v.label}</span>
                    <span className="text-xs tabular-nums text-[#555]">{viewCounts[v.id]}</span>
                  </Link>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

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
              currentFilters={currentFilters}
              onClose={() => setFilterOpen(false)}
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
