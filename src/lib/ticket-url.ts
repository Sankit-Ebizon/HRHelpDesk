export type TicketSearchParams = {
  view?: string;
  status?: string;
  owner_id?: string;
  category_id?: string;
  priority?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  list?: string;
};

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
