export type ReportType =
  | "tickets-created"
  | "tickets-closed"
  | "open-tickets"
  | "overdue-tickets"
  | "avg-resolution-time"
  | "time-logged-hr"
  | "category-analysis";

export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
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
    description: "Current snapshot of all open tickets",
    usesDateRange: false,
  },
  {
    id: "overdue-tickets",
    label: "Overdue Tickets",
    description: "Current snapshot of tickets past their due date",
    usesDateRange: false,
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
    id: "category-analysis",
    label: "Category-wise Analysis",
    description: "Ticket breakdown by category for the selected date range",
    usesDateRange: true,
  },
];
