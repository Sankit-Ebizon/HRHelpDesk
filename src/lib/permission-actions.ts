export const PERMISSION_ACTIONS = [
  { key: "can_read", label: "Read" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
] as const;

export type PermissionField = (typeof PERMISSION_ACTIONS)[number]["key"];

/** Actions shown in the role permissions UI for each module. */
export const MODULE_PERMISSION_ACTIONS: Record<string, readonly PermissionField[]> = {
  tickets: ["can_read", "can_create", "can_edit"],
  contacts: ["can_read"],
  time_logs: ["can_create", "can_edit"],
  departments: ["can_read", "can_create", "can_edit"],
  categories: ["can_read", "can_create", "can_edit"],
  users: ["can_read", "can_create", "can_edit"],
  reports: ["can_read"],
  settings: ["can_read", "can_edit"],
};

export function getModulePermissionActions(moduleSlug: string): readonly PermissionField[] {
  return MODULE_PERMISSION_ACTIONS[moduleSlug] ?? ["can_read"];
}
