import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { Profile, PermissionAction, RolePermission, RoleReportSection } from "@/types";

export const getCurrentProfile = cache(async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*, department:departments!department_id(*)")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("[getCurrentProfile]", error.message);
    return null;
  }

  return data as Profile | null;
});

export const getUserPermissions = cache(async function getUserPermissions(
  role: Profile["role"]
): Promise<RolePermission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("*, module:modules(slug, name)")
    .eq("role", role);

  return (data as RolePermission[]) || [];
});

export function canViewReportSection(
  sections: RoleReportSection[],
  sectionId: string,
  role: Profile["role"]
): boolean {
  if (role === "administrator") return true;
  const entry = sections.find((section) => section.section_id === sectionId);
  if (!entry) return true;
  return entry.can_view;
}

export async function getUserReportSections(
  role: Profile["role"]
): Promise<RoleReportSection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_report_sections")
    .select("*")
    .eq("role", role);
  return (data as RoleReportSection[]) || [];
}

export function canAccess(
  permissions: RolePermission[],
  moduleSlug: string,
  action: PermissionAction
): boolean {
  const perm = permissions.find((p) => p.module?.slug === moduleSlug);
  if (!perm) return false;
  switch (action) {
    case "read":
      return perm.can_read;
    case "create":
      return perm.can_create;
    case "edit":
      return perm.can_edit;
    case "delete":
      return perm.can_delete;
    case "enable":
      return perm.can_enable ?? false;
    default:
      return false;
  }
}

export function getScheduledReportPermissions(permissions: RolePermission[]) {
  return {
    canView: canAccess(permissions, "scheduled_reports", "read"),
    canCreate: canAccess(permissions, "scheduled_reports", "create"),
    canEdit: canAccess(permissions, "scheduled_reports", "edit"),
    canDelete: canAccess(permissions, "scheduled_reports", "delete"),
    canEnable: canAccess(permissions, "scheduled_reports", "enable"),
  };
}

export async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active") {
    throw new Error("Unauthorized");
  }
  return profile;
}

export async function requirePermission(
  moduleSlug: string,
  action: PermissionAction
) {
  const profile = await requireAuth();
  const permissions = await getUserPermissions(profile.role);
  if (!canAccess(permissions, moduleSlug, action)) {
    throw new Error("Forbidden");
  }
  return { profile, permissions };
}
