import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { sendEmailNotification } from "@/lib/email";
import {
  downloadResendAttachment,
  fetchResendAttachments,
  fetchResendReceivedEmail,
  isResendWebhook,
  parseNameFromFromHeader,
  resendEventToInboundPayload,
  stripDisplayQuotes,
  verifyResendWebhook,
} from "@/lib/resend-webhook";

interface InboundEmailPayload {
  from: string;
  from_name?: string;
  subject: string;
  text?: string;
  html?: string;
  to: string;
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

function extractName(from: string, fromName?: string): string {
  if (fromName) return stripDisplayQuotes(fromName);
  return parseNameFromFromHeader(from);
}

async function parsePayload(request: NextRequest): Promise<InboundEmailPayload | null> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  try {
    const form = await request.formData();
    const sender = (form.get("sender") || form.get("from") || "") as string;
    const recipient = (form.get("recipient") || form.get("to") || "") as string;
    const subject = (form.get("subject") || "Email Support Request") as string;
    const text = (form.get("body-plain") || form.get("text") || form.get("stripped-text") || "") as string;
    const html = (form.get("body-html") || form.get("html") || "") as string;

    if (sender || recipient) {
      return { from: sender, to: recipient, subject, text, html };
    }
  } catch {
    // fall through
  }

  return null;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret");
  if (secret && secret === process.env.INBOUND_EMAIL_WEBHOOK_SECRET) return true;

  const mailgunToken = request.headers.get("x-mailgun-token");
  if (mailgunToken && process.env.MAILGUN_WEBHOOK_SIGNING_KEY) {
    return true;
  }

  return false;
}

async function saveInboundAttachments(ticketId: string, resendEmailId: string) {
  const supabase = createServiceClient();
  const attachments = await fetchResendAttachments(resendEmailId);

  for (const attachment of attachments) {
    const downloaded = await downloadResendAttachment(resendEmailId, attachment);
    if (!downloaded) continue;

    const safeName = downloaded.filename.replace(/[^\w.-]/g, "_");
    const filePath = `${ticketId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("ticket-attachments")
      .upload(filePath, downloaded.buffer, {
        contentType: downloaded.contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Attachment upload failed:", uploadError);
      continue;
    }

    const { error: insertError } = await supabase.from("ticket_attachments").insert({
      ticket_id: ticketId,
      file_name: downloaded.filename,
      file_path: filePath,
      file_size: downloaded.size,
      mime_type: downloaded.contentType,
    });

    if (insertError) {
      console.error("Attachment record failed:", insertError);
    }
  }
}

async function createTicketFromEmail(
  payload: InboundEmailPayload,
  options?: { resendEmailId?: string }
) {
  const supabase = createServiceClient();
  const { data: supportSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "support_email")
    .maybeSingle();

  const supportEmail = supportSetting?.value || process.env.HR_HELPDESK_EMAIL || "hrsupport@ebizondigital.com";
  const helpdeskEmails = supportEmail
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  const toAddress = payload.to?.toLowerCase() || "";
  const isHelpdeskEmail = helpdeskEmails.some(
    (email: string) => toAddress === email || toAddress.includes(email)
  );

  if (!isHelpdeskEmail) {
    return { error: "Not addressed to helpdesk inbox", status: 400 };
  }

  const contactEmail = extractEmailAddress(payload.from);
  const contactName = extractName(payload.from, payload.from_name);
  const description = payload.text || payload.html?.replace(/<[^>]*>/g, "") || payload.subject;

  let { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", contactEmail)
    .single();

  if (!contact) {
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({ full_name: contactName, email: contactEmail })
      .select("id")
      .single();
    contact = newContact;
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      subject: payload.subject || "Email Support Request",
      description,
      contact_id: contact?.id,
      contact_name: contactName,
      contact_email: contactEmail,
      priority: "medium",
      status: "open",
    })
    .select("id, ticket_number, subject")
    .single();

  if (error) {
    console.error("Ticket creation failed:", error);
    return { error: "Failed to create ticket", status: 500 };
  }

  if (options?.resendEmailId) {
    await saveInboundAttachments(ticket.id, options.resendEmailId);
  }

  await createNotification({
    type: "ticket_created",
    ticketId: ticket.id,
    title: `New Email Ticket: ${ticket.ticket_number}`,
    message: `${contactName} emailed: ${ticket.subject}`,
  });

  await sendEmailNotification({
    to: contactEmail,
    subject: `Ticket Created: ${ticket.ticket_number}`,
    html: `
      <p>Hi ${contactName},</p>
      <p>Your support request has been received and a ticket has been created.</p>
      <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p>You can track your ticket status at: ${process.env.NEXT_PUBLIC_APP_URL}/track</p>
    `,
  });

  return { success: true, ticket_number: ticket.ticket_number, status: 200 };
}

async function handleResendWebhook(request: NextRequest) {
  const rawBody = await request.text();
  const event = verifyResendWebhook(rawBody, request.headers);

  if (!event) {
    return NextResponse.json({ error: "Invalid Resend webhook signature" }, { status: 401 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  const email = await fetchResendReceivedEmail(event.data.email_id);
  if (!email) {
    return NextResponse.json({ error: "Failed to fetch email content" }, { status: 500 });
  }

  const payload = resendEventToInboundPayload(event, email);
  const result = await createTicketFromEmail(payload, { resendEmailId: event.data.email_id });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, ticket_number: result.ticket_number });
}

export async function POST(request: NextRequest) {
  if (isResendWebhook(request.headers)) {
    return handleResendWebhook(request);
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await parsePayload(request);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await createTicketFromEmail(payload);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, ticket_number: result.ticket_number });
}
