export type UserRole = string;
export type UserStatus = "active" | "inactive" | "invited" | "rejected";
export type TicketStatus = "open" | "in_progress" | "on_hold" | "closed" | "reopened";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type CommentType = "reply" | "internal";
export type PermissionAction = "read" | "create" | "edit" | "delete";
export type NotificationType =
  | "ticket_created"
  | "ticket_assigned"
  | "ticket_reply"
  | "status_changed"
  | "ticket_closed"
  | "due_date_reminder";

export type TicketView =
  | "my_open"
  | "unassigned"
  | "all"
  | "overdue"
  | "closed";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  status: UserStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: Subcategory[];
  department?: Department | null;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  contact_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_details: string | null;
  department_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  owner_id: string | null;
  due_date: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  owner?: Profile | null;
  department?: Department | null;
  category?: Category | null;
  subcategory?: Subcategory | null;
  contact?: Contact | null;
  total_time_minutes?: number;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  author_email: string | null;
  content: string;
  comment_type: CommentType;
  is_from_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  comment_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TimeLog {
  id: string;
  ticket_id: string;
  user_id: string;
  log_date: string;
  time_spent_minutes: number;
  description: string;
  created_at: string;
  updated_at: string;
  user?: Profile | null;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  user_id: string | null;
  user_name: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  module_id: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  module?: { slug: string; name: string };
}

export interface RoleDefinition {
  role: UserRole;
  label: string;
  is_system: boolean;
  is_active: boolean;
}

export interface TicketFilters {
  status?: TicketStatus[];
  owner_id?: string;
  category_id?: string;
  priority?: TicketPriority[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  closed: "Closed",
  reopened: "Reopened",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  hr_manager: "HR Manager",
  hr_agent: "HR Agent",
};

export function getRoleLabel(role: string, customLabels?: Record<string, string>) {
  return customLabels?.[role] || USER_ROLE_LABELS[role] || role;
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
  rejected: "Rejected",
};

export const TICKET_VIEWS: { id: TicketView; label: string; description: string }[] = [
  { id: "my_open", label: "My Open Tickets", description: "Tickets assigned to you that are open" },
  { id: "unassigned", label: "Unassigned Tickets", description: "Tickets without an owner" },
  { id: "all", label: "All Open Tickets", description: "Active tickets that are not closed" },
  { id: "overdue", label: "Overdue Tickets", description: "Tickets past their due date" },
  { id: "closed", label: "Closed Tickets", description: "Resolved and closed tickets" },
];
