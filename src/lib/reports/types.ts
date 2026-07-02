export type ReportType =
  | "tickets-created"
  | "tickets-closed"
  | "open-tickets"
  | "overdue-tickets"
  | "avg-resolution-time"
  | "time-logged-hr"
  | "timesheet-agent"
  | "category-analysis";

export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
}

export interface ReportFilters {
  contact_name?: string;
  contact_email?: string;
  owner_ids?: string[];
  category_id?: string;
  department_id?: string;
  timesheet_agent_id?: string;
}

export function hasTicketFilters(filters?: ReportFilters): boolean {
  if (!filters) return false;
  return Boolean(
    filters.contact_name ||
      filters.contact_email ||
      (filters.owner_ids && filters.owner_ids.length > 0) ||
      filters.category_id ||
      filters.department_id
  );
}

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: Record<string, string | number>;
}

export interface ReportDefinition {
  id: ReportType;
  label: string;
  description: string;
  usesDateRange: boolean;
}

export interface CustomReportConfig {
  name: string;
  moduleId: string;
  joinId?: string;
  fields: string[];
  dateFrom?: string;
  dateTo?: string;
  filters?: ReportFilters;
}

export function getDefaultDateRange(): ReportDateRange {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);

  return {
    dateFrom: dateFrom.toISOString().split("T")[0],
    dateTo: dateTo.toISOString().split("T")[0],
  };
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "tickets-created",
    label: "Tickets Created",
    description: "Tickets created within the selected date range",
    usesDateRange: true,
  },
  {
    id: "tickets-closed",
    label: "Tickets Closed",
    description: "Tickets closed within the selected date range",
    usesDateRange: true,
  },
  {
    id: "open-tickets",
    label: "Open Tickets",
    description: "Open tickets within the selected date range",
    usesDateRange: true,
  },
  {
    id: "overdue-tickets",
    label: "Overdue Tickets",
    description: "Overdue tickets within the selected due date range",
    usesDateRange: true,
  },
  {
    id: "avg-resolution-time",
    label: "Average Resolution Time",
    description: "Resolution time for tickets closed in the selected date range",
    usesDateRange: true,
  },
  {
    id: "time-logged-hr",
    label: "Time Logged by HR Users",
    description: "Time log entries by HR team members in the selected date range",
    usesDateRange: true,
  },
  {
    id: "timesheet-agent",
    label: "Timesheet (Agent)",
    description: "Per-agent timesheet for the selected date range (defaults to previous week)",
    usesDateRange: true,
  },
  {
    id: "category-analysis",
    label: "Category-wise Analysis",
    description: "Ticket breakdown by category for the selected date range",
    usesDateRange: true,
  },
];
