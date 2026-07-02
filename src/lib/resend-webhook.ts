import { createHmac, timingSafeEqual } from "crypto";

interface ResendReceivedEvent {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
  };
}

interface ResendReceivedAttachment {
  id: string;
  filename: string;
  content_type?: string;
  size?: number;
  download_url?: string;
}

interface ResendReceivedEmail {
  text?: string | null;
  html?: string | null;
  headers?: Record<string, string>;
  attachments?: ResendReceivedAttachment[];
}

function getWebhookSecret(): string | undefined {
  return process.env.RESEND_WEBHOOK_SECRET || process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
}

export function stripDisplayQuotes(value: string): string {
  return value.trim().replace(/^["']+|["']+$/g, "").trim();
}

export function parseNameFromFromHeader(from: string): string {
  const match = from.match(/^([^<]+)</);
  if (match) return stripDisplayQuotes(match[1]);
  return from.split("@")[0];
}

export function isResendWebhook(headers: Headers): boolean {
  return Boolean(headers.get("svix-signature"));
}

export function verifyResendWebhook(rawBody: string, headers: Headers): ResendReceivedEvent | null {
  const secret = getWebhookSecret();
  if (!secret) return null;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return null;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  const valid = svixSignature.split(" ").some((part) => {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) return false;
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  });

  if (!valid) return null;

  try {
    return JSON.parse(rawBody) as ResendReceivedEvent;
  } catch {
    return null;
  }
}

export async function fetchResendReceivedEmail(emailId: string): Promise<ResendReceivedEmail | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error("Failed to fetch received email:", await res.text());
    return null;
  }

  return res.json() as Promise<ResendReceivedEmail>;
}

export async function fetchResendAttachments(emailId: string): Promise<ResendReceivedAttachment[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error("Failed to list received attachments:", await res.text());
    return [];
  }

  const body = (await res.json()) as { data?: ResendReceivedAttachment[] };
  return body.data ?? [];
}

async function fetchAttachmentDownloadUrl(
  emailId: string,
  attachmentId: string
): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!res.ok) return null;

  const body = (await res.json()) as { download_url?: string };
  return body.download_url ?? null;
}

export async function downloadResendAttachment(
  emailId: string,
  attachment: ResendReceivedAttachment
): Promise<{ buffer: Buffer; filename: string; contentType: string; size: number } | null> {
  const downloadUrl =
    attachment.download_url ?? (await fetchAttachmentDownloadUrl(emailId, attachment.id));
  if (!downloadUrl) return null;

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    console.error(`Failed to download attachment ${attachment.filename}`);
    return null;
  }

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return {
    buffer,
    filename: attachment.filename,
    contentType: attachment.content_type || "application/octet-stream",
    size: attachment.size || buffer.length,
  };
}

export function resendEventToInboundPayload(
  event: ResendReceivedEvent,
  email: ResendReceivedEmail
): {
  from: string;
  from_name?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
} {
  const fromHeader = email.headers?.from;
  const from = fromHeader || event.data.from;
  return {
    from,
    from_name: fromHeader ? parseNameFromFromHeader(fromHeader) : undefined,
    to: event.data.to.join(", ") || "",
    subject: event.data.subject || "Email Support Request",
    text: email.text || undefined,
    html: email.html || undefined,
    headers: email.headers,
  };
}
