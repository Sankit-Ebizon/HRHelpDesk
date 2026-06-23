export interface ReportFieldDef {
  key: string;
  label: string;
  /** Dot path used when mapping row values */
  path: string;
}

export interface ReportJoinDef {
  id: string;
  label: string;
  /** Supabase select fragment */
  select: string;
  fields: ReportFieldDef[];
}

export interface ReportModuleDef {
  id: string;
  label: string;
  table: string;
  description: string;
  fields: ReportFieldDef[];
  joins: ReportJoinDef[];
  /** Date field on base table for filtering */
  dateField: string;
}

export const REPORT_MODULES: ReportModuleDef[] = [
  {
    id: "tickets",
    label: "Tickets",
    table: "tickets",
    description: "Support tickets and their properties",
    dateField: "created_at",
    fields: [
      { key: "tickets.ticket_number", label: "Ticket ID", path: "ticket_number" },
      { key: "tickets.subject", label: "Subject", path: "subject" },
      { key: "tickets.status", label: "Ticket Status", path: "status" },
      { key: "tickets.priority", label: "Priority", path: "priority" },
      { key: "tickets.contact_name", label: "Contact Name", path: "contact_name" },
      { key: "tickets.contact_email", label: "Contact Email", path: "contact_email" },
      { key: "tickets.created_at", label: "Created Time", path: "created_at" },
      { key: "tickets.closed_at", label: "Closed Time", path: "closed_at" },
      { key: "tickets.due_date", label: "Due Date", path: "due_date" },
      { key: "tickets.ticket_age_in_days", label: "Ticket Age in Days", path: "ticket_age_in_days" },
      { key: "tickets.total_hours_spent", label: "Hours Spent", path: "total_hours_spent" },
    ],
    joins: [
      {
        id: "category",
        label: "Category",
        select: "category:categories(name)",
        fields: [{ key: "category.name", label: "Category", path: "category.name" }],
      },
      {
        id: "department",
        label: "Department",
        select: "department:departments(name)",
        fields: [{ key: "department.name", label: "Department", path: "department.name" }],
      },
      {
        id: "subcategory",
        label: "Sub-category",
        select: "subcategory:subcategories(name)",
        fields: [{ key: "subcategory.name", label: "Sub-category", path: "subcategory.name" }],
      },
      {
        id: "owner",
        label: "Ticket Owner",
        select: "owner:profiles!tickets_owner_id_fkey(full_name, email)",
        fields: [
          { key: "owner.full_name", label: "Owner Name", path: "owner.full_name" },
          { key: "owner.first_name", label: "First Name", path: "owner.first_name" },
          { key: "owner.email", label: "Owner Email", path: "owner.email" },
        ],
      },
      {
        id: "time_logs",
        label: "Time Logs",
        select: "time_logs(time_spent_minutes)",
        fields: [
          { key: "time_logs.total_hours", label: "Total Hours Spent", path: "total_hours_spent" },
        ],
      },
    ],
  },
  {
    id: "time_logs",
    label: "Time Logs",
    table: "time_logs",
    description: "Agent time entries on tickets",
    dateField: "log_date",
    fields: [
      { key: "time_logs.log_date", label: "Log Date", path: "log_date" },
      { key: "time_logs.time_spent_minutes", label: "Minutes Spent", path: "time_spent_minutes" },
      { key: "time_logs.hours_spent", label: "Hours Spent", path: "hours_spent" },
      { key: "time_logs.description", label: "Description", path: "description" },
    ],
    joins: [
      {
        id: "ticket",
        label: "Ticket",
        select: "ticket:tickets(subject, ticket_number, status, contact_name, category:categories(name))",
        fields: [
          { key: "ticket.subject", label: "Subject", path: "ticket.subject" },
          { key: "ticket.ticket_number", label: "Ticket ID", path: "ticket.ticket_number" },
          { key: "ticket.status", label: "Ticket Status", path: "ticket.status" },
          { key: "ticket.contact_name", label: "Contact Name", path: "ticket.contact_name" },
          { key: "ticket.category.name", label: "Category", path: "ticket.category.name" },
        ],
      },
      {
        id: "user",
        label: "Agent",
        select: "user:profiles(full_name, email)",
        fields: [
          { key: "user.full_name", label: "Name", path: "user.full_name" },
          { key: "user.first_name", label: "First Name", path: "user.first_name" },
          { key: "user.email", label: "Agent Email", path: "user.email" },
        ],
      },
    ],
  },
];

export function getReportModule(moduleId: string) {
  return REPORT_MODULES.find((module) => module.id === moduleId);
}

export function getAvailableFields(moduleId: string, joinId?: string) {
  const module = getReportModule(moduleId);
  if (!module) return [];

  const base = module.fields;
  if (!joinId) return base;

  const join = module.joins.find((entry) => entry.id === joinId);
  return join ? [...base, ...join.fields] : base;
}
