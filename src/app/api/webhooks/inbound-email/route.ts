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
import { normalizeEmailContent, sanitizeEmailHtml } from "@/lib/email-html";
import { isInlineEmailAttachment } from "@/lib/ticket-conversation";
import { uploadBufferToOneDrive } from "@/lib/onedrive";
import type { TicketAttachment } from "@/types";

interface InboundEmailPayload {
  from: string;
  from_name?: string;
  subject: string;
  text?: string;
  html?: string;
  to: string;
  headers?: Record<string, string>;
}

interface InboundRoutingDebug {
  parsedSenderEmail?: string;
  normalizedSubject?: string;
  replyHeaders?: {
    isReplySubject: boolean;
    hasReplyHeaders: boolean;
    inReplyTo: string;
    references: string;
  };
  chosenTicketId?: string | null;
  chosenTicketNumber?: string | null;
  matchStrategy?: string;
}

function logInboundRoutingDebug(debug: InboundRoutingDebug) {
  console.info("[inbound-email][debug]", JSON.stringify(debug));
}

function logInboundStep(step: string, payload: Record<string, unknown>) {
  // Use error level so logs are visible in local/dev and serverless logs.
  console.error(`[inbound-email][${step}]`, JSON.stringify(payload));
}

function extractEmailAddress(from: string): string {
  const bracketMatch = from.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1].toLowerCase().trim();
  }

  // Outlook and webhook payloads can send "Name email@domain.com" without angle brackets.
  const plainMatch = from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (plainMatch?.[0]) {
    return plainMatch[0].toLowerCase().trim();
  }

  return from.toLowerCase().trim();
}

function extractName(from: string, fromName?: string): string {
  if (fromName) return stripDisplayQuotes(fromName);
  const cleanedFrom = from.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, "").trim();
  if (cleanedFrom) {
    return stripDisplayQuotes(cleanedFrom.replace(/[<>]/g, "").trim());
  }
  return parseNameFromFromHeader(from);
}

function extractAddresses(value?: string): string[] {
  if (!value) return [];
  const matches = Array.from(value.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g));
  return matches.map((m) => m[0].toLowerCase());
}

function headerValue(
  headers: Record<string, string> | undefined,
  key: string
): string | undefined {
  if (!headers) return undefined;
  const wanted = key.toLowerCase();
  const found = Object.entries(headers).find(([k]) => k.toLowerCase() === wanted);
  return found?.[1];
}

function extractTicketNumbersFromText(text: string): string[] {
  const matches = new Set<string>();
  const patterns = [
    /\b([A-Z][A-Z0-9]*-\d+)\b/gi,
    /\b(?:ticket|ticket\s*id|ticket\s*number)\s*[:#-]?\s*([A-Z][A-Z0-9]*-\d+)\b/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.add(match[1].toUpperCase());
    }
  }
  return Array.from(matches);
}

function normalizeThreadSubject(subject: string): string {
  return (subject || "")
    .toLowerCase()
    .replace(/^(re|fw|fwd)\s*:\s*/gi, "")
    .replace(/\b[A-Z][A-Z0-9]*-\d+\b/gi, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isReplyLikeSubject(subject: string): boolean {
  return /^(re|fw|fwd)\s*:/i.test((subject || "").trim());
}

function subjectThreadMatches(incomingNormalized: string, ticketSubject: string): boolean {
  const normalizedTicket = normalizeThreadSubject(ticketSubject || "");
  if (!incomingNormalized || !normalizedTicket) return false;
  if (incomingNormalized === normalizedTicket) return true;
  if (incomingNormalized.length >= 5 && normalizedTicket.includes(incomingNormalized)) return true;
  if (normalizedTicket.length >= 5 && incomingNormalized.includes(normalizedTicket)) return true;
  return false;
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

async function saveInboundAttachments(
  ticketId: string,
  ticketNumber: string,
  resendEmailId: string,
  emailContent?: { html?: string; text?: string },
  options?: { commentId?: string }
) {
  const supabase = createServiceClient();
  const attachments = await fetchResendAttachments(resendEmailId);
  const emailBody = emailContent?.html || emailContent?.text || "";

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

    const baseRecord = {
      ticket_id: ticketId,
      comment_id: options?.commentId || null,
      file_name: downloaded.filename,
      file_path: filePath,
      file_size: downloaded.size,
      mime_type: downloaded.contentType,
    };

    const inlineProbe = {
      ...baseRecord,
      id: "",
      uploaded_by: null,
      created_at: "",
    } as TicketAttachment;
    const isInline = isInlineEmailAttachment(inlineProbe, emailBody);

    let insertedId: string | null = null;

    const { data: inserted, error: insertError } = await supabase
      .from("ticket_attachments")
      .insert({ ...baseRecord, source: "email" })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.message?.includes("source")) {
        const { data: retried, error: retryError } = await supabase
          .from("ticket_attachments")
          .insert(baseRecord)
          .select("id")
          .single();
        if (retryError) {
          console.error("Attachment record failed:", retryError);
          continue;
        }
        insertedId = retried?.id ?? null;
      } else {
        console.error("Attachment record failed:", insertError);
        continue;
      }
    } else {
      insertedId = inserted?.id ?? null;
    }

    if (!insertedId || isInline) continue;

    const oneDrive = await uploadBufferToOneDrive({
      buffer: downloaded.buffer,
      fileName: downloaded.filename,
      ticketNumber,
      contentType: downloaded.contentType,
    });

    if (oneDrive) {
      const { error: updateError } = await supabase
        .from("ticket_attachments")
        .update({
          onedrive_url: oneDrive.webUrl,
          onedrive_item_id: oneDrive.itemId,
        })
        .eq("id", insertedId);

      if (updateError?.message?.includes("onedrive")) {
        console.warn("OneDrive URL not saved — run migration 020:", updateError.message);
      } else if (updateError) {
        console.error("Failed to save OneDrive URL:", updateError);
      }
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

  const toHeader = headerValue(payload.headers, "to");
  const ccHeader = headerValue(payload.headers, "cc");
  const deliveredTo = headerValue(payload.headers, "delivered-to");
  const recipientAddresses = [
    ...extractAddresses(payload.to),
    ...extractAddresses(toHeader),
    ...extractAddresses(ccHeader),
    ...extractAddresses(deliveredTo),
  ];
  const isHelpdeskEmail = helpdeskEmails.some(
    (email: string) =>
      recipientAddresses.includes(email) || recipientAddresses.some((address) => address.includes(email))
  );

  if (!isHelpdeskEmail) {
    logInboundStep("rejected_not_helpdesk_recipient", {
      to: payload.to,
      toHeader,
      ccHeader,
      deliveredTo,
      recipientAddresses,
      helpdeskEmails,
      subject: payload.subject,
    });
    return { error: "Not addressed to helpdesk inbox", status: 400 };
  }

  const contactEmail = extractEmailAddress(payload.from);
  const contactName = extractName(payload.from, payload.from_name);
  const rawDescription = payload.html?.trim() || payload.text || payload.subject;
  const description = sanitizeEmailHtml(rawDescription);

  const syntheticHeaders = [
    `From: ${payload.from}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject || "Email Support Request"}`,
    "MIME-Version: 1.0",
    payload.html ? 'Content-Type: text/html; charset="UTF-8"' : 'Content-Type: text/plain; charset="UTF-8"',
  ].join("\r\n");

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

  const normalizedSubject = (payload.subject || "")
    .replace(/^(re|fw|fwd)\s*:\s*/gi, "")
    .replace(/\b[A-Z][A-Z0-9]*-\d+\b/gi, "")
    .replace(/\s*-\s*/g, " ")
    .trim();
  const normalizedThreadSubject = normalizeThreadSubject(payload.subject || "");
  const ticketNumbers = extractTicketNumbersFromText(
    [payload.subject || "", payload.text || "", payload.html || ""].join("\n")
  );
  const isReplySubject = /^(re|fw|fwd)\s*:/i.test(payload.subject || "");
  const inReplyToHeader = headerValue(payload.headers, "in-reply-to") || "";
  const referencesHeader = headerValue(payload.headers, "references") || "";
  const hasReplyHeaders = Boolean(inReplyToHeader || referencesHeader);
  const isReplyIntent = isReplySubject || hasReplyHeaders;
  let matchStrategy = "new_ticket";

  logInboundStep("parsed_inbound", {
    from: payload.from,
    parsedSenderEmail: contactEmail,
    subject: payload.subject,
    normalizedSubject: normalizedThreadSubject,
    isReplySubject,
    hasReplyHeaders,
    inReplyToHeader,
    referencesHeader,
    recipientAddresses,
  });

  let existingTicketId: string | null = null;
  let existingTicketNumber: string | null = null;
  let existingTicketSubject: string | null = null;
  let existingTicketStatus: string | null = null;

  if (ticketNumbers.length > 0) {
    const { data: existingByNumber } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, status, updated_at")
      .in("ticket_number", ticketNumbers)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingByNumber) {
      matchStrategy = "ticket_number";
      existingTicketId = existingByNumber.id;
      existingTicketNumber = existingByNumber.ticket_number;
      existingTicketSubject = existingByNumber.subject;
      existingTicketStatus = existingByNumber.status || null;
    }
    logInboundStep("match_ticket_number", {
      ticketNumbers,
      matched: Boolean(existingByNumber),
      chosenTicketId: existingByNumber?.id || null,
    });
  }

  if (!existingTicketId) {
    const referenceText = `${inReplyToHeader} ${referencesHeader}`;
    const referencedMessageIds = Array.from(
      referenceText.matchAll(/<([^>]+)>/g),
      (match) => match[1]
    );

    if (referencedMessageIds.length > 0) {
      const { data: existingByMessageId } = await supabase
        .from("tickets")
        .select("id, ticket_number, subject, status")
        .in("inbound_message_id", referencedMessageIds)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingByMessageId) {
        matchStrategy = "message_id_header";
        existingTicketId = existingByMessageId.id;
        existingTicketNumber = existingByMessageId.ticket_number;
        existingTicketSubject = existingByMessageId.subject;
        existingTicketStatus = existingByMessageId.status || null;
      }
      logInboundStep("match_message_headers", {
        referencedMessageIds,
        matched: Boolean(existingByMessageId),
        chosenTicketId: existingByMessageId?.id || null,
      });
    }
  }

  if (!existingTicketId && isReplySubject && normalizedSubject) {
    const { data: latestByContact } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, status")
      .eq("contact_email", contactEmail)
      .ilike("subject", `%${normalizedSubject}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestByContact) {
      matchStrategy = "reply_subject_contact";
      existingTicketId = latestByContact.id;
      existingTicketNumber = latestByContact.ticket_number;
      existingTicketSubject = latestByContact.subject;
      existingTicketStatus = latestByContact.status || null;
    }
    logInboundStep("match_reply_subject_contact", {
      normalizedSubject,
      matched: Boolean(latestByContact),
      chosenTicketId: latestByContact?.id || null,
    });
  }

  if (!existingTicketId && normalizedThreadSubject) {
    const { data: candidateTickets } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, status, updated_at")
      .eq("contact_email", contactEmail)
      .order("updated_at", { ascending: false })
      .limit(100);

    const matchedThreadCandidates = (candidateTickets || []).filter((ticket) =>
      subjectThreadMatches(normalizedThreadSubject, ticket.subject || "")
    );

    // Prefer the original thread subject (non Re/Fwd), then most recently active.
    matchedThreadCandidates.sort((a, b) => {
      const aReply = isReplyLikeSubject(a.subject || "");
      const bReply = isReplyLikeSubject(b.subject || "");
      if (aReply !== bReply) return aReply ? 1 : -1;
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });
    const matchedByThread = matchedThreadCandidates[0];

    if (matchedByThread) {
      matchStrategy = "normalized_thread_subject";
      existingTicketId = matchedByThread.id;
      existingTicketNumber = matchedByThread.ticket_number;
      existingTicketSubject = matchedByThread.subject;
      existingTicketStatus = matchedByThread.status || null;
    }
    logInboundStep("match_normalized_thread_subject", {
      normalizedThreadSubject,
      matched: Boolean(matchedByThread),
      chosenTicketId: matchedByThread?.id || null,
      candidateCount: candidateTickets?.length || 0,
    });
  }

  // Hard guard: replies should stay in a prior ticket, never spawn "Re: ..." duplicates.
  if (!existingTicketId && isReplyIntent) {
    const { data: latestByContactAnySubject } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, status")
      .eq("contact_email", contactEmail)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestByContactAnySubject) {
      matchStrategy = "reply_intent_latest_contact_ticket";
      existingTicketId = latestByContactAnySubject.id;
      existingTicketNumber = latestByContactAnySubject.ticket_number;
      existingTicketSubject = latestByContactAnySubject.subject;
      existingTicketStatus = latestByContactAnySubject.status || null;
    }
    logInboundStep("match_reply_intent_latest_contact_ticket", {
      isReplyIntent,
      matched: Boolean(latestByContactAnySubject),
      chosenTicketId: latestByContactAnySubject?.id || null,
    });
  }

  if (existingTicketId && existingTicketNumber) {
    if (!existingTicketStatus) {
      const { data: currentTicket } = await supabase
        .from("tickets")
        .select("status")
        .eq("id", existingTicketId)
        .maybeSingle();
      existingTicketStatus = currentTicket?.status || null;
    }

    if (existingTicketStatus === "closed") {
      await supabase
        .from("tickets")
        .update({
          status: "reopened",
          closed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTicketId);
      logInboundStep("reopened_closed_ticket_on_reply", {
        ticketId: existingTicketId,
        ticketNumber: existingTicketNumber,
      });
    }

    const { data: replyComment, error: replyError } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: existingTicketId,
        author_id: null,
        author_name: contactName,
        author_email: contactEmail,
        content: description,
        comment_type: "reply",
        raw_email_headers: syntheticHeaders,
        raw_email_html: payload.html || null,
        raw_email_text: payload.text || null,
      })
      .select("id")
      .single();

    if (replyError) {
      console.error("Reply append failed:", replyError);
      return { error: "Failed to append reply to ticket", status: 500 };
    }

    if (options?.resendEmailId) {
      await saveInboundAttachments(
        existingTicketId,
        existingTicketNumber,
        options.resendEmailId,
        {
          html: payload.html,
          text: payload.text,
        },
        { commentId: replyComment.id }
      );
    }

    const { data: imageAttachment } = await supabase
      .from("ticket_attachments")
      .select("id")
      .eq("ticket_id", existingTicketId)
      .eq("comment_id", replyComment.id)
      .like("mime_type", "image/%")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const inlineImageUrl = imageAttachment?.id
      ? `/api/attachments/${imageAttachment.id}/download`
      : undefined;
    const normalizedReply = normalizeEmailContent(rawDescription, inlineImageUrl);

    await supabase
      .from("ticket_comments")
      .update({ content: normalizedReply })
      .eq("id", replyComment.id);

    await createNotification({
      type: "ticket_reply",
      ticketId: existingTicketId,
      title: `New Email Reply: ${existingTicketNumber}`,
      message: `${contactName} replied on: ${existingTicketSubject || payload.subject}`,
    });

    const debug: InboundRoutingDebug = {
      parsedSenderEmail: contactEmail,
      normalizedSubject: normalizedThreadSubject,
      replyHeaders: {
        isReplySubject,
        hasReplyHeaders,
        inReplyTo: inReplyToHeader,
        references: referencesHeader,
      },
      chosenTicketId: existingTicketId,
      chosenTicketNumber: existingTicketNumber,
      matchStrategy,
    };
    logInboundRoutingDebug(debug);
    logInboundStep("appended_reply_existing_ticket", {
      ticketId: existingTicketId,
      ticketNumber: existingTicketNumber,
      matchStrategy,
    });
    return { success: true, ticket_number: existingTicketNumber, status: 200, debug };
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
      raw_email_headers: syntheticHeaders,
      raw_email_html: payload.html || null,
      raw_email_text: payload.text || null,
      inbound_message_id: options?.resendEmailId || null,
    })
    .select("id, ticket_number, subject")
    .single();

  if (error) {
    console.error("Ticket creation failed:", error);
    return { error: "Failed to create ticket", status: 500 };
  }

  if (options?.resendEmailId) {
    await saveInboundAttachments(ticket.id, ticket.ticket_number, options.resendEmailId, {
      html: payload.html,
      text: payload.text,
    });
  }

  const { data: imageAttachment } = await supabase
    .from("ticket_attachments")
    .select("id")
    .eq("ticket_id", ticket.id)
    .like("mime_type", "image/%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const inlineImageUrl = imageAttachment?.id
    ? `/api/attachments/${imageAttachment.id}/download`
    : undefined;
  const normalizedDescription = normalizeEmailContent(rawDescription, inlineImageUrl);

  await supabase
    .from("tickets")
    .update({ description: normalizedDescription })
    .eq("id", ticket.id);

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

  const debug: InboundRoutingDebug = {
    parsedSenderEmail: contactEmail,
    normalizedSubject: normalizedThreadSubject,
    replyHeaders: {
      isReplySubject,
      hasReplyHeaders,
      inReplyTo: inReplyToHeader,
      references: referencesHeader,
    },
    chosenTicketId: ticket.id,
    chosenTicketNumber: ticket.ticket_number,
    matchStrategy,
  };
  logInboundRoutingDebug(debug);
  logInboundStep("created_new_ticket", {
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    matchStrategy,
  });
  return { success: true, ticket_number: ticket.ticket_number, status: 200, debug };
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

  logInboundStep("resend_event_received", {
    type: event.type,
    emailId: event.data.email_id,
    from: event.data.from,
    to: event.data.to,
    subject: event.data.subject,
  });

  const email = await fetchResendReceivedEmail(event.data.email_id);
  if (!email) {
    return NextResponse.json({ error: "Failed to fetch email content" }, { status: 500 });
  }

  const payload = resendEventToInboundPayload(event, email);
  const result = await createTicketFromEmail(payload, { resendEmailId: event.data.email_id });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    ticket_number: result.ticket_number,
    debug: result.debug,
  });
}

export async function POST(request: NextRequest) {
  logInboundStep("webhook_received", {
    isResend: isResendWebhook(request.headers),
    contentType: request.headers.get("content-type"),
    host: request.headers.get("host"),
  });
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

  return NextResponse.json({
    success: true,
    ticket_number: result.ticket_number,
    debug: result.debug,
  });
}
