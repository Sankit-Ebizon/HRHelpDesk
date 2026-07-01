"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SavedTicketView, TicketFilters, TicketView, TicketViewVisibility } from "@/types";

export interface SaveTicketViewInput {
  name: string;
  baseView: TicketView;
  filters: TicketFilters;
  visibility: TicketViewVisibility;
  isStarred?: boolean;
}

function validateViewInput(input: SaveTicketViewInput): string | null {
  if (!input.name.trim()) return "View name is required";
  if (!["private", "shared", "public"].includes(input.visibility)) {
    return "Invalid visibility";
  }
  return null;
}

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message || "")
  );
}

export async function getSavedTicketViewsAction(): Promise<SavedTicketView[]> {
  await requirePermission("tickets", "read");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_ticket_views")
    .select("*")
    .order("is_starred", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }
  return (data as SavedTicketView[]) || [];
}

export async function createTicketViewAction(
  input: SaveTicketViewInput
): Promise<{ error?: string; id?: string }> {
  const { profile } = await requirePermission("tickets", "read");
  const validationError = validateViewInput(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_ticket_views")
    .insert({
      name: input.name.trim(),
      user_id: profile.id,
      base_view: input.baseView,
      filters: input.filters,
      visibility: input.visibility,
      is_starred: input.isStarred ?? false,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return { error: "Custom views are not set up yet. Apply migration 021_saved_ticket_views.sql." };
    }
    return { error: error.message };
  }

  revalidatePath("/tickets");
  return { id: data.id };
}

export async function updateTicketViewAction(
  id: string,
  input: Partial<SaveTicketViewInput>
): Promise<{ error?: string }> {
  await requirePermission("tickets", "read");
  const supabase = await createClient();

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.baseView !== undefined) payload.base_view = input.baseView;
  if (input.filters !== undefined) payload.filters = input.filters;
  if (input.visibility !== undefined) payload.visibility = input.visibility;
  if (input.isStarred !== undefined) payload.is_starred = input.isStarred;

  const { error } = await supabase.from("saved_ticket_views").update(payload).eq("id", id);
  if (error) {
    if (isMissingTableError(error)) {
      return { error: "Custom views are not set up yet. Apply migration 021_saved_ticket_views.sql." };
    }
    return { error: error.message };
  }

  revalidatePath("/tickets");
  return {};
}

export async function deleteTicketViewAction(id: string): Promise<{ error?: string }> {
  await requirePermission("tickets", "read");
  const supabase = await createClient();
  const { error } = await supabase.from("saved_ticket_views").delete().eq("id", id);
  if (error) {
    if (isMissingTableError(error)) {
      return { error: "Custom views are not set up yet. Apply migration 021_saved_ticket_views.sql." };
    }
    return { error: error.message };
  }

  revalidatePath("/tickets");
  return {};
}

export async function toggleTicketViewStarAction(
  id: string,
  isStarred: boolean
): Promise<{ error?: string }> {
  return updateTicketViewAction(id, { isStarred });
}

export async function toggleSystemViewStarAction(
  viewId: TicketView,
  isStarred: boolean
): Promise<{ error?: string }> {
  const { profile } = await requirePermission("tickets", "read");
  const supabase = await createClient();

  if (isStarred) {
    const { error } = await supabase.from("starred_system_ticket_views").upsert({
      user_id: profile.id,
      view_id: viewId,
    });
    if (error) {
      if (isMissingTableError(error)) {
        return { error: "Starred system views are not set up yet. Apply migration 023_starred_system_ticket_views.sql." };
      }
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("starred_system_ticket_views")
      .delete()
      .eq("user_id", profile.id)
      .eq("view_id", viewId);
    if (error) {
      if (isMissingTableError(error)) {
        return { error: "Starred system views are not set up yet. Apply migration 023_starred_system_ticket_views.sql." };
      }
      return { error: error.message };
    }
  }

  revalidatePath("/tickets");
  return {};
}
