import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveTicketOwner(
  supabase: SupabaseClient,
  {
    departmentId,
    categoryId,
    explicitOwnerId,
  }: {
    departmentId: string | null;
    categoryId?: string | null;
    explicitOwnerId: string | null;
  }
): Promise<string | null> {
  if (explicitOwnerId) return explicitOwnerId;

  let resolvedDepartmentId = departmentId;

  if (!resolvedDepartmentId && categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("department_id")
      .eq("id", categoryId)
      .maybeSingle();
    resolvedDepartmentId = category?.department_id ?? null;
  }

  if (!resolvedDepartmentId) return null;

  const { data: department } = await supabase
    .from("departments")
    .select("associate_agent_id")
    .eq("id", resolvedDepartmentId)
    .eq("is_active", true)
    .maybeSingle();

  return department?.associate_agent_id ?? null;
}

export async function getDepartmentAssociateAgentId(
  supabase: SupabaseClient,
  departmentId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("departments")
    .select("associate_agent_id")
    .eq("id", departmentId)
    .eq("is_active", true)
    .maybeSingle();

  return data?.associate_agent_id ?? null;
}
