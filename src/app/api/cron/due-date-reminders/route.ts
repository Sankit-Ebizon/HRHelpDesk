import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmailNotification } from "@/lib/email";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  // Allow manual trigger in development
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, due_date, owner_id, contact_email, owner:profiles(email, full_name)")
    .gte("due_date", now.toISOString())
    .lte("due_date", tomorrow.toISOString())
    .not("status", "eq", "closed");

  if (!tickets?.length) {
    return NextResponse.json({ message: "No due date reminders to send" });
  }

  for (const ticket of tickets) {
    const owner = ticket.owner as unknown as { email: string; full_name: string } | null;

    if (owner?.email) {
      await sendEmailNotification({
        to: owner.email,
        subject: `Due Date Reminder: ${ticket.ticket_number}`,
        html: `<p>Ticket <strong>${ticket.ticket_number}</strong> is due tomorrow.</p><p>${ticket.subject}</p>`,
      });

      await supabase.from("notifications").insert({
        user_id: ticket.owner_id!,
        ticket_id: ticket.id,
        type: "due_date_reminder",
        title: `Due Tomorrow: ${ticket.ticket_number}`,
        message: ticket.subject,
      });
    }
  }

  return NextResponse.json({ reminders_sent: tickets.length });
}
