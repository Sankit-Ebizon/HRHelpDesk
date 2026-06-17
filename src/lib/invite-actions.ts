import { createServiceClient } from "@/lib/supabase/admin";

export type InviteTokenResult =
  | {
      ok: true;
      tokenId: string;
      userId: string;
      email: string;
    }
  | {
      ok: false;
      reason: "invalid" | "expired" | "used";
    };

export async function validateInviteToken(token: string): Promise<InviteTokenResult> {
  if (!token) return { ok: false, reason: "invalid" };

  const admin = createServiceClient();
  const { data: inviteToken } = await admin
    .from("invite_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!inviteToken) return { ok: false, reason: "invalid" };
  if (inviteToken.used_at) return { ok: false, reason: "used" };
  if (new Date(inviteToken.expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", inviteToken.user_id)
    .single();

  if (!profile?.email) return { ok: false, reason: "invalid" };

  return {
    ok: true,
    tokenId: inviteToken.id,
    userId: inviteToken.user_id,
    email: profile.email,
  };
}

export async function markInviteTokenUsed(tokenId: string) {
  const admin = createServiceClient();
  await admin
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId);
}

export async function rejectInvitation(userId: string, tokenId: string) {
  const admin = createServiceClient();
  await markInviteTokenUsed(tokenId);
  await admin.from("profiles").update({ status: "rejected" }).eq("id", userId);
  await admin.auth.admin.deleteUser(userId).catch(() => null);
}

export async function acceptInvitation(userId: string, tokenId: string) {
  const admin = createServiceClient();
  await markInviteTokenUsed(tokenId);
  await admin
    .from("profiles")
    .update({ status: "invited" })
    .eq("id", userId);
}

export async function activateProfileOnLogin(userId: string) {
  const admin = createServiceClient();
  await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", userId)
    .eq("status", "invited");
}
