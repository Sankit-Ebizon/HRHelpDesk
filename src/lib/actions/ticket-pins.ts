"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export type PinVisibility = "all_agents" | "only_me";

export async function pinTicketMessage(
  ticketId: string,
  messageKey: string,
  visibility: PinVisibility = "all_agents"
) {
  const { profile } = await requirePermission("tickets", "edit");
  const supabase = await createClient();

  const { error } = await supabase.from("ticket_pinned_messages").upsert(
    {
      ticket_id: ticketId,
      message_key: messageKey,
      pinned_by: profile.id,
      pinned_by_name: profile.full_name,
      visibility,
    },
    { onConflict: "ticket_id,message_key" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

export async function unpinTicketMessage(ticketId: string, messageKey: string) {
  await requirePermission("tickets", "edit");
  const supabase = await createClient();

  const { error } = await supabase
    .from("ticket_pinned_messages")
    .delete()
    .eq("ticket_id", ticketId)
    .eq("message_key", messageKey);

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}
