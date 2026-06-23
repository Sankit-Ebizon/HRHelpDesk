"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildOwnerOpenTicketsUrl,
  buildOwnerOverdueTicketsUrl,
  buildOwnerTicketsUrl,
  buildTicketDetailUrl,
} from "@/lib/ticket-url";
import { cn, formatRelative, getInitials, getStatusColor } from "@/lib/utils";
import {
  TICKET_STATUS_LABELS,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type Profile,
  type TicketStatus,
} from "@/types";

interface OwnerListItem {
  id: string;
  full_name: string;
  email: string;
}

interface RecentTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
}

interface TicketOwnerDetailViewProps {
  owner: Profile & { last_login_at?: string | null };
  owners: OwnerListItem[];
  stats: { open: number; total: number; overdue: number };
  recentTickets: RecentTicket[];
  canCreate: boolean;
}

type PropertyItem = { label: string; value: React.ReactNode };

function formatDateTime(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy hh:mm a");
  } catch {
    return "—";
  }
}

function PropertyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1 border-b border-zinc-100 py-3 last:border-b-0">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <div className="text-[13px] text-zinc-900">{value}</div>
    </div>
  );
}

function buildProperties(owner: Profile & { last_login_at?: string | null }): PropertyItem[] {
  const items: PropertyItem[] = [
    { label: "Email", value: owner.email },
    {
      label: "Role",
      value: (
        <Badge variant="secondary">{USER_ROLE_LABELS[owner.role] || owner.role}</Badge>
      ),
    },
  ];

  if (owner.department?.name) {
    items.push({ label: "Department", value: owner.department.name });
  }

  items.push({ label: "Status", value: USER_STATUS_LABELS[owner.status] });

  if (owner.country_locale) {
    items.push({ label: "Country / Locale", value: owner.country_locale });
  }

  if (owner.timezone) {
    items.push({ label: "Timezone", value: owner.timezone });
  }

  items.push({ label: "Member Since", value: formatDateTime(owner.created_at) });

  if (owner.last_login_at) {
    items.push({ label: "Last Login", value: formatDateTime(owner.last_login_at) });
  }

  return items;
}

function OwnerListSidebar({
  owners,
  activeOwnerId,
}: {
  owners: OwnerListItem[];
  activeOwnerId: string;
}) {
  return (
    <aside className="hidden w-52 shrink-0 border-r border-zinc-200 bg-zinc-50/40 md:flex md:flex-col lg:w-56">
      <div className="border-b border-zinc-200 px-4 py-3">
        <p className="text-[12px] font-semibold text-zinc-700">Ticket Owners</p>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {owners.map((item) => {
          const isActive = item.id === activeOwnerId;
          return (
            <Link
              key={item.id}
              href={`/ticket-owners/${item.id}`}
              className={cn(
                "block border-b border-zinc-100 px-4 py-3 transition-colors",
                isActive
                  ? "border-l-2 border-l-[#1a73b5] bg-white"
                  : "border-l-2 border-l-transparent hover:bg-white/80"
              )}
            >
              <p
                className={cn(
                  "truncate text-[13px] font-medium",
                  isActive ? "text-[#1a73b5]" : "text-zinc-800"
                )}
              >
                {item.full_name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">{item.email}</p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function OwnerPropertiesPanel({
  properties,
  className,
}: {
  properties: PropertyItem[];
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "shrink-0 border-zinc-200 bg-white",
        className
      )}
    >
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-[12px] font-semibold text-zinc-800">Owner Properties</h2>
      </div>
      <div className="px-4 py-1">
        {properties.map((property) => (
          <PropertyRow key={property.label} label={property.label} value={property.value} />
        ))}
      </div>
    </aside>
  );
}

export function TicketOwnerDetailView({
  owner,
  owners,
  stats,
  recentTickets,
  canCreate,
}: TicketOwnerDetailViewProps) {
  const properties = buildProperties(owner);
  const ticketsUrl = buildOwnerTicketsUrl(owner.id);

  return (
    <div className="min-h-full w-full bg-white">
      <div className="border-b border-zinc-200 px-4 py-2.5 md:hidden">
        <Link
          href="/ticket-owners"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#1a73b5] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Ticket Owners
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-8rem)] w-full flex-col md:flex-row">
        <OwnerListSidebar owners={owners} activeOwnerId={owner.id} />

        <div className="flex min-w-0 flex-1 flex-col md:flex-row">
          <OwnerPropertiesPanel
            properties={properties}
            className="border-b md:w-52 md:border-b-0 md:border-r lg:w-64"
          />

          <main className="min-w-0 flex-1">
            <div className="border-b border-zinc-200 px-4 py-4 sm:px-5">
              <div className="mb-3 md:hidden">
                <Select
                  value={owner.id}
                  onValueChange={(value) => {
                    window.location.href = `/ticket-owners/${value}`;
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a73b5]/10 text-sm font-semibold text-[#1a73b5]">
                    {getInitials(owner.full_name)}
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-zinc-900">{owner.full_name}</h1>
                    <p className="text-xs text-zinc-500">{owner.email}</p>
                  </div>
                </div>
                {canCreate && (
                  <Button asChild size="sm">
                    <Link href={`/tickets/new?owner_id=${owner.id}`}>
                      <Plus className="h-4 w-4 mr-2 text-white" />
                      <span className="text-white">Add Ticket</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="border-b border-zinc-200 px-4 sm:px-5">
              <nav className="flex gap-5 overflow-x-auto">
                <span className="shrink-0 border-b-2 border-[#1a73b5] px-1 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#1a73b5]">
                  Overview
                </span>
                {/* <Link
                  href={ticketsUrl}
                  className="shrink-0 border-b-2 border-transparent px-1 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 transition-colors hover:text-zinc-800"
                >
                  Tickets
                </Link> */}
              </nav>
            </div>

            <div className="space-y-6 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  href={ticketsUrl}
                  className="rounded-lg border bg-zinc-50/50 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    All Tickets
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">{stats.total}</p>
                </Link>
                <Link
                  href={buildOwnerOpenTicketsUrl(owner.id)}
                  className="rounded-lg border bg-zinc-50/50 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Open Tickets
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">{stats.open}</p>
                </Link>
                <Link
                  href={buildOwnerOverdueTicketsUrl(owner.id)}
                  className="rounded-lg border bg-zinc-50/50 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Overdue Tickets
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">{stats.overdue}</p>
                </Link>
              </div>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-800">Tickets</h3>
                  <Link href={ticketsUrl} className="text-[13px] text-[#1a73b5] hover:underline">
                    View all
                  </Link>
                </div>

                {recentTickets.length > 0 ? (
                  <div className="divide-y rounded-lg border">
                    {recentTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={buildTicketDetailUrl(ticket.id, {
                          view: "all",
                          owner_id: owner.id,
                          list: "1",
                        })}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {ticket.subject}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {ticket.ticket_number} · {formatRelative(ticket.created_at)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                            getStatusColor(ticket.status)
                          )}
                        >
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border px-4 py-8 text-center text-sm text-zinc-500">
                    No tickets assigned to this owner yet.
                  </p>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
