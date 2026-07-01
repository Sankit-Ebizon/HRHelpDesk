export const PERMISSION_ACTIONS = [
  { key: "can_read", label: "Read" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
  { key: "can_enable", label: "Enable/Disable" },
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
  scheduled_reports: ["can_read", "can_create", "can_edit", "can_delete", "can_enable"],
  settings: ["can_read", "can_edit"],
};

/** Custom labels for module-specific permission toggles. */
export const MODULE_PERMISSION_LABELS: Partial<
  Record<string, Partial<Record<PermissionField, string>>>
> = {
  scheduled_reports: {
    can_read: "View Scheduled Reports",
    can_create: "Create Scheduled Reports",
    can_edit: "Edit Scheduled Reports",
    can_delete: "Delete Scheduled Reports",
    can_enable: "Enable/Disable Scheduled Reports",
  },
};

export function getModulePermissionActions(moduleSlug: string): readonly PermissionField[] {
  return MODULE_PERMISSION_ACTIONS[moduleSlug] ?? ["can_read"];
}

export function getPermissionLabel(moduleSlug: string, field: PermissionField): string {
  return MODULE_PERMISSION_LABELS[moduleSlug]?.[field] ?? PERMISSION_ACTIONS.find((a) => a.key === field)?.label ?? field;
}
