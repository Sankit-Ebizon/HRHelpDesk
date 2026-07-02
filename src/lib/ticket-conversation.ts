import { format, parseISO } from "date-fns";
import { formatRelative } from "@/lib/utils";
import {
  emailTextFromContent,
  formatQuotedMessageBody,
  isHtmlContent,
  shouldFormatPlainEmail,
} from "@/lib/email-html";
import type { Profile, Ticket, TicketAttachment, TicketComment } from "@/types";

export interface EmailRecipient {
  name: string;
  email: string;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMessageTimestamp(date: string): string {
  const d = parseISO(date);
  return `${format(d, "hh:mm a")} (${formatRelative(date)})`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailSignature(profile: Profile, supportEmail?: string): string {
  const primaryEmail = supportEmail?.split(",")[0]?.trim() || profile.email;
  const departmentName = profile.department?.name;

  return `
    <div data-email-signature="true" style="margin-top:16px;padding-top:12px;border-top:1px solid #e8e8e8;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333;line-height:1.5;">
      <p style="margin:0 0 4px;">Kind regards,</p>
      <p style="margin:0;font-weight:bold;">${escapeHtml(profile.full_name)}</p>
      ${departmentName ? `<p style="margin:4px 0 0;color:#555;">${escapeHtml(departmentName)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #ddd;margin:10px 0;" />
      <p style="margin:0;"><a href="mailto:${escapeHtml(primaryEmail)}" style="color:#1a73b5;text-decoration:none;">${escapeHtml(primaryEmail)}</a></p>
    </div>
  `.trim();
}

export function buildQuotedThread(options: {
  authorName: string;
  authorEmail: string;
  createdAt: string;
  content: string;
  isHtml?: boolean;
  inlineImageUrl?: string;
}): string {
  const date = new Date(options.createdAt).toUTCString();
  const source =
    options.isHtml && !shouldFormatPlainEmail(options.content)
      ? options.content
      : emailTextFromContent(options.content);
  const body = formatQuotedMessageBody(source, options.inlineImageUrl);

  return `
    <div class="email-quoted-thread" style="margin-top:16px;padding-top:12px;border-top:1px solid #d9d9d9;">
      <p style="font-size:12px;color:#666;margin:0 0 10px;">
        --- on ${escapeHtml(date)} "${escapeHtml(options.authorName)}" &lt;${escapeHtml(options.authorEmail)}&gt; wrote ---
      </p>
      <div style="color:#555;">${body}</div>
    </div>
  `.trim();
}

export function buildForwardBody(options: {
  ticket: Ticket;
  comments: TicketComment[];
  messageId?: string;
  supportEmail: string;
  inlineImageUrl?: string;
}): string {
  const { ticket, comments, messageId, supportEmail, inlineImageUrl } = options;

  let authorName = ticket.contact_name;
  let authorEmail = ticket.contact_email;
  let createdAt = ticket.created_at;
  let content = ticket.description;
  let isHtml = isHtmlContent(ticket.description);

  if (messageId && messageId !== "initial") {
    const comment = comments.find((c) => c.id === messageId && c.comment_type === "reply");
    if (comment) {
      authorName = comment.author_name;
      authorEmail = comment.author_email || ticket.contact_email;
      createdAt = comment.created_at;
      content = comment.content;
      isHtml = true;
    }
  }

  const dateStr = new Date(createdAt).toUTCString();
  const toEmail = supportEmail.split(",")[0]?.trim() || "support";
  const source =
    isHtml && !shouldFormatPlainEmail(content) ? content : emailTextFromContent(content);
  const body = formatQuotedMessageBody(source, inlineImageUrl);

  return `
    <p style="margin:0 0 12px;font-size:13px;color:#222;line-height:1.55;">=========== Forwarded Message ===========</p>
    <p style="margin:0 0 4px;font-size:13px;color:#222;line-height:1.55;">From: "${escapeHtml(authorName)}" &lt;${escapeHtml(authorEmail)}&gt;</p>
    <p style="margin:0 0 4px;font-size:13px;color:#222;line-height:1.55;">To: "Helpdesk Support" &lt;${escapeHtml(toEmail)}&gt;</p>
    <p style="margin:0 0 4px;font-size:13px;color:#222;line-height:1.55;">Date: ${escapeHtml(dateStr)}</p>
    <p style="margin:0 0 12px;font-size:13px;color:#222;line-height:1.55;">Subject: ${escapeHtml(ticket.subject)}</p>
    <p style="margin:0 0 12px;font-size:13px;color:#222;line-height:1.55;">=========== Forwarded Message ===========</p>
    ${body}
  `.trim();
}

export function getForwardSubject(ticket: Ticket): string {
  return `Fwd: ${ticket.ticket_number} - ${ticket.subject}`;
}

function attachmentDownloadUrl(attachment: TicketAttachment): string {
  return `/api/attachments/${attachment.id}/download`;
}

function isSignatureInlineFilename(fileName: string): boolean {
  return /^(image|img|photo|logo|sig|picture|avatar|portrait|headshot)([\s_-]?\d*)?\.(png|jpe?g|gif|webp)$/i.test(
    fileName
  );
}

function contentReferencesAttachment(content: string, attachment: TicketAttachment): boolean {
  const contentLower = content.toLowerCase();
  const fileName = attachment.file_name.toLowerCase();
  const baseName = fileName.replace(/\.[^.]+$/, "");

  if (contentLower.includes(`/api/attachments/${attachment.id.toLowerCase()}/download`)) {
    return true;
  }

  const cidRefs = [...content.matchAll(/(?:cid:|\[cid:)([^\]"'\s>]+)/gi)].map((match) =>
    match[1].toLowerCase()
  );
  if (
    cidRefs.some(
      (ref) =>
        ref.includes(baseName) ||
        baseName.includes(ref.split("@")[0].replace(/\.(png|jpe?g|gif|webp)$/, ""))
    )
  ) {
    return true;
  }

  return contentLower.includes(fileName) || contentLower.includes(baseName);
}

function isLikelyBodyScreenshot(attachment: TicketAttachment, emailContent?: string): boolean {
  const fileName = attachment.file_name.toLowerCase();
  if (/screenshot|frame\s*\d|capture|snap|scan/i.test(fileName)) return true;
  if ((attachment.file_size ?? 0) > 750_000) return true;

  const plain = emailContent?.replace(/<[^>]+>/g, " ").toLowerCase() ?? "";
  return /\b(attached image|see attached|inline image|screenshot|as shown below|please find)\b/.test(
    plain
  );
}

/** True when an image belongs to the email signature block (not a body screenshot). */
export function isSignatureInlineAttachment(
  attachment: TicketAttachment,
  emailContent?: string
): boolean {
  if (attachment.uploaded_by != null || attachment.comment_id) return false;
  if (!attachment.mime_type?.startsWith("image/")) return false;
  if (isLikelyBodyScreenshot(attachment, emailContent)) return false;

  const fileName = attachment.file_name.toLowerCase();

  if (isSignatureInlineFilename(fileName)) {
    if (!emailContent) return true;
    if (/kind regards|best regards|warm regards|sincerely|email-signature-block|regards,/i.test(emailContent)) {
      return true;
    }
    if (contentReferencesAttachment(emailContent, attachment)) {
      return true;
    }
    return /email-signature-block/i.test(emailContent);
  }

  if (!emailContent) return false;

  return false;
}

/** True when an image is embedded in the message body (screenshots, inline attachments). */
export function isBodyInlineAttachment(
  attachment: TicketAttachment,
  attachments: TicketAttachment[],
  emailContent?: string
): boolean {
  if (attachment.uploaded_by != null || attachment.comment_id) return false;
  if (!attachment.mime_type?.startsWith("image/")) return false;
  if (isSignatureInlineAttachment(attachment, emailContent)) return false;

  const bodyUrl = getBodyInlineImageUrl(attachments, emailContent);
  return bodyUrl === attachmentDownloadUrl(attachment);
}

export function getBodyInlineImageUrl(
  attachments: TicketAttachment[],
  emailContent?: string
): string | undefined {
  const images = attachments.filter((att) => att.mime_type?.startsWith("image/"));
  const bodyImages = images.filter((att) => !isSignatureInlineAttachment(att, emailContent));
  if (bodyImages.length === 0) return undefined;

  if (emailContent) {
    for (const attachment of bodyImages) {
      if (contentReferencesAttachment(emailContent, attachment)) {
        return attachmentDownloadUrl(attachment);
      }
    }

    const plain = emailContent.replace(/<[^>]+>/g, " ").toLowerCase();
    if (
      /\b(attached image|see attached|inline image|screenshot|as shown below|please find)\b/.test(plain)
    ) {
      if (bodyImages.length === 1) {
        return attachmentDownloadUrl(bodyImages[0]);
      }
    }

    if (/\[cid:/i.test(emailContent) || /src=["']cid:/i.test(emailContent)) {
      const sorted = [...bodyImages].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0));
      return attachmentDownloadUrl(sorted[0]);
    }
  }

  return undefined;
}

export function getEmailPrintImageUrls(
  attachments: TicketAttachment[],
  content: string,
  fallbackSignatureUrl?: string
): {
  signatureImageUrl?: string;
  bodyImageUrl?: string;
  attachmentImageUrls: string[];
} {
  const imageAttachments = attachments.filter((att) => att.mime_type?.startsWith("image/"));
  const attachmentImageUrls = imageAttachments.map(
    (att) => `/api/attachments/${att.id}/download`
  );
  return {
    signatureImageUrl: getSignatureInlineImageUrl(attachments, content) ?? fallbackSignatureUrl,
    bodyImageUrl: getBodyInlineImageUrl(attachments, content),
    attachmentImageUrls,
  };
}

export function getSignatureInlineImageUrl(
  attachments: TicketAttachment[],
  emailContent?: string
): string | undefined {
  const images = attachments.filter(
    (att) => att.mime_type?.startsWith("image/") && isSignatureInlineAttachment(att, emailContent)
  );
  if (images.length === 0) return undefined;

  const scored = images.map((att) => {
    const name = att.file_name.toLowerCase();
    let score = 0;
    if (/^(image|photo|head|sig|profile|avatar|logo|pic)/i.test(name)) score += 100;
    if (/screenshot|screen.?shot|capture|snap|scan/i.test(name)) score -= 80;
    if ((att.file_size ?? 0) > 0 && (att.file_size ?? 0) < 250_000) score += 5;
    return { att, score };
  });

  scored.sort((a, b) => b.score - a.score || (a.att.created_at || "").localeCompare(b.att.created_at || ""));
  return attachmentDownloadUrl(scored[0].att);
}

export function buildFullThreadQuote(
  ticket: Ticket,
  comments: TicketComment[],
  messageId?: string,
  initialInlineImageUrl?: string
): string {
  const publicComments = comments.filter((c) => c.comment_type === "reply");

  if (messageId === "initial") {
    return buildQuotedThread({
      authorName: ticket.contact_name,
      authorEmail: ticket.contact_email,
      createdAt: ticket.created_at,
      content: ticket.description,
      isHtml: isHtmlContent(ticket.description),
      inlineImageUrl: initialInlineImageUrl,
    });
  }

  if (messageId) {
    const comment = publicComments.find((c) => c.id === messageId);
    if (comment) {
      return buildQuotedThread({
        authorName: comment.author_name,
        authorEmail: comment.author_email || ticket.contact_email,
        createdAt: comment.created_at,
        content: comment.content,
        isHtml: true,
      });
    }
  }

  const latest = publicComments[publicComments.length - 1];
  if (latest) {
    return buildQuotedThread({
      authorName: latest.author_name,
      authorEmail: latest.author_email || ticket.contact_email,
      createdAt: latest.created_at,
      content: latest.content,
      isHtml: true,
    });
  }

  return buildQuotedThread({
    authorName: ticket.contact_name,
    authorEmail: ticket.contact_email,
    createdAt: ticket.created_at,
    content: ticket.description,
    isHtml: isHtmlContent(ticket.description),
    inlineImageUrl: initialInlineImageUrl,
  });
}

function parseEmailHeaderLine(headers: string, name: string): string | undefined {
  const match = headers.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
}

export function parseRecipientList(value?: string): EmailRecipient[] {
  if (!value?.trim()) return [];

  const recipients: EmailRecipient[] = [];
  const parts = value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const bracketMatch = trimmed.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
    if (bracketMatch) {
      const email = bracketMatch[2].trim();
      const name = bracketMatch[1]?.trim() || email;
      recipients.push({ name, email });
      continue;
    }

    if (trimmed.includes("@")) {
      recipients.push({ name: trimmed, email: trimmed });
    }
  }

  return recipients;
}

function parseCcFromEmailContent(content?: string | null): EmailRecipient[] {
  if (!content) return [];

  const text = content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
  const ccLineMatch = text.match(/\bCc:\s*([^\n\r]+)/i);
  if (!ccLineMatch?.[1]) return [];

  return parseRecipientList(ccLineMatch[1]);
}

function getReplyTargetMessage(
  ticket: Ticket,
  comments: TicketComment[],
  messageId?: string
): { headers: string | null; content: string | null; sender: EmailRecipient } {
  const publicComments = comments.filter((comment) => comment.comment_type === "reply");

  if (messageId === "initial" || (!messageId && publicComments.length === 0)) {
    return {
      headers: ticket.raw_email_headers ?? null,
      content: ticket.raw_email_html || ticket.description,
      sender: {
        name: ticket.contact_name,
        email: ticket.contact_email,
      },
    };
  }

  const comment =
    messageId && messageId !== "initial"
      ? publicComments.find((entry) => entry.id === messageId)
      : publicComments[publicComments.length - 1];

  if (comment) {
    return {
      headers: comment.raw_email_headers ?? null,
      content: comment.raw_email_html || comment.content,
      sender: {
        name: comment.author_name,
        email: comment.author_email || ticket.contact_email,
      },
    };
  }

  return {
    headers: ticket.raw_email_headers ?? null,
    content: ticket.raw_email_html || ticket.description,
    sender: {
      name: ticket.contact_name,
      email: ticket.contact_email,
    },
  };
}

export function getReplyRecipients(
  ticket: Ticket,
  comments: TicketComment[],
  supportEmail: string,
  mode: "reply" | "replyAll",
  options?: { messageId?: string; currentUserEmail?: string }
): { to: EmailRecipient[]; cc: EmailRecipient[] } {
  const target = getReplyTargetMessage(ticket, comments, options?.messageId);
  const to = [target.sender];

  if (mode === "reply") {
    return { to, cc: [] };
  }

  const ccMap = new Map<string, EmailRecipient>();
  const normalize = (email: string) => email.toLowerCase();

  if (target.headers) {
    const toHeader = parseEmailHeaderLine(target.headers, "To");
    const ccHeader = parseEmailHeaderLine(target.headers, "Cc");

    for (const recipient of [
      ...parseRecipientList(toHeader),
      ...parseRecipientList(ccHeader),
    ]) {
      ccMap.set(normalize(recipient.email), recipient);
    }
  }

  if (!parseEmailHeaderLine(target.headers || "", "Cc")) {
    for (const recipient of parseCcFromEmailContent(target.content)) {
      ccMap.set(normalize(recipient.email), recipient);
    }
  }

  for (const address of supportEmail.split(",").map((email) => email.trim()).filter(Boolean)) {
    ccMap.set(normalize(address), {
      name: "Helpdesk Support",
      email: address,
    });
  }

  ccMap.delete(normalize(target.sender.email));

  if (options?.currentUserEmail) {
    ccMap.delete(normalize(options.currentUserEmail));
  }

  return { to, cc: Array.from(ccMap.values()) };
}

export function isEmailAttachment(attachment: TicketAttachment): boolean {
  if (attachment.source === "email") return true;
  if (attachment.uploaded_by != null) return false;
  return true;
}

/** True when an image is embedded inline (body or signature), not a separate file attachment. */
export function isInlineEmailAttachment(
  attachment: TicketAttachment,
  emailContent?: string,
  allAttachments?: TicketAttachment[]
): boolean {
  const related = allAttachments ?? [attachment];
  return (
    isSignatureInlineAttachment(attachment, emailContent) ||
    isBodyInlineAttachment(attachment, related, emailContent)
  );
}

/** Email attachments shown to users — excludes inline body and signature images. */
export function getMessageDisplayAttachments(
  attachments: TicketAttachment[],
  emailContent?: string
): TicketAttachment[] {
  return attachments.filter(
    (att) => !isInlineEmailAttachment(att, emailContent, attachments)
  );
}

export function isInternalAttachment(attachment: TicketAttachment): boolean {
  return !isEmailAttachment(attachment);
}

export function getInternalAttachments(attachments: TicketAttachment[]): TicketAttachment[] {
  return attachments.filter(isInternalAttachment);
}

export function groupAttachmentsByMessage(
  attachments: TicketAttachment[]
): Map<string | "initial", TicketAttachment[]> {
  const map = new Map<string | "initial", TicketAttachment[]>();
  map.set("initial", []);

  for (const attachment of attachments.filter(isEmailAttachment)) {
    const key = attachment.comment_id || "initial";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(attachment);
  }

  return map;
}

export function partitionComments(comments: TicketComment[]): {
  draftComments: TicketComment[];
  internalComments: TicketComment[];
  publicComments: TicketComment[];
} {
  const draftComments = comments
    .filter((comment) => comment.comment_type === "draft")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const internalComments = comments
    .filter((comment) => comment.comment_type === "internal")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const publicComments = comments
    .filter((comment) => comment.comment_type === "reply")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return { draftComments, internalComments, publicComments };
}
