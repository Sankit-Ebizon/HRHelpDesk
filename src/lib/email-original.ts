import { format } from "date-fns";
import type { Ticket, TicketComment } from "@/types";

export interface OriginalEmailSource {
  messageId: string;
  from: string;
  to: string;
  date: string;
  subject: string;
  threadSubject: string;
  returnPath: string;
  headers: string;
  html: string;
  text: string;
  attachmentCount: number;
  attachmentSize: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSyntheticHeaders(options: {
  from: string;
  to: string;
  date: string;
  subject: string;
  messageId: string;
  returnPath: string;
}): string {
  return [
    `Message-ID: ${options.messageId}`,
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Date: ${options.date}`,
    `Subject: ${options.subject}`,
    `Thread-Topic: ${options.subject}`,
    `Return-Path: ${options.returnPath}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
  ].join("\r\n");
}

export function getOriginalEmailSourceForTicket(
  ticket: Ticket,
  supportEmail: string,
  attachmentCount = 0,
  attachmentSize = 0
): OriginalEmailSource {
  const to = supportEmail.split(",")[0]?.trim() || "support@helpdesk.local";
  const from = `"${ticket.contact_name}" <${ticket.contact_email}>`;
  const date = format(new Date(ticket.created_at), "EEE, MMM d, yyyy 'at' hh:mm a '(Incoming)'");
  const messageId =
    ticket.inbound_message_id ||
    `<ticket-${ticket.ticket_number.replace(/[^a-zA-Z0-9]/g, "")}@hrhelpdesk.local>`;

  const headers =
    ticket.raw_email_headers ||
    buildSyntheticHeaders({
      from,
      to: `"Helpdesk Support" <${to}>`,
      date,
      subject: ticket.subject,
      messageId,
      returnPath: `<${ticket.contact_email}>`,
    });

  return {
    messageId,
    from,
    to: `"Helpdesk Support" <${to}>`,
    date,
    subject: ticket.subject,
    threadSubject: ticket.subject,
    returnPath: `<${ticket.contact_email}>`,
    headers,
    html: ticket.raw_email_html || ticket.description,
    text: ticket.raw_email_text || ticket.description.replace(/<[^>]*>/g, " "),
    attachmentCount,
    attachmentSize,
  };
}

export function getOriginalEmailSourceForComment(
  comment: TicketComment,
  ticket: Ticket,
  supportEmail: string,
  attachmentCount = 0,
  attachmentSize = 0
): OriginalEmailSource {
  const to = ticket.contact_email;
  const from = `"${comment.author_name}" <${comment.author_email || supportEmail}>`;
  const date = format(new Date(comment.created_at), "EEE, MMM d, yyyy 'at' hh:mm a");
  const subject = `Re: ${ticket.ticket_number} - ${ticket.subject}`;
  const messageId = `<comment-${comment.id}@hrhelpdesk.local>`;

  const headers =
    comment.raw_email_headers ||
    buildSyntheticHeaders({
      from,
      to: `"${ticket.contact_name}" <${to}>`,
      date,
      subject,
      messageId,
      returnPath: `<${comment.author_email || supportEmail}>`,
    });

  return {
    messageId,
    from,
    to: `"${ticket.contact_name}" <${to}>`,
    date,
    subject,
    threadSubject: ticket.subject,
    returnPath: `<${comment.author_email || supportEmail}>`,
    headers,
    html: comment.raw_email_html || comment.content,
    text: comment.raw_email_text || comment.content.replace(/<[^>]*>/g, " "),
    attachmentCount,
    attachmentSize,
  };
}

export function buildOriginalPageHtml(source: OriginalEmailSource, tab: "header" | "content"): string {
  const body =
    tab === "header"
      ? `<pre style="white-space:pre-wrap;word-break:break-word;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.5;">${escapeHtml(source.headers)}</pre>`
      : `<div class="email-html-content">${source.html}</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Original Message</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f5f7f9; color: #222; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; }
    .head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #e5e7eb; }
    .meta { width:100%; border-collapse:collapse; }
    .meta td { padding:10px 20px; border-bottom:1px solid #f0f0f0; font-size:13px; vertical-align:top; }
    .meta td:first-child { width:160px; color:#666; font-weight:600; }
    .tabs { display:flex; gap:24px; padding:0 20px; border-bottom:1px solid #e5e7eb; }
    .tab { padding:12px 0; font-size:13px; font-weight:600; color:#666; text-decoration:none; }
    .tab.active { color:#1a73b5; border-bottom:2px solid #1a73b5; }
    .body { padding:20px; }
    .email-html-content { font-size:13px; line-height:1.55; }
    .email-html-content img { max-width:100%; height:auto; }
    .email-html-content table { border-collapse:collapse; }
    .email-html-content a { color:#1a73b5; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="head">
        <h1 style="margin:0;font-size:18px;">Original Message</h1>
        <button onclick="window.print()" style="border:1px solid #ddd;background:#fff;padding:6px 10px;border-radius:4px;cursor:pointer;">Print</button>
      </div>
      <table class="meta">
        <tr><td>Message ID</td><td>${escapeHtml(source.messageId)}</td></tr>
        <tr><td>From</td><td>${escapeHtml(source.from)}</td></tr>
        <tr><td>To</td><td>${escapeHtml(source.to)}</td></tr>
        <tr><td>Date</td><td>${escapeHtml(source.date)}</td></tr>
        <tr><td>Subject</td><td>${escapeHtml(source.subject)}</td></tr>
        <tr><td>Thread Subject</td><td>${escapeHtml(source.threadSubject)}</td></tr>
        <tr><td>Return-Path</td><td>${escapeHtml(source.returnPath)}</td></tr>
        <tr><td>Attachments</td><td>${source.attachmentCount} Attachment${source.attachmentCount === 1 ? "" : "s"} (${(source.attachmentSize / 1024).toFixed(1)} KB)</td></tr>
      </table>
      <div class="tabs">
        <a class="tab ${tab === "header" ? "active" : ""}" href="?tab=header">HEADER</a>
        <a class="tab ${tab === "content" ? "active" : ""}" href="?tab=content">CONTENT</a>
      </div>
      <div class="body">${body}</div>
    </div>
  </div>
</body>
</html>`;
}
