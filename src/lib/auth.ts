import { createClient } from "@/lib/supabase/server";
import type { Profile, PermissionAction, RolePermission } from "@/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*, department:departments(*)")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export async function getUserPermissions(
  role: Profile["role"]
): Promise<RolePermission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("*, module:modules(slug, name)")
    .eq("role", role);

  return (data as RolePermission[]) || [];
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
    default:
      return false;
  }
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
