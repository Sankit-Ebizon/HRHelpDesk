import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USER_ROLE_LABELS, type UserRole } from "@/types";

export function createInviteToken(): string {
  return randomBytes(32).toString("hex");
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data.users.length) return null;

    const user = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail
    );
    if (user) return user;

    if (data.users.length < 1000) return null;
    page += 1;
  }
}

export async function cleanupUserForReinvite(
  admin: SupabaseClient,
  email: string
): Promise<{ error?: string }> {
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.status === "active") {
    return { error: "A user with this email is already active." };
  }

  const authUser = await findAuthUserByEmail(admin, email);
  const userId = authUser?.id ?? existingProfile?.id;

  if (!userId) return {};

  await admin.from("invite_tokens").delete().eq("user_id", userId);

  if (existingProfile) {
    await admin.from("profiles").delete().eq("id", userId);
  }

  if (authUser) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !existingProfile) {
      return { error: error.message };
    }
  }

  return {};
}

export function buildInviteEmailHtml(params: {
  fullName: string;
  acceptUrl: string;
  rejectUrl: string;
  inviterName: string;
  role: UserRole;
}) {
  const roleLabel = USER_ROLE_LABELS[params.role];

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">HR Helpdesk</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#18181b;">You're invited to join</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
                Hi ${params.fullName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
                <strong>${params.inviterName}</strong> has invited you to join HR Helpdesk as <strong>${roleLabel}</strong>.
                Accept the invitation, then use <strong>Forgot password</strong> on the login page to create your password.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${params.acceptUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                      Accept invitation
                    </a>
                  </td>
                  <td>
                    <a href="${params.rejectUrl}" style="display:inline-block;padding:12px 24px;background:#f4f4f5;color:#52525b;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #e4e4e7;">
                      Decline invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">
                If you weren't expecting this invitation, you can safely decline it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
