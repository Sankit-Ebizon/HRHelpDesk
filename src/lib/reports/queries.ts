import { createClient } from "@/lib/supabase/server";
import type { ReportDateRange, ReportResult, ReportType } from "./types";

const HR_ROLES = ["administrator", "hr_manager", "hr_agent"];

const TICKET_LIST_SELECT = `
  ticket_number, subject, status, priority, contact_name, contact_email,
  created_at, due_date, closed_at,
  owner:profiles!tickets_owner_id_fkey(full_name),
  category:categories(name),
  department:departments(name)
`;

type NestedRecord = Record<string, unknown>;

function nestedName(value: unknown): string {
  if (!value || typeof value !== "object") return "—";
  const obj = value as NestedRecord;
  if (typeof obj.full_name === "string") return obj.full_name;
  if (typeof obj.name === "string") return obj.name;
  return "—";
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function formatDateTime(value: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

function resolutionHours(createdAt: unknown, closedAt: unknown): number | null {
  if (!createdAt || !closedAt) return null;
  const hours =
    (new Date(String(closedAt)).getTime() - new Date(String(createdAt)).getTime()) / 3600000;
  return Math.round(hours * 10) / 10;
}

function daysOverdue(dueDate: unknown): number | null {
  if (!dueDate) return null;
  const diff = new Date().getTime() - new Date(String(dueDate)).getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function mapTicketRow(row: NestedRecord): Record<string, unknown> {
  return {
    ticket_number: row.ticket_number ?? "—",
    subject: row.subject ?? "—",
    status: row.status ?? "—",
    priority: row.priority ?? "—",
    contact_name: row.contact_name ?? "—",
    contact_email: row.contact_email ?? "—",
    owner: nestedName(row.owner),
    category: nestedName(row.category),
    department: nestedName(row.department),
    created_at: formatDateTime(row.created_at),
    due_date: formatDate(row.due_date),
    closed_at: formatDateTime(row.closed_at),
    resolution_hours: resolutionHours(row.created_at, row.closed_at) ?? "—",
    days_overdue: daysOverdue(row.due_date) ?? "—",
  };
}

const TICKET_COLUMNS = [
  { key: "ticket_number", label: "Ticket ID" },
  { key: "subject", label: "Subject" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "contact_name", label: "Contact Name" },
  { key: "contact_email", label: "Contact Email" },
  { key: "owner", label: "Owner" },
  { key: "category", label: "Category" },
  { key: "department", label: "Department" },
  { key: "created_at", label: "Created" },
  { key: "due_date", label: "Due Date" },
  { key: "closed_at", label: "Closed" },
];

async function getTicketsCreatedReport(dateRange: ReportDateRange): Promise<ReportResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .gte("created_at", dateRange.dateFrom)
    .lte("created_at", `${dateRange.dateTo}T23:59:59.999Z`)
    .order("created_at", { ascending: false });

  return {
    columns: TICKET_COLUMNS,
    rows: (data || []).map((row) => mapTicketRow(row as NestedRecord)),
  };
}

async function getTicketsClosedReport(dateRange: ReportDateRange): Promise<ReportResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .eq("status", "closed")
    .gte("closed_at", dateRange.dateFrom)
    .lte("closed_at", `${dateRange.dateTo}T23:59:59.999Z`)
    .order("closed_at", { ascending: false });

  return {
    columns: [
      ...TICKET_COLUMNS,
      { key: "resolution_hours", label: "Resolution (hrs)" },
    ],
    rows: (data || []).map((row) => mapTicketRow(row as NestedRecord)),
  };
}

async function getOpenTicketsReport(): Promise<ReportResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .in("status", ["open", "in_progress", "on_hold", "reopened"])
    .order("created_at", { ascending: false });

  return {
    columns: TICKET_COLUMNS,
    rows: (data || []).map((row) => mapTicketRow(row as NestedRecord)),
  };
}

async function getOverdueTicketsReport(): Promise<ReportResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .lt("due_date", new Date().toISOString())
    .not("status", "eq", "closed")
    .order("due_date", { ascending: true });

  return {
    columns: [
      ...TICKET_COLUMNS,
      { key: "days_overdue", label: "Days Overdue" },
    ],
    rows: (data || []).map((row) => mapTicketRow(row as NestedRecord)),
  };
}

async function getAvgResolutionTimeReport(dateRange: ReportDateRange): Promise<ReportResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .eq("status", "closed")
    .gte("closed_at", dateRange.dateFrom)
    .lte("closed_at", `${dateRange.dateTo}T23:59:59.999Z`)
    .order("closed_at", { ascending: false });

  const rows = (data || []).map((row) => mapTicketRow(row as NestedRecord));
  const hours = rows
    .map((row) => row.resolution_hours)
    .filter((value): value is number => typeof value === "number");

  const avgHours =
    hours.length > 0
      ? Math.round((hours.reduce((sum, value) => sum + value, 0) / hours.length) * 10) / 10
      : 0;

  return {
    columns: [
      ...TICKET_COLUMNS,
      { key: "resolution_hours", label: "Resolution (hrs)" },
    ],
    rows,
    summary: {
      tickets_closed: rows.length,
      average_resolution_hours: avgHours,
    },
  };
}

async function getTimeLoggedByHRReport(dateRange: ReportDateRange): Promise<ReportResult> {
  const supabase = await createClient();
  const { data: hrUsers } = await supabase
    .from("profiles")
    .select("id")
    .in("role", HR_ROLES);

  const hrUserIds = hrUsers?.map((user) => user.id) || [];
  if (hrUserIds.length === 0) {
    return {
      columns: [
        { key: "user", label: "HR User" },
        { key: "ticket_number", label: "Ticket ID" },
        { key: "ticket_subject", label: "Ticket Subject" },
        { key: "log_date", label: "Log Date" },
        { key: "time_spent_minutes", label: "Time (min)" },
        { key: "time_spent_hours", label: "Time (hrs)" },
        { key: "description", label: "Description" },
      ],
      rows: [],
    };
  }

  const { data } = await supabase
    .from("time_logs")
    .select(`
      log_date, time_spent_minutes, description,
      user:profiles(full_name, role),
      ticket:tickets(ticket_number, subject)
    `)
    .in("user_id", hrUserIds)
    .gte("log_date", dateRange.dateFrom)
    .lte("log_date", dateRange.dateTo)
    .order("log_date", { ascending: false });

  const rows = (data || []).map((row) => {
    const minutes = Number(row.time_spent_minutes) || 0;
    const ticket = Array.isArray(row.ticket) ? row.ticket[0] : row.ticket;
    const ticketRecord = ticket as NestedRecord | null;
    return {
      user: nestedName(row.user),
      ticket_number: ticketRecord?.ticket_number ?? "—",
      ticket_subject: ticketRecord?.subject ?? "—",
      log_date: formatDate(row.log_date),
      time_spent_minutes: minutes,
      time_spent_hours: Math.round((minutes / 60) * 10) / 10,
      description: row.description ?? "—",
    };
  });

  const totalMinutes = rows.reduce(
    (sum, row) => sum + (typeof row.time_spent_minutes === "number" ? row.time_spent_minutes : 0),
    0
  );

  return {
    columns: [
      { key: "user", label: "HR User" },
      { key: "ticket_number", label: "Ticket ID" },
      { key: "ticket_subject", label: "Ticket Subject" },
      { key: "log_date", label: "Log Date" },
      { key: "time_spent_minutes", label: "Time (min)" },
      { key: "time_spent_hours", label: "Time (hrs)" },
      { key: "description", label: "Description" },
    ],
    rows,
    summary: {
      total_entries: rows.length,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    },
  };
}

async function getCategoryAnalysisReport(dateRange: ReportDateRange): Promise<ReportResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("status, due_date, category:categories(name)")
    .gte("created_at", dateRange.dateFrom)
    .lte("created_at", `${dateRange.dateTo}T23:59:59.999Z`);

  const now = new Date();
  const categoryMap: Record<
    string,
    { total: number; open: number; closed: number; overdue: number }
  > = {};

  for (const ticket of data || []) {
    const category = nestedName(ticket.category);
    if (!categoryMap[category]) {
      categoryMap[category] = { total: 0, open: 0, closed: 0, overdue: 0 };
    }
    categoryMap[category].total += 1;
    if (ticket.status === "closed") {
      categoryMap[category].closed += 1;
    } else {
      categoryMap[category].open += 1;
      if (ticket.due_date && new Date(ticket.due_date) < now) {
        categoryMap[category].overdue += 1;
      }
    }
  }

  const rows = Object.entries(categoryMap)
    .map(([category, counts]) => ({
      category,
      total_tickets: counts.total,
      open_tickets: counts.open,
      closed_tickets: counts.closed,
      overdue_tickets: counts.overdue,
    }))
    .sort((a, b) => b.total_tickets - a.total_tickets);

  return {
    columns: [
      { key: "category", label: "Category" },
      { key: "total_tickets", label: "Total Tickets" },
      { key: "open_tickets", label: "Open" },
      { key: "closed_tickets", label: "Closed" },
      { key: "overdue_tickets", label: "Overdue" },
    ],
    rows,
  };
}

export async function getFixedReport(
  reportType: ReportType,
  dateRange?: ReportDateRange
): Promise<ReportResult> {
  switch (reportType) {
    case "tickets-created":
      return getTicketsCreatedReport(dateRange!);
    case "tickets-closed":
      return getTicketsClosedReport(dateRange!);
    case "open-tickets":
      return getOpenTicketsReport();
    case "overdue-tickets":
      return getOverdueTicketsReport();
    case "avg-resolution-time":
      return getAvgResolutionTimeReport(dateRange!);
    case "time-logged-hr":
      return getTimeLoggedByHRReport(dateRange!);
    case "category-analysis":
      return getCategoryAnalysisReport(dateRange!);
    default:
      return { columns: [], rows: [] };
  }
}
