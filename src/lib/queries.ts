import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { unstable_noStore as noStore } from "next/cache";
import type { RoleDefinition, Ticket, TicketFilters, TicketView, SavedTicketView } from "@/types";

const TICKET_SELECT = `
  *,
  owner:profiles!tickets_owner_id_fkey(id, full_name, email),
  department:departments(id, name),
  category:categories(id, name),
  subcategory:subcategories(id, name),
  contact:contacts(id, full_name, email)
`;

export async function getTickets(
  view: TicketView = "all",
  filters: TicketFilters = {},
  userId?: string
): Promise<Ticket[]> {
  const supabase = await createClient();
  let query = supabase.from("tickets").select(TICKET_SELECT).order("created_at", { ascending: false });

  switch (view) {
    case "my_open":
      if (userId) query = query.eq("owner_id", userId).in("status", ["open", "in_progress", "on_hold", "reopened"]);
      break;
    case "unassigned":
      query = query.is("owner_id", null).not("status", "eq", "closed");
      break;
    case "overdue":
      query = query
        .lt("due_date", new Date().toISOString())
        .not("status", "eq", "closed");
      break;
    case "all":
      if (!filters.owner_id) query = query.not("status", "eq", "closed");
      break;
    case "closed":
      query = query.eq("status", "closed");
      break;
  }

  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.owner_id) query = query.eq("owner_id", filters.owner_id);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.department_id) query = query.eq("department_id", filters.department_id);
  if (filters.priority?.length) query = query.in("priority", filters.priority);
  if (filters.date_from) query = query.gte("created_at", filters.date_from);
  if (filters.date_to) query = query.lte("created_at", filters.date_to);
  if (filters.search) {
    query = query.or(
      `subject.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Ticket[]) || [];
}

export async function countTicketsForView(
  view: TicketView = "all",
  filters: TicketFilters = {},
  userId?: string
): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from("tickets").select("id", { count: "exact", head: true });

  switch (view) {
    case "my_open":
      if (userId) query = query.eq("owner_id", userId).in("status", ["open", "in_progress", "on_hold", "reopened"]);
      break;
    case "unassigned":
      query = query.is("owner_id", null).not("status", "eq", "closed");
      break;
    case "overdue":
      query = query.lt("due_date", new Date().toISOString()).not("status", "eq", "closed");
      break;
    case "all":
      if (!filters.owner_id) query = query.not("status", "eq", "closed");
      break;
    case "closed":
      query = query.eq("status", "closed");
      break;
  }

  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.owner_id) query = query.eq("owner_id", filters.owner_id);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.department_id) query = query.eq("department_id", filters.department_id);
  if (filters.priority?.length) query = query.in("priority", filters.priority);
  if (filters.date_from) query = query.gte("created_at", filters.date_from);
  if (filters.date_to) query = query.lte("created_at", filters.date_to);
  if (filters.search) {
    query = query.or(
      `subject.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
    );
  }

  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}

export async function getCustomViewCounts(
  savedViews: SavedTicketView[],
  userId?: string
): Promise<Record<string, number>> {
  if (savedViews.length === 0) return {};

  const results = await Promise.all(
    savedViews.map(async (savedView) => ({
      id: savedView.id,
      count: await countTicketsForView(savedView.base_view, savedView.filters, userId),
    }))
  );

  return Object.fromEntries(results.map((item) => [item.id, item.count]));
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .single();

  if (error) return null;

  const { data: timeLogs } = await supabase
    .from("time_logs")
    .select("time_spent_minutes")
    .eq("ticket_id", id);

  const total = timeLogs?.reduce((sum, log) => sum + log.time_spent_minutes, 0) || 0;

  return { ...(data as Ticket), total_time_minutes: total };
}

export async function getTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("ticket_number", ticketNumber)
    .single();
  return data as Ticket | null;
}

export async function getTicketCounts(userId?: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [myOpen, unassigned, all, overdue, closed] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId || "")
      .in("status", ["open", "in_progress", "on_hold", "reopened"]),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .is("owner_id", null)
      .not("status", "eq", "closed"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .not("status", "eq", "closed"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .lt("due_date", now)
      .not("status", "eq", "closed"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed"),
  ]);

  return {
    my_open: myOpen.count || 0,
    unassigned: unassigned.count || 0,
    all: all.count || 0,
    overdue: overdue.count || 0,
    closed: closed.count || 0,
  };
}

export async function getTicketComments(ticketId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function getTicketPins(ticketId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_pinned_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getTicketAttachments(ticketId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_attachments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getTicketTimeLogs(ticketId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_logs")
    .select("*, user:profiles(id, full_name, email)")
    .eq("ticket_id", ticketId)
    .order("log_date", { ascending: false });
  return data || [];
}

export async function getTicketHistory(ticketId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_history")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getHRAgents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("status", "active")
    .in("role", ["administrator", "hr_manager", "hr_agent"])
    .order("full_name");
  return data || [];
}

export async function getRecipientEmailOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("status", "active")
    .order("full_name");
  return (data || []).map((profile) => ({
    email: profile.email,
    label: profile.full_name,
  }));
}

const DEPARTMENT_SELECT_WITH_CREATOR =
  "*, associate_agent:profiles!associate_agent_id(id, full_name, email), created_by_profile:profiles!created_by(id, full_name)";

const DEPARTMENT_SELECT_BASE =
  "*, associate_agent:profiles!associate_agent_id(id, full_name, email)";

export async function getDepartments() {
  const supabase = await createClient();
  const withCreator = await supabase
    .from("departments")
    .select(DEPARTMENT_SELECT_WITH_CREATOR)
    .eq("is_active", true)
    .order("name");

  if (!withCreator.error) return withCreator.data || [];

  const fallback = await supabase
    .from("departments")
    .select(DEPARTMENT_SELECT_BASE)
    .eq("is_active", true)
    .order("name");
  return fallback.data || [];
}

export async function getDepartmentById(id: string) {
  const supabase = await createClient();
  const withCreator = await supabase
    .from("departments")
    .select(DEPARTMENT_SELECT_WITH_CREATOR)
    .eq("id", id)
    .maybeSingle();

  if (!withCreator.error) return withCreator.data;

  const fallback = await supabase
    .from("departments")
    .select(DEPARTMENT_SELECT_BASE)
    .eq("id", id)
    .maybeSingle();
  return fallback.data;
}

export async function getDepartmentMembers(departmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("department_id", departmentId)
    .eq("status", "active")
    .order("full_name");
  return data || [];
}

export async function getCategoriesByDepartment(departmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, description, is_active")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("name");
  return data || [];
}

const CATEGORY_SELECT_WITH_CREATOR =
  "*, subcategories(*), department:departments(id, name), created_by_profile:profiles!created_by(id, full_name)";

const CATEGORY_SELECT_BASE =
  "*, subcategories(*), department:departments(id, name)";

export async function getCategories() {
  const supabase = await createClient();
  const withCreator = await supabase
    .from("categories")
    .select(CATEGORY_SELECT_WITH_CREATOR)
    .eq("is_active", true)
    .order("name");

  if (!withCreator.error) return withCreator.data || [];

  const fallback = await supabase
    .from("categories")
    .select(CATEGORY_SELECT_BASE)
    .eq("is_active", true)
    .order("name");
  return fallback.data || [];
}

export async function getAllCategoriesForSettings() {
  const supabase = await createClient();
  const selectWithCounts = `${CATEGORY_SELECT_WITH_CREATOR}, tickets(count)`;
  const withCreator = await supabase
    .from("categories")
    .select(selectWithCounts)
    .order("name");

  if (!withCreator.error) return withCreator.data || [];

  const fallback = await supabase
    .from("categories")
    .select(`${CATEGORY_SELECT_BASE}, tickets(count)`)
    .order("name");
  return fallback.data || [];
}

export async function getContacts(search?: string) {
  const supabase = await createClient();
  let query = supabase.from("contacts").select("*").order("full_name");
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  const { data } = await query;
  return data || [];
}

export async function getUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, department:departments!department_id(id, name)")
    .order("full_name");
  return data || [];
}

export async function getUserById(id: string) {
  noStore();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, department:departments!department_id(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  let lastLogin: string | null = null;
  try {
    const admin = createServiceClient();
    const { data: authData } = await admin.auth.admin.getUserById(id);
    lastLogin = authData.user?.last_sign_in_at ?? null;
  } catch {
    lastLogin = null;
  }

  return { ...data, last_login_at: lastLogin };
}

export async function getNotifications(userId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getRolePermissionsMatrix() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("*, module:modules(id, name, slug)")
    .order("role");
  return data || [];
}

export async function getRolePermissionsByRole(role: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("*, module:modules(id, name, slug, description)")
    .eq("role", role)
    .order("module(name)");
  return data || [];
}

export async function getRoleReportSectionsByRole(role: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_report_sections")
    .select("*")
    .eq("role", role)
    .order("section_id");
  return data || [];
}

export async function getVisibleReportSectionsForRole(role: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_report_sections")
    .select("section_id")
    .eq("role", role)
    .eq("can_view", true);

  if (!data || data.length === 0) {
    const { ALL_REPORT_SECTIONS } = await import("@/lib/reports/sections");
    return ALL_REPORT_SECTIONS.map((section) => section.id);
  }

  return data.map((row) => row.section_id);
}

export async function getRoleByKey(role: string): Promise<RoleDefinition | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_roles")
    .select("role, label, is_system, is_active")
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();
  return (data as RoleDefinition) || null;
}

export async function getRoles(): Promise<RoleDefinition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_roles")
    .select("role, label, is_system, is_active")
    .eq("is_active", true)
    .order("label");

  return (data as RoleDefinition[]) || [];
}

export async function getRoleLabelMap(): Promise<Record<string, string>> {
  const roles = await getRoles();
  return roles.reduce<Record<string, string>>((acc, role) => {
    acc[role.role] = role.label;
    return acc;
  }, {});
}

export async function getSupportEmail() {
  noStore();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "support_email")
    .maybeSingle();

  return data?.value || process.env.HR_HELPDESK_EMAIL || "hrsupport@ebizondigital.com";
}

export async function getNotificationPreferences(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId);
  return data || [];
}

export async function getSubcategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subcategories")
    .select("*, category:categories(id, name)")
    .eq("is_active", true)
    .order("name");
  return data || [];
}

const SUBCATEGORY_SELECT_WITH_CREATOR =
  "*, category:categories(id, name), created_by_profile:profiles!created_by(id, full_name), tickets(count)";

const SUBCATEGORY_SELECT_BASE =
  "*, category:categories(id, name), tickets(count)";

export async function getAllSubcategoriesForSettings() {
  const supabase = await createClient();
  const withCreator = await supabase
    .from("subcategories")
    .select(SUBCATEGORY_SELECT_WITH_CREATOR)
    .order("name");

  if (!withCreator.error) return withCreator.data || [];

  const fallback = await supabase
    .from("subcategories")
    .select(SUBCATEGORY_SELECT_BASE)
    .order("name");
  return fallback.data || [];
}

export async function getTicketOwnerStats() {
  const supabase = await createClient();
  const { data: agents } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, department:departments!department_id(name)")
    .eq("status", "active")
    .in("role", ["administrator", "hr_manager", "hr_agent"])
    .order("full_name");

  if (!agents) return [];

  const stats = await Promise.all(
    agents.map(async (agent) => {
      const [open, total] = await Promise.all([
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", agent.id)
          .in("status", ["open", "in_progress", "on_hold", "reopened"]),
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", agent.id),
      ]);
      return {
        ...agent,
        open_tickets: open.count || 0,
        total_tickets: total.count || 0,
      };
    })
  );

  return stats;
}

const TICKET_OWNER_ROLES = ["administrator", "hr_manager", "hr_agent"] as const;

export async function getTicketOwnerProfile(id: string) {
  noStore();
  const owner = await getUserById(id);
  if (!owner) return null;
  if (owner.status !== "active") return null;
  if (!TICKET_OWNER_ROLES.includes(owner.role as (typeof TICKET_OWNER_ROLES)[number])) {
    return null;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const [openResult, totalResult, overdueResult, recentResult] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", id)
      .in("status", ["open", "in_progress", "on_hold", "reopened"]),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("owner_id", id),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", id)
      .lt("due_date", now)
      .not("status", "eq", "closed"),
    supabase
      .from("tickets")
      .select("id, ticket_number, subject, status, priority, created_at")
      .eq("owner_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    owner,
    stats: {
      open: openResult.count || 0,
      total: totalResult.count || 0,
      overdue: overdueResult.count || 0,
    },
    recentTickets: recentResult.data || [],
  };
}

export async function getSavedReports(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_reports")
    .select("*")
    .or(`user_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  return data || [];
}

export async function runCustomReport(
  reportType: string,
  selectedFields: string[],
  filters: Record<string, string>
) {
  const supabase = await createClient();

  if (reportType === "tickets") {
    let query = supabase.from("tickets").select(`
      id, ticket_number, subject, status, priority, contact_name, contact_email,
      created_at, updated_at, due_date, closed_at,
      owner:profiles!tickets_owner_id_fkey(full_name),
      category:categories(name),
      department:departments(name)
    `);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.owner_id) query = query.eq("owner_id", filters.owner_id);
    if (filters.date_from) query = query.gte("created_at", filters.date_from);
    if (filters.date_to) query = query.lte("created_at", filters.date_to);

    const { data } = await query.order("created_at", { ascending: false }).limit(500);
    return data || [];
  }

  if (reportType === "time_logs") {
    let query = supabase.from("time_logs").select(`
      id, log_date, time_spent_minutes, description, created_at,
      user:profiles(full_name),
      ticket:tickets(ticket_number, subject)
    `);

    if (filters.date_from) query = query.gte("log_date", filters.date_from);
    if (filters.date_to) query = query.lte("log_date", filters.date_to);

    const { data } = await query.order("log_date", { ascending: false }).limit(500);
    return data || [];
  }

  return [];
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count || 0;
}

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message || "")
  );
}

export async function getSavedTicketViews(): Promise<SavedTicketView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_ticket_views")
    .select("*")
    .order("is_starred", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data as SavedTicketView[]) || [];
}

export async function getSavedTicketViewById(id: string): Promise<SavedTicketView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_ticket_views")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    return null;
  }
  return data as SavedTicketView | null;
}

export async function getStarredSystemViews(): Promise<TicketView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("starred_system_ticket_views")
    .select("view_id")
    .order("sort_order", { ascending: true })
    .order("view_id", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return (data ?? []).map((row) => row.view_id as TicketView);
}
