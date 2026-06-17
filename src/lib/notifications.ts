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

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    ticket_id: params.ticketId,
    type: params.type,
    title: params.title,
    message: params.message,
  }));

  await supabase.from("notifications").insert(notifications);

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, email_enabled")
    .in("user_id", userIds)
    .eq("type", params.type);

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  for (const user of users || []) {
    const pref = prefs?.find((p) => p.user_id === user.id);
    if (pref && !pref.email_enabled) continue;

    await sendEmailNotification({
      to: user.email,
      subject: params.title,
      html: `<p>${params.message}</p>`,
    });
  }
}

export { sendEmailNotification } from "@/lib/email";
