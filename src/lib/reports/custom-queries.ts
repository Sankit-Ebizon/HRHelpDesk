import { createClient } from "@/lib/supabase/server";
import type { ReportFieldDef } from "./catalog";
import { getAvailableFields, getReportModule } from "./catalog";
import { daysBetween, firstNameFromFullName } from "./date-ranges";
import type { CustomReportConfig, ReportFilters, ReportResult } from "./types";

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

function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as NestedRecord)[part];
    if (Array.isArray(current)) current = current[0];
  }

  return current;
}

function formatDateTime(value: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function columnKey(fieldKey: string): string {
  return fieldKey.replace(/\./g, "_");
}

function buildSelect(moduleId: string, joinId: string | undefined, fields: ReportFieldDef[]): string {
  const module = getReportModule(moduleId);
  if (!module) return "*";

  const parts = new Set<string>();

  for (const field of fields) {
    if (field.key.startsWith(`${moduleId}.`)) {
      const basePath = field.path;
      if (!basePath.includes(".")) {
        parts.add(basePath);
      }
    }
  }

  if (moduleId === "tickets") {
    if (fields.some((field) => field.path === "ticket_age_in_days")) {
      parts.add("created_at");
    }
    if (fields.some((field) => field.path === "total_hours_spent")) {
      parts.add("time_logs(time_spent_minutes)");
    }
    if (fields.some((field) => field.path.startsWith("owner."))) {
      parts.add("owner:profiles!tickets_owner_id_fkey(full_name, email)");
    }
  }

  if (moduleId === "time_logs") {
    if (fields.some((field) => field.path === "hours_spent")) {
      parts.add("time_spent_minutes");
    }
    if (fields.some((field) => field.path.startsWith("user."))) {
      parts.add("user:profiles(full_name, email)");
    }
    if (fields.some((field) => field.path.startsWith("ticket."))) {
      parts.add("ticket:tickets(subject, ticket_number, status, contact_name, category:categories(name))");
    }
  }

  if (joinId) {
    const join = module.joins.find((entry) => entry.id === joinId);
    if (join) parts.add(join.select);
  }

  if (parts.size === 0) return "*";
  return Array.from(parts).join(", ");
}

function resolveFieldValue(
  row: NestedRecord,
  field: ReportFieldDef,
  moduleId: string
): unknown {
  if (field.path === "ticket_age_in_days") {
    return daysBetween(String(row.created_at));
  }

  if (field.path === "total_hours_spent") {
    const logs = Array.isArray(row.time_logs) ? row.time_logs : [];
    const totalMinutes = logs.reduce(
      (sum, log) => sum + (Number((log as NestedRecord).time_spent_minutes) || 0),
      0
    );
    return Math.round((totalMinutes / 60) * 10) / 10;
  }

  if (field.path === "hours_spent") {
    const minutes = Number(row.time_spent_minutes) || 0;
    return Math.round((minutes / 60) * 10) / 10;
  }

  if (field.path === "owner.first_name" || field.path === "user.first_name") {
    const fullNamePath = field.path.replace("first_name", "full_name");
    const fullName = String(getValueByPath(row, fullNamePath) || "");
    return fullName ? firstNameFromFullName(fullName) : "—";
  }

  let value = getValueByPath(row, field.path);

  if (field.path.endsWith("_at")) {
    return formatDateTime(value);
  }
  if (field.path === "log_date" || field.path.endsWith("due_date")) {
    return formatDate(value);
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (moduleId === "time_logs" && field.path === "time_spent_minutes") {
    return Number(value) || 0;
  }

  return value;
}

export async function runCustomReport(config: CustomReportConfig): Promise<ReportResult> {
  const module = getReportModule(config.moduleId);
  if (!module || config.fields.length === 0) {
    return { columns: [], rows: [] };
  }

  const allFields = getAvailableFields(config.moduleId, config.joinId);
  const selectedFields = config.fields
    .map((key) => allFields.find((field) => field.key === key))
    .filter((field): field is ReportFieldDef => Boolean(field));

  if (selectedFields.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = selectedFields.map((field) => ({
    key: columnKey(field.key),
    label: field.label,
  }));

  const supabase = await createClient();
  const select = buildSelect(config.moduleId, config.joinId, selectedFields);

  let query = supabase.from(module.table).select(select);

  if (config.dateFrom && config.dateTo) {
    if (module.dateField === "created_at" || module.dateField === "closed_at") {
      query = query
        .gte(module.dateField, config.dateFrom)
        .lte(module.dateField, `${config.dateTo}T23:59:59.999Z`);
    } else {
      query = query.gte(module.dateField, config.dateFrom).lte(module.dateField, config.dateTo);
    }
  }

  if (config.moduleId === "tickets" && config.filters) {
    query = applyTicketFilters(query, config.filters);
  }

  const { data, error } = await query.order(module.dateField, { ascending: false }).limit(5000);

  if (error) {
    console.error("Custom report query failed:", error.message);
    return { columns, rows: [] };
  }

  const rows = (data || []).map((row) => {
    const record = row as unknown as NestedRecord;
    const mapped: Record<string, unknown> = {};
    for (const field of selectedFields) {
      mapped[columnKey(field.key)] = resolveFieldValue(record, field, config.moduleId);
    }
    return mapped;
  });

  return { columns, rows };
}
