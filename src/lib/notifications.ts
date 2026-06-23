import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmailNotification } from "@/lib/email";

interface CreateNotificationParams {
  type: string;
  ticketId: string;
  title: string;
  message: string;
  targetUserId?: string;
  excludeUserId?: string;
}

type PrefRow = {
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
};

function isNotificationEnabled(
  prefs: PrefRow[] | null | undefined,
  userId: string,
  field: "email_enabled" | "in_app_enabled"
) {
  const pref = prefs?.find((p) => p.user_id === userId);
  if (!pref) return true;
  return pref[field];
}

export async function createNotification(params: CreateNotificationParams) {
  const supabase = createServiceClient();

  let userIds: string[] = [];

  if (params.targetUserId) {
    userIds = [params.targetUserId];
  } else {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("status", "active")
      .in("role", ["administrator", "hr_manager", "hr_agent"]);

    userIds = (users || [])
      .filter((u) => u.id !== params.excludeUserId)
      .map((u) => u.id);
  }

  if (userIds.length === 0) return;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, email_enabled, in_app_enabled")
    .in("user_id", userIds)
    .eq("type", params.type);

  const inAppUserIds = userIds.filter((userId) =>
    isNotificationEnabled(prefs, userId, "in_app_enabled")
  );

  if (inAppUserIds.length > 0) {
    await supabase.from("notifications").insert(
      inAppUserIds.map((userId) => ({
        user_id: userId,
        ticket_id: params.ticketId,
        type: params.type,
        title: params.title,
        message: params.message,
      }))
    );
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  for (const user of users || []) {
    if (!isNotificationEnabled(prefs, user.id, "email_enabled")) continue;

    await sendEmailNotification({
      to: user.email,
      subject: params.title,
      html: `<p>${params.message}</p>`,
    });
  }
}

export { sendEmailNotification } from "@/lib/email";
