import type { ReportDateRange, ReportFilters, ReportResult, ReportType } from "./types";
import { hasTicketFilters } from "./types";
import { daysBetween, firstNameFromFullName } from "./date-ranges";
import { getReportSupabase } from "./report-client";

const HR_ROLES = ["administrator", "hr_manager", "hr_agent"];

const TICKET_LIST_SELECT = `
  ticket_number, subject, status, priority, contact_name, contact_email,
  created_at, due_date, closed_at,
  owner:profiles!tickets_owner_id_fkey(full_name),
  category:categories(name),
  department:departments(name)
`;

type NestedRecord = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTicketFilters(query: any, filters?: ReportFilters) {
  if (!filters) return query;

  let next = query;
  if (filters.contact_name) {
    next = next.ilike("contact_name", `%${filters.contact_name}%`);
  }
  if (filters.contact_email) {
    next = next.ilike("contact_email", `%${filters.contact_email}%`);
  }
  if (filters.owner_ids?.length) {
    next = next.in("owner_id", filters.owner_ids);
  }
  if (filters.category_id) {
    next = next.eq("category_id", filters.category_id);
  }
  if (filters.department_id) {
    next = next.eq("department_id", filters.department_id);
  }
  return next;
}

async function getFilteredTicketIds(filters?: ReportFilters): Promise<string[] | null> {
  if (!hasTicketFilters(filters)) return null;

  const supabase = await getReportSupabase();
  let query = supabase.from("tickets").select("id");
  query = applyTicketFilters(query, filters);
  const { data } = await query;
  return (data || []).map((row) => row.id);
}

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

async function getTicketsCreatedReport(
  dateRange: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  let query = supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .gte("created_at", dateRange.dateFrom)
    .lte("created_at", `${dateRange.dateTo}T23:59:59.999Z`);
  query = applyTicketFilters(query, filters);
  const { data } = await query.order("created_at", { ascending: false });

  return {
    columns: TICKET_COLUMNS,
    rows: (data || []).map((row) => mapTicketRow(row as NestedRecord)),
  };
}

async function getTicketsClosedReport(
  dateRange: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  let query = supabase
    .from("tickets")
    .select(`
      subject, created_at, closed_at,
      owner:profiles!tickets_owner_id_fkey(full_name),
      category:categories(name),
      time_logs(time_spent_minutes)
    `)
    .eq("status", "closed")
    .gte("closed_at", dateRange.dateFrom)
    .lte("closed_at", `${dateRange.dateTo}T23:59:59.999Z`);
  query = applyTicketFilters(query, filters);
  const { data } = await query.order("closed_at", { ascending: false });

  const rows = (data || []).map((row) => {
    const logs = Array.isArray(row.time_logs) ? row.time_logs : [];
    const totalMinutes = logs.reduce(
      (sum, log) => sum + (Number(log.time_spent_minutes) || 0),
      0
    );
    const ownerName = nestedName(row.owner);

    return {
      first_name: ownerName !== "—" ? firstNameFromFullName(ownerName) : "—",
      category: nestedName(row.category),
      subject: row.subject ?? "—",
      ticket_age_in_days: daysBetween(String(row.created_at), new Date(String(row.closed_at))),
      closed_time: formatDateTime(row.closed_at),
      hours_spent: Math.round((totalMinutes / 60) * 10) / 10,
    };
  });

  return {
    columns: [
      { key: "first_name", label: "First Name" },
      { key: "category", label: "Category" },
      { key: "subject", label: "Subject" },
      { key: "ticket_age_in_days", label: "Ticket Age in Days" },
      { key: "closed_time", label: "Date of Ticket Closed Time" },
      { key: "hours_spent", label: "Hours Spent" },
    ],
    rows,
  };
}

async function getOpenTicketsReport(filters?: ReportFilters): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  let query = supabase
    .from("tickets")
    .select(`
      contact_name, subject, status, created_at,
      category:categories(name)
    `)
    .in("status", ["open", "in_progress", "on_hold", "reopened"])
    .lt("created_at", cutoff.toISOString());
  query = applyTicketFilters(query, filters);
  const { data } = await query.order("created_at", { ascending: true });

  const rows = (data || []).map((row) => ({
    name: row.contact_name ?? "—",
    category: nestedName(row.category),
    created_time: formatDateTime(row.created_at),
    subject: row.subject ?? "—",
    ticket_status: row.status ?? "—",
    ticket_age_in_days: daysBetween(String(row.created_at)),
  }));

  return {
    columns: [
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "created_time", label: "Created_Time" },
      { key: "subject", label: "Subject" },
      { key: "ticket_status", label: "TicketStatus" },
      { key: "ticket_age_in_days", label: "Ticket_Age_in_Days" },
    ],
    rows,
  };
}

async function getOverdueTicketsReport(filters?: ReportFilters): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  let query = supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .lt("due_date", new Date().toISOString())
    .not("status", "eq", "closed");
  query = applyTicketFilters(query, filters);
  const { data } = await query.order("due_date", { ascending: true });

  return {
    columns: [
      ...TICKET_COLUMNS,
      { key: "days_overdue", label: "Days Overdue" },
    ],
    rows: (data || []).map((row) => mapTicketRow(row as NestedRecord)),
  };
}

async function getAvgResolutionTimeReport(
  dateRange: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  let query = supabase
    .from("tickets")
    .select(TICKET_LIST_SELECT)
    .eq("status", "closed")
    .gte("closed_at", dateRange.dateFrom)
    .lte("closed_at", `${dateRange.dateTo}T23:59:59.999Z`);
  query = applyTicketFilters(query, filters);
  const { data } = await query.order("closed_at", { ascending: false });

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

async function getTimeLoggedByHRReport(
  dateRange: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  const { data: hrUsers } = await supabase
    .from("profiles")
    .select("id")
    .in("role", HR_ROLES);

  const hrUserIds = hrUsers?.map((user) => user.id) || [];
  const emptyColumns = [
    { key: "name", label: "Name" },
    { key: "category", label: "category" },
    { key: "log_date", label: "Log_Date" },
    { key: "subject", label: "Subject" },
    { key: "total_hours_spent", label: "Total Hours Spent" },
  ];

  if (hrUserIds.length === 0) {
    return { columns: emptyColumns, rows: [] };
  }

  const ticketIds = await getFilteredTicketIds(filters);
  if (ticketIds && ticketIds.length === 0) {
    return {
      columns: emptyColumns,
      rows: [],
      summary: { total_entries: 0, total_hours: 0 },
    };
  }

  let query = supabase
    .from("time_logs")
    .select(`
      log_date, time_spent_minutes,
      user:profiles(full_name, role),
      ticket:tickets(subject, category:categories(name))
    `)
    .in("user_id", hrUserIds)
    .gte("log_date", dateRange.dateFrom)
    .lte("log_date", dateRange.dateTo);
  if (ticketIds) {
    query = query.in("ticket_id", ticketIds);
  }
  const { data } = await query.order("log_date", { ascending: false });

  const rows = (data || []).map((row) => {
    const minutes = Number(row.time_spent_minutes) || 0;
    const ticket = Array.isArray(row.ticket) ? row.ticket[0] : row.ticket;
    const ticketRecord = ticket as NestedRecord | null;
    const category = ticketRecord?.category as NestedRecord | null;

    return {
      name: nestedName(row.user),
      category: nestedName(category),
      log_date: formatDate(row.log_date),
      subject: ticketRecord?.subject ?? "—",
      total_hours_spent: Math.round((minutes / 60) * 10) / 10,
    };
  });

  const totalMinutes = rows.reduce(
    (sum, row) =>
      sum + (typeof row.total_hours_spent === "number" ? row.total_hours_spent * 60 : 0),
    0
  );

  return {
    columns: [
      { key: "name", label: "Name" },
      { key: "category", label: "category" },
      { key: "log_date", label: "Log_Date" },
      { key: "subject", label: "Subject" },
      { key: "total_hours_spent", label: "Total Hours Spent" },
    ],
    rows,
    summary: {
      total_entries: rows.length,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    },
  };
}

async function getTimesheetAgentReport(
  dateRange: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  const emptyColumns = [
    { key: "name", label: "Name" },
    { key: "category", label: "category" },
    { key: "log_date", label: "Log_Date" },
    { key: "subject", label: "Subject" },
    { key: "total_hours_spent", label: "Total Hours Spent" },
  ];

  if (!filters?.timesheet_agent_id) {
    return {
      columns: emptyColumns,
      rows: [],
      summary: { agent: "—", total_hours: 0 },
    };
  }

  const ticketIds = await getFilteredTicketIds(filters);

  let query = supabase
    .from("time_logs")
    .select(`
      log_date, time_spent_minutes,
      user:profiles(full_name),
      ticket:tickets(subject, category:categories(name))
    `)
    .eq("user_id", filters.timesheet_agent_id)
    .gte("log_date", dateRange.dateFrom)
    .lte("log_date", dateRange.dateTo);

  if (ticketIds) {
    if (ticketIds.length === 0) {
      return {
        columns: emptyColumns,
        rows: [],
        summary: { total_entries: 0, total_hours: 0 },
      };
    }
    query = query.in("ticket_id", ticketIds);
  }

  const { data } = await query.order("log_date", { ascending: false });

  const rows = (data || []).map((row) => {
    const minutes = Number(row.time_spent_minutes) || 0;
    const ticket = Array.isArray(row.ticket) ? row.ticket[0] : row.ticket;
    const ticketRecord = ticket as NestedRecord | null;
    const category = ticketRecord?.category as NestedRecord | null;

    return {
      name: nestedName(row.user),
      category: nestedName(category),
      log_date: formatDate(row.log_date),
      subject: ticketRecord?.subject ?? "—",
      total_hours_spent: Math.round((minutes / 60) * 10) / 10,
    };
  });

  const totalMinutes = rows.reduce(
    (sum, row) =>
      sum + (typeof row.total_hours_spent === "number" ? row.total_hours_spent * 60 : 0),
    0
  );

  const agentName = rows[0]?.name ?? "—";

  return {
    columns: emptyColumns,
    rows,
    summary: {
      agent: agentName,
      total_entries: rows.length,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    },
  };
}

async function getCategoryAnalysisReport(
  dateRange: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  const supabase = await getReportSupabase();
  let query = supabase
    .from("tickets")
    .select("status, due_date, category:categories(name)")
    .gte("created_at", dateRange.dateFrom)
    .lte("created_at", `${dateRange.dateTo}T23:59:59.999Z`);
  query = applyTicketFilters(query, filters);
  const { data } = await query;

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
  dateRange?: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  switch (reportType) {
    case "tickets-created":
      return getTicketsCreatedReport(dateRange!, filters);
    case "tickets-closed":
      return getTicketsClosedReport(dateRange!, filters);
    case "open-tickets":
      return getOpenTicketsReport(filters);
    case "overdue-tickets":
      return getOverdueTicketsReport(filters);
    case "avg-resolution-time":
      return getAvgResolutionTimeReport(dateRange!, filters);
    case "time-logged-hr":
      return getTimeLoggedByHRReport(dateRange!, filters);
    case "timesheet-agent":
      return getTimesheetAgentReport(dateRange!, filters);
    case "category-analysis":
      return getCategoryAnalysisReport(dateRange!, filters);
    default:
      return { columns: [], rows: [] };
  }
}
