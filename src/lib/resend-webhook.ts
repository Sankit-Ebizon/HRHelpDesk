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

interface ResendReceivedEmail {
  text?: string | null;
  html?: string | null;
  headers?: Record<string, string>;
}

export function isResendWebhook(headers: Headers): boolean {
  return Boolean(headers.get("svix-signature"));
}

export function verifyResendWebhook(rawBody: string, headers: Headers): ResendReceivedEvent | null {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
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

export function resendEventToInboundPayload(
  event: ResendReceivedEvent,
  email: ResendReceivedEmail
): { from: string; from_name?: string; to: string; subject: string; text?: string; html?: string } {
  const fromHeader = email.headers?.from;
  return {
    from: fromHeader || event.data.from,
    to: event.data.to[0] || "",
    subject: event.data.subject || "Email Support Request",
    text: email.text || undefined,
    html: email.html || undefined,
  };
}
