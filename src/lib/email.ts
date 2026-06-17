interface EmailParams {
  to: string;
  subject: string;
  html: string;
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

export async function sendEmailNotification({
  to,
  subject,
  html,
}: EmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    console.log(`[Email] To: ${to} | Subject: ${subject}`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
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
