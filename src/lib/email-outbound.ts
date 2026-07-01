import type { createClient } from "@/lib/supabase/server";

const ATTACHMENT_URL_PATTERN = /\/api\/attachments\/([0-9a-f-]{36})\/download/gi;

export interface InlineEmailAttachment {
  filename: string;
  content: string;
  contentId: string;
}

export interface PreparedOutboundEmail {
  html: string;
  inlineAttachments: InlineEmailAttachment[];
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Rewrites private /api/attachments image URLs to cid: references and returns
 * matching inline MIME parts for the email provider (Outlook-compatible).
 */
export async function prepareOutboundEmailHtml(
  supabase: SupabaseServerClient,
  html: string,
  ticketId: string
): Promise<PreparedOutboundEmail> {
  const referencedIds = new Set<string>();
  for (const match of html.matchAll(ATTACHMENT_URL_PATTERN)) {
    referencedIds.add(match[1]);
  }

  if (referencedIds.size === 0) {
    return { html, inlineAttachments: [] };
  }

  const { data: attachments } = await supabase
    .from("ticket_attachments")
    .select("id, file_name, file_path, mime_type")
    .eq("ticket_id", ticketId)
    .in("id", Array.from(referencedIds));

  if (!attachments?.length) {
    return { html, inlineAttachments: [] };
  }

  let updatedHtml = html;
  const inlineAttachments: InlineEmailAttachment[] = [];

  for (const attachment of attachments) {
    const mimeType = attachment.mime_type || "image/png";
    if (!mimeType.startsWith("image/")) continue;

    const { data: file } = await supabase.storage
      .from("ticket-attachments")
      .download(attachment.file_path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentId = `img-${attachment.id}`;
    const cidRef = `cid:${contentId}`;
    const escapedId = attachment.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const srcPattern = new RegExp(
      `src=["'](?:https?:\\/\\/[^"']+)?\\/api\\/attachments\\/${escapedId}\\/download["']`,
      "gi"
    );

    updatedHtml = updatedHtml.replace(srcPattern, `src="${cidRef}"`);
    inlineAttachments.push({
      filename: attachment.file_name || `image-${attachment.id}.png`,
      content: buffer.toString("base64"),
      contentId,
    });
  }

  return { html: updatedHtml, inlineAttachments };
}
