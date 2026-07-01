import type { TicketFilters } from "@/types";

export type TicketFilterField =
  | "status"
  | "priority"
  | "owner_id"
  | "department_id"
  | "category_id"
  | "search"
  | "date_from"
  | "date_to";

export type TicketFilterOperator = "is" | "is_not" | "contains";

export interface TicketFilterRow {
  id: string;
  field: TicketFilterField | "";
  operator: TicketFilterOperator;
  value: string;
}

export const TICKET_FILTER_FIELD_LABELS: Record<TicketFilterField, string> = {
  status: "Status",
  priority: "Priority",
  owner_id: "Assignee",
  department_id: "Department",
  category_id: "Category",
  search: "Search",
  date_from: "Created From",
  date_to: "Created To",
};

export const TICKET_FILTER_OPERATORS: Record<
  TicketFilterField,
  { value: TicketFilterOperator; label: string }[]
> = {
  status: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  priority: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  owner_id: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  department_id: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  category_id: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  search: [{ value: "contains", label: "contains" }],
  date_from: [{ value: "is", label: "on or after" }],
  date_to: [{ value: "is", label: "on or before" }],
};

export function createEmptyFilterRow(): TicketFilterRow {
  return {
    id: crypto.randomUUID(),
    field: "",
    operator: "is",
    value: "",
  };
}

export function filtersToRows(filters: TicketFilters): TicketFilterRow[] {
  const rows: TicketFilterRow[] = [];

  for (const status of filters.status || []) {
    rows.push({
      id: crypto.randomUUID(),
      field: "status",
      operator: "is",
      value: status,
    });
  }

  for (const priority of filters.priority || []) {
    rows.push({
      id: crypto.randomUUID(),
      field: "priority",
      operator: "is",
      value: priority,
    });
  }

  if (filters.owner_id) {
    rows.push({
      id: crypto.randomUUID(),
      field: "owner_id",
      operator: "is",
      value: filters.owner_id,
    });
  }

  if (filters.department_id) {
    rows.push({
      id: crypto.randomUUID(),
      field: "department_id",
      operator: "is",
      value: filters.department_id,
    });
  }

  if (filters.category_id) {
    rows.push({
      id: crypto.randomUUID(),
      field: "category_id",
      operator: "is",
      value: filters.category_id,
    });
  }

  if (filters.search) {
    rows.push({
      id: crypto.randomUUID(),
      field: "search",
      operator: "contains",
      value: filters.search,
    });
  }

  if (filters.date_from) {
    rows.push({
      id: crypto.randomUUID(),
      field: "date_from",
      operator: "is",
      value: filters.date_from.slice(0, 10),
    });
  }

  if (filters.date_to) {
    rows.push({
      id: crypto.randomUUID(),
      field: "date_to",
      operator: "is",
      value: filters.date_to.slice(0, 10),
    });
  }

  return rows.length > 0 ? rows : [createEmptyFilterRow()];
}

export function rowsToFilters(rows: TicketFilterRow[]): TicketFilters {
  const filters: TicketFilters = {};
  const statuses: string[] = [];
  const priorities: string[] = [];

  for (const row of rows) {
    if (!row.field || !row.value.trim()) continue;

    switch (row.field) {
      case "status":
        if (row.operator === "is") statuses.push(row.value);
        break;
      case "priority":
        if (row.operator === "is") priorities.push(row.value);
        break;
      case "owner_id":
        if (row.operator === "is") filters.owner_id = row.value;
        break;
      case "department_id":
        if (row.operator === "is") filters.department_id = row.value;
        break;
      case "category_id":
        if (row.operator === "is") filters.category_id = row.value;
        break;
      case "search":
        filters.search = row.value.trim();
        break;
      case "date_from":
        filters.date_from = row.value;
        break;
      case "date_to":
        filters.date_to = row.value;
        break;
    }
  }

  if (statuses.length) filters.status = statuses as TicketFilters["status"];
  if (priorities.length) filters.priority = priorities as TicketFilters["priority"];

  return filters;
}
