"use client";

import Link from "next/link";
import { ChevronDown, Mail, Ticket as TicketIcon } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
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
  type Ticket,
  type TicketView,
} from "@/types";
import { buildTicketDetailFromViewUrl, buildTicketViewListUrl } from "@/lib/ticket-url";

interface TicketStatusListViewProps {
  tickets: Ticket[];
  view: TicketView;
  viewCounts: Record<TicketView, number>;
}

export function TicketStatusListView({
  tickets,
  view,
  viewCounts,
}: TicketStatusListViewProps) {
  const currentView = TICKET_VIEWS.find((item) => item.id === view) ?? TICKET_VIEWS[2];

  return (
    <div className="min-h-full bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 text-left text-[15px] font-semibold text-[#222]"
              >
                <span className="truncate">{currentView.label}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#555]" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={4}
                className="z-50 min-w-[14rem] rounded border border-border bg-white p-1 shadow-md"
              >
                {TICKET_VIEWS.map((item) => (
                  <DropdownMenu.Item key={item.id} asChild>
                    <Link
                      href={buildTicketViewListUrl(item.id)}
                      className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                    >
                      <span>{item.label}</span>
                      <span className="text-xs tabular-nums text-[#555]">{viewCounts[item.id]}</span>
                    </Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-[#555]">
            Total Count: <span className="tabular-nums text-[#222]">{tickets.length}</span>
          </span>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={TicketIcon}
            title={`No ${currentView.label.toLowerCase()}`}
            description={currentView.description}
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {tickets.map((ticket) => {
            const isOverdue =
              ticket.due_date &&
              new Date(ticket.due_date) < new Date() &&
              ticket.status !== "closed";

            return (
              <li key={ticket.id}>
                <Link
                  href={buildTicketDetailFromViewUrl(ticket.id, view)}
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
                    {ticket.owner ? (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8eef5] text-[10px] font-semibold text-[#333]"
                        title={ticket.owner.full_name}
                      >
                        {getInitials(ticket.owner.full_name).charAt(0)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[#888]">—</span>
                    )}
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
