export interface InlineEmailAttachment {
  filename: string;
  content: string;
  contentId: string;
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  inlineAttachments?: InlineEmailAttachment[];
}

interface EmailAttachmentParams extends EmailParams {
  attachment: {
    filename: string;
    content: Buffer;
  };
}

function parseResendError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // fall through
  }
  return body;
}

async function sendEmail(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    console.log(`[Email] To: ${payload.to} | Subject: ${payload.subject}`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, ...payload }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Email send failed:", body);
      return { ok: false, error: parseResendError(body) };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("Email error:", err);
    return { ok: false, error: message };
  }
}

export async function sendEmailNotification({
  to,
  subject,
  html,
  cc,
  bcc,
  inlineAttachments,
}: EmailParams): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({
    to,
    subject,
    html,
    ...(cc?.length ? { cc } : {}),
    ...(bcc?.length ? { bcc } : {}),
    ...(inlineAttachments?.length
      ? {
          attachments: inlineAttachments.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            content_id: attachment.contentId,
          })),
        }
      : {}),
  });
}

export async function sendEmailWithAttachment({
  to,
  subject,
  html,
  attachment,
}: EmailAttachmentParams): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({
    to,
    subject,
    html,
    attachments: [
      {
        filename: attachment.filename,
        content: attachment.content.toString("base64"),
      },
    ],
  });
}
