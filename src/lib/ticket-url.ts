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
