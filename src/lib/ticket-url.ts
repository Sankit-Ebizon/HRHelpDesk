import type { TicketFilters, TicketView } from "@/types";

export type TicketSearchParams = {
  view?: string;
  custom_view?: string;
  status?: string;
  owner_id?: string;
  category_id?: string;
  department_id?: string;
  priority?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  list?: string;
};

export function filtersFromSearchParams(params: TicketSearchParams): {
  view: TicketView;
  filters: TicketFilters;
  customViewId?: string;
} {
  const view = (params.view || "all") as TicketView;
  const filters: TicketFilters = {
    status: params.status?.split(",") as never,
    owner_id: params.owner_id,
    category_id: params.category_id,
    department_id: params.department_id,
    priority: params.priority?.split(",") as never,
    search: params.search,
    date_from: params.date_from,
    date_to: params.date_to,
  };
  return { view, filters, customViewId: params.custom_view };
}

export function buildCustomViewUrl(
  customViewId: string,
  baseView: string,
  filters: TicketFilters
): string {
  const params: TicketSearchParams = {
    custom_view: customViewId,
    view: baseView,
    list: "1",
  };
  if (filters.status?.length) params.status = filters.status.join(",");
  if (filters.owner_id) params.owner_id = filters.owner_id;
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.priority?.length) params.priority = filters.priority.join(",");
  if (filters.search) params.search = filters.search;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  return buildTicketsListUrl(params);
}

export function buildTicketsQuery(params: TicketSearchParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const query = sp.toString();
  return query ? `?${query}` : "";
}

export function buildTicketDetailUrl(ticketId: string, params: TicketSearchParams): string {
  return `/tickets/${ticketId}${buildTicketsQuery(params)}`;
}

export function buildTicketsListUrl(params: TicketSearchParams): string {
  return `/tickets${buildTicketsQuery(params)}`;
}

export function buildTicketViewListUrl(view: string): string {
  return `/tickets/views/${view}`;
}

export function buildTicketDetailFromViewUrl(ticketId: string, view: string): string {
  return buildTicketDetailUrl(ticketId, { view });
}

export function buildOwnerTicketsUrl(ownerId: string): string {
  return buildTicketsListUrl({ view: "all", owner_id: ownerId, list: "1" });
}

export function buildOwnerOpenTicketsUrl(ownerId: string): string {
  return buildTicketsListUrl({
    view: "all",
    owner_id: ownerId,
    status: "open,in_progress,on_hold,reopened",
    list: "1",
  });
}

export function buildOwnerOverdueTicketsUrl(ownerId: string): string {
  return buildTicketsListUrl({ view: "overdue", owner_id: ownerId, list: "1" });
}
