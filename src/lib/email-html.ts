import { decodeHtmlEntities, htmlToPlainText, stripHtmlTags } from "@/lib/utils";

const SIGNATURE_MARKERS = [
  /<div[^>]*class=["'][^"']*email-signature-block/i,
  /<div[^>]*data-email-signature[^>]*>/i,
  /<div[^>]*id=["']signature["'][^>]*>/i,
  /<div[^>]*class=["'][^"']*gmail_signature/i,
  /<div[^>]*class=["'][^"']*signature[^"']*["'][^>]*>/i,
  /<table[^>]*id=["']signature["']?/i,
  /<!--\s*signature\s*-->/i,
];

const HTML_REGARDS_SPLIT =
  /((?:<p[^>]*>|<br\s*\/?>|\n)\s*(?:Kind regards|Best regards|Warm regards|Sincerely)[,.]?\s*(?:<\/p>|<br\s*\/?>))/i;

const PLAIN_SIGNATURE_MARKERS = [
  /\s+Kind regards[,.]?\s+/gi,
  /\s+Best regards[,.]?\s+/gi,
  /\s+Warm regards[,.]?\s+/gi,
  /\s+Sincerely[,.]?\s+/gi,
] as const;

function findPlainTextSignatureSplitIndex(text: string): number {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  // A small absolute floor (not a % of total) so a genuine sign-off still
  // splits when the body is short but the signature/confidentiality is long.
  // The markers require preceding whitespace, so index 0 (no body) never matches.
  const minIndex = 4;
  let bestIndex = -1;

  for (const pattern of PLAIN_SIGNATURE_MARKERS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(cleaned)) !== null) {
      if (match.index >= minIndex && match.index > bestIndex) {
        bestIndex = match.index;
      }
    }
  }

  return bestIndex;
}

export function hasPlainTextSignature(text: string): boolean {
  return findPlainTextSignatureSplitIndex(text) > 0;
}

/** Detect contact signature blocks in plain text (including HTML emails stripped to text). */
export function hasEmailSignatureContent(plain: string): boolean {
  const cleaned = plain.replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  if (hasPlainTextSignature(cleaned)) return true;
  if (
    /(?:Kind regards|Best regards|Warm regards|Sincerely)/i.test(cleaned) &&
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleaned)
  ) {
    return true;
  }
  if (/Confidentiality Note:/i.test(cleaned) && /\b\d{10,13}\b/.test(cleaned)) {
    return true;
  }
  return false;
}

export interface ParsedEmailContent {
  body: string;
  signature: string;
  preview: string;
  hasMore: boolean;
  singleBlock: boolean;
}

export interface SignatureFields {
  name: string;
  title: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  salutation?: string;
  confidentialityNote?: string;
}

/**
 * Remove leftover CSS rules that mail clients (notably Outlook/Word) leave
 * behind in the visible body — either as the contents of a stripped <style>
 * block, or dumped into the text/plain alternative (e.g. "P {margin-top:0;}").
 * Only blocks whose braces contain declarations (":" or ";") are removed, so
 * ordinary prose that happens to use braces is preserved.
 */
export function stripLeftoverCss(text: string): string {
  let out = text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/@[a-zA-Z-]+[^{<>}]*\{[^{}<>]*\}/g, " ");
  let prev: string;
  do {
    prev = out;
    out = out.replace(/[^{}<>\n]*\{[^{}<>]*[:;][^{}<>]*\}/g, " ");
  } while (out !== prev);
  // Drop empty at-rule wrappers left after nested rules were removed.
  return out.replace(/@[a-zA-Z-]+[^{<>}]*\{\s*\}/g, " ");
}

/** Extract plain text from email HTML or plain source while keeping line breaks. */
export function emailTextFromContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (!/<[a-z]/i.test(trimmed)) {
    const decoded = decodeHtmlEntities(trimmed.replace(/\r\n/g, "\n"));
    return stripLeftoverCss(decoded).replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").trim();
  }

  // Remove non-body markup that frequently contains CSS/metadata from mail clients.
  const cleanedHtml = trimmed
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, "")
    .replace(/<title[\s\S]*?>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "");

  let text = cleanedHtml
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n")
    .replace(/<\/div>\s*/gi, "\n")
    .replace(/<\/li>\s*/gi, "\n")
    .replace(/<\/tr>\s*/gi, "\n")
    .replace(/<\/h[1-6]>\s*/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  text = decodeHtmlEntities(text);
  text = stripLeftoverCss(text);
  text = text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function formatPlainTextBodyHtml(body: string): string {
  if (!body.trim()) return "";
  return `<div class="email-plain-body" style="margin:0 0 12px;padding:0;font-size:13px;color:#222;line-height:1.55;white-space:pre-wrap;word-break:break-word;">${escapeHtml(body)}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when content is HTML from a mail client (tables, divs, paragraphs). */
export function isStructuredEmailHtml(content: string): boolean {
  return /<(?:table|div|p|br|html|body)\b/i.test(content.trim());
}

/** Plain text or minimal HTML (e.g. cid img only) — needs our formatter. */
export function shouldFormatPlainEmail(content: string): boolean {
  const trimmed = content.trim();
  if (/\[cid:[^\]]+\]/i.test(trimmed)) return true;
  if (/<(?:mailto:|https?:)/i.test(trimmed)) return true;
  if (!/<[a-z]/i.test(trimmed)) return true;
  const withoutImgs = trimmed.replace(/<img[^>]*>/gi, "").trim();
  if (!/<[a-z]/i.test(withoutImgs)) return true;
  return !isStructuredEmailHtml(trimmed);
}

/** Normalize Outlook / mobile plain-text link annotations before formatting. */
export function normalizeOutlookPlainText(text: string): string {
  return text
    .replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})<mailto:\1>/gi,
      "$1"
    )
    .replace(/([\w.-]+\.(?:com|in|org|net|io))<(https?:\/\/[^>]+)>/gi, "$1")
    .replace(/Address<(https?:\/\/[^>]+)>/gi, "Address: ")
    .replace(/\[linkedin\]\s*<[^>]+>/gi, "")
    .replace(/\[LinkedIn\]\s*<[^>]+>/gi, "")
    .replace(/<https?:\/\/[^>]+>/gi, " ")
    // Drop stray Outlook signature icon labels (@ = email, W = web, T = tel,
    // E/M/P/F = email/mobile/phone/fax) left on their own line once the icon
    // image is gone.
    .replace(/(^|\n)[ \t]*[@wtempf][ \t]*\r?\n/gi, "$1")
    .replace(/(?:^|\n)[ \t]*[@wtempf][ \t]*$/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeEmailHtml(html: string): string {
  const sanitized = html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, "")
    .replace(/<title[\s\S]*?>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
  return stripLeftoverCss(sanitized);
}

export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

function signatureImageTag(inlineImageUrl: string): string {
  return `<img src="${inlineImageUrl}" alt="" width="72" height="72" style="width:72px;height:72px;max-width:72px;object-fit:cover;border-radius:2px;display:block;" />`;
}

function inlineCidImageTag(inlineImageUrl: string): string {
  return signatureImageTag(inlineImageUrl);
}

function constrainImgTagToSignatureSize(imgTag: string): string {
  const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
  const src = srcMatch?.[1] || "";
  if (!src) return imgTag;
  return signatureImageTag(src);
}

function constrainImagesInHtml(html: string): string {
  return html.replace(/<img\b[^>]*\/?>/gi, constrainImgTagToSignatureSize);
}

function stripImagesFromHtml(html: string): string {
  return html.replace(/<img\b[^>]*\/?>/gi, "");
}

function injectImageIntoSignatureBlock(html: string, inlineImageUrl: string): string {
  const photoCell = `<td style="padding-right:16px;vertical-align:top;width:84px;">${signatureImageTag(inlineImageUrl)}</td>`;
  if (/<tr>\s*<td[^>]*padding-right:16px/i.test(html)) {
    return html;
  }
  return html.replace(/(<table[^>]*>[\s\S]*?<tr>)/i, `$1${photoCell}`);
}

function dedupeLeadingSignatureImages(html: string): string {
  const imgs = [...html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*\/?>/gi)];
  if (imgs.length <= 1) return html;

  const signatureSrc = imgs[imgs.length - 1][1];
  let removed = false;
  return html.replace(/<img\b[^>]*\/?>/gi, (tag) => {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    if (!removed && srcMatch?.[1] === signatureSrc && tag !== imgs[imgs.length - 1][0]) {
      removed = true;
      return "";
    }
    return tag;
  });
}

function replaceCidsInSection(section: string, imageUrl?: string): string {
  if (!imageUrl) {
    return section
      .replace(/<img[^>]*src=["']cid:[^"']+["'][^>]*\/?>/gi, "")
      .replace(/\[cid:[^\]]+\]/gi, "");
  }
  return section
    .replace(/src=["']cid:[^"']+["']/gi, `src="${imageUrl}"`)
    .replace(/\[cid:[^\]]+\]/gi, `<img src="${imageUrl}" alt="" style="max-width:100%;height:auto;display:block;margin:12px 0;" />`);
}

function stripImagesMatchingUrl(html: string, imageUrl?: string): string {
  if (!imageUrl) return html;
  const attachmentId = imageUrl.match(/\/api\/attachments\/([a-f0-9-]+)\/download/i)?.[1];
  return html.replace(/<img\b[^>]*\/?>/gi, (tag) => {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const src = srcMatch?.[1] ?? "";
    if (!src) return tag;
    if (src === imageUrl || imageUrl.includes(src) || src.includes(imageUrl)) return "";
    if (attachmentId && src.includes(attachmentId)) return "";
    return tag;
  });
}

function processStructuredEmailHtml(
  html: string,
  signatureImageUrl?: string,
  bodyImageUrl?: string
): string {
  const { body, signature } = splitEmailContent(html);
  const processedBody = replaceCidsInSection(
    body,
    bodyImageUrl || (!signature ? signatureImageUrl : undefined)
  );
  let processed = signature
    ? `${processedBody}${replaceCidsInSection(signature, signatureImageUrl)}`
    : processedBody;

  if (signature) {
    const cleanBody = stripImagesFromHtml(stripImagesMatchingUrl(processedBody, signatureImageUrl));
    let cleanSignature = replaceCidsInSection(signature, signatureImageUrl);
    if (signatureImageUrl && !/<img\b/i.test(cleanSignature)) {
      cleanSignature = /email-signature-block/i.test(cleanSignature)
        ? injectImageIntoSignatureBlock(cleanSignature, signatureImageUrl)
        : `${signatureImageTag(signatureImageUrl)}${cleanSignature}`;
    } else {
      cleanSignature = constrainImagesInHtml(cleanSignature);
    }
    processed = dedupeLeadingSignatureImages(`${cleanBody}${cleanSignature}`);
  } else if (/<img\b/i.test(processed)) {
    if (signatureImageUrl && !bodyImageUrl) {
      processed = stripImagesMatchingUrl(processed, signatureImageUrl);
    }
    processed = processed.replace(/<img\b[^>]*\/?>/gi, (tag, offset) => {
      const afterPct = offset / Math.max(processed.length, 1);
      if (afterPct >= 0.35) {
        return constrainImgTagToSignatureSize(tag);
      }
      return tag;
    });
    processed = dedupeLeadingSignatureImages(processed);
  }

  if (bodyImageUrl && !processed.includes(bodyImageUrl) && !/<img\b/i.test(processedBody)) {
    const imageTag = `<img src="${bodyImageUrl}" alt="" style="max-width:100%;height:auto;display:block;margin:12px 0;" />`;
    if (signature) {
      const split = splitEmailContent(processed);
      processed = `${split.body}${imageTag}${split.signature}`;
    } else {
      processed = `${processed}${imageTag}`;
    }
  }

  return processed;
}

export function replaceCidReferences(content: string, inlineImageUrl?: string): string {
  if (inlineImageUrl) {
    const imageTag = inlineCidImageTag(inlineImageUrl);
    return content
      .replace(/src=["']cid:[^"']+["']/gi, `src="${inlineImageUrl}"`)
      .replace(/\[cid:[^\]]+\]/gi, imageTag);
  }
  return content
    .replace(/<img[^>]*src=["']cid:[^"']+["'][^>]*>/gi, "")
    .replace(/\[cid:[^\]]+\]/gi, "");
}

function splitPlainTextEmail(text: string): { body: string; signature: string } {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  const splitIndex = findPlainTextSignatureSplitIndex(cleaned);

  if (splitIndex > 0) {
    return {
      body: cleaned.slice(0, splitIndex).trim(),
      signature: cleaned.slice(splitIndex).trim(),
    };
  }

  return { body: cleaned, signature: "" };
}

function parsePlainSignatureFields(signatureText: string): SignatureFields {
  const salutationMatch = signatureText.match(
    /^(Kind regards|Best regards|Warm regards|Regards|Sincerely)[,.]?/i
  );
  const salutation = salutationMatch
    ? `${salutationMatch[1].replace(/\s+/g, " ").trim()},`
    : undefined;

  let text = signatureText
    .replace(/^(Kind regards|Best regards|Warm regards|Regards|Sincerely)[,.]?\s*/i, "")
    .replace(/^Thank you[\s\S]*?\.(\s+)/i, "")
    .replace(/\[LinkedIn\]\s*<[^>]+>/gi, "")
    .replace(/\[LinkedIn\]/gi, "")
    .replace(/\[cid:[^\]]+\]/gi, "")
    // Strip Outlook signature icon labels that prefix a contact link
    // (@ = email, W = web, T = tel, ...): "@ mahima@x.com", "W ebizondigital.com".
    .replace(/(^|\s)@\s*(?=[\w.%+-]+@[\w.-]+\.[a-z]{2,})/gi, "$1")
    .replace(
      /(^|\s)[WTEMPF]\s+(?=[\w.%+-]+@[\w.-]+\.[a-z]{2,}|(?:https?:\/\/)?[\w-]+\.(?:com|in|org|net|io)\b)/g,
      "$1"
    )
    .trim();

  const confIdx = text.search(/Confidentiality Note:/i);
  let confidentialityNote: string | undefined;
  if (confIdx >= 0) {
    confidentialityNote = text.slice(confIdx).trim();
    text = text.slice(0, confIdx).trim();
  }

  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch?.[1];

  const phoneMatch = text.match(/\b(\d{10,13})\b/);
  const phone = phoneMatch?.[1];

  const websiteMatch = text.match(/\b((?:https?:\/\/)?[\w.-]+\.(?:com|in|org|net|io))\b/i);
  const website = websiteMatch?.[1];

  const addressMatch = text.match(
    /Address:?\s*(.+?)(?=\s+[\w.-]+\.(?:com|in|org|net|io)\b|\[LinkedIn\]|\[linkedin\]|$)/i
  );
  let address = addressMatch?.[1]?.replace(/\s+/g, " ").trim();
  if (address && /^https?:\/\//i.test(address)) {
    address = undefined;
  }

  let remainder = text;
  if (email) remainder = remainder.replace(email, " ");
  if (phone) remainder = remainder.replace(phone, " ");
  if (addressMatch) remainder = remainder.replace(addressMatch[0], " ");
  if (website) remainder = remainder.replace(website, " ");
  remainder = remainder.replace(/Address:/gi, " ").replace(/\s+/g, " ").trim();

  const afterRegards = remainder
    .split(/\b(?:Kind regards|Best regards|Warm regards|Sincerely)[,.]?\s*/i)
    .pop()
    ?.trim();
  if (afterRegards) {
    remainder = afterRegards;
  }

  const words = remainder.split(" ").filter(Boolean);
  // Drop any icon label (@, W, T, E, M, P, F) left stranded in the title.
  const isIconLabel = (word: string) => /^[@WTEMPF]$/.test(word);
  let name = "";
  let title = "";

  if (words.length >= 2) {
    name = `${words[0]} ${words[1]}`;
    title = words.slice(2).filter((word) => !isIconLabel(word)).join(" ");
  } else if (words.length === 1) {
    name = words[0];
  }

  return { name, title, phone, email, address, website, salutation, confidentialityNote };
}

function buildSignatureHtml(fields: SignatureFields, inlineImageUrl?: string): string {
  const websiteHref = fields.website
    ? fields.website.startsWith("http")
      ? fields.website
      : `https://${fields.website}`
    : null;

  const salutation = fields.salutation || "Kind regards,";

  const iconSpan = (glyph: string) =>
    `<span style="display:inline-block;width:18px;color:#888;font-size:13px;vertical-align:top;">${glyph}</span>`;

  const contactLines = [
    fields.email
      ? `<p style="margin:2px 0 0;padding:0;font-size:13px;line-height:1.6;">${iconSpan("&#9993;")}<a href="mailto:${escapeHtml(fields.email)}" style="color:#1a73b5;text-decoration:none;">${escapeHtml(fields.email)}</a></p>`
      : "",
    websiteHref
      ? `<p style="margin:2px 0 0;padding:0;font-size:13px;line-height:1.6;">${iconSpan("&#127760;")}<a href="${escapeHtml(websiteHref)}" style="color:#1a73b5;text-decoration:none;" target="_blank" rel="noopener noreferrer">${escapeHtml(fields.website!)}</a></p>`
      : "",
    fields.phone
      ? `<p style="margin:2px 0 0;padding:0;font-size:13px;color:#333;line-height:1.6;">${iconSpan("&#9742;")}${escapeHtml(fields.phone)}</p>`
      : "",
    fields.address
      ? `<p style="margin:2px 0 0;padding:0;font-size:13px;color:#333;line-height:1.5;">${iconSpan("&#128205;")}${escapeHtml(fields.address)}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const textBlock = `
    <p style="margin:0 0 2px;padding:0;font-size:13px;color:#333;line-height:1.5;">${escapeHtml(salutation)}</p>
    ${fields.name ? `<p style="margin:0;padding:0;font-size:13px;font-weight:bold;color:#222;line-height:1.5;">${escapeHtml(fields.name)}</p>` : ""}
    ${fields.title ? `<p style="margin:0 0 6px;padding:0;font-size:13px;color:#333;line-height:1.5;">${escapeHtml(fields.title)}</p>` : ""}
    ${contactLines}
  `.trim();

  const inner = inlineImageUrl
    ? `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding-right:16px;vertical-align:top;width:84px;">
            <img src="${inlineImageUrl}" alt="" width="72" height="72" style="width:72px;height:72px;object-fit:cover;border-radius:2px;display:block;" />
          </td>
          <td style="vertical-align:top;padding:0;">${textBlock}</td>
        </tr>
      </table>`
    : textBlock;

  return `
    <div class="email-signature-block" style="margin-top:12px;padding-top:0;font-family:Arial,Helvetica,sans-serif;">
      ${inner}
      ${fields.confidentialityNote ? `<p style="margin:16px 0 0;padding:0;font-size:11px;color:#999;line-height:1.5;">${escapeHtml(fields.confidentialityNote)}</p>` : ""}
    </div>
  `.trim();
}

function buildInlineImageHtml(url: string): string {
  return `<img src="${url}" alt="" style="max-width:100%;height:auto;display:block;margin:12px 0;" />`;
}

function replacePlainTextCidPlaceholder(body: string, bodyImageUrl?: string): string {
  if (/\[cid:[^\]]+\]/i.test(body)) {
    if (bodyImageUrl) {
      return body.replace(/\[cid:[^\]]+\]/gi, buildInlineImageHtml(bodyImageUrl)).trim();
    }
    return body.replace(/\[cid:[^\]]+\]/gi, "").trim();
  }
  return body.trim();
}

function appendBodyImageIfNeeded(body: string, bodyImageUrl?: string): string {
  if (!bodyImageUrl || body.includes("<img") || /\[cid:/i.test(body)) return body;
  const plain = body.replace(/<[^>]+>/g, " ").toLowerCase();
  if (
    /\b(attached image|see attached|inline image|screenshot|as shown below|please find)\b/.test(plain)
  ) {
    return `${body.trim()}${buildInlineImageHtml(bodyImageUrl)}`;
  }
  return body;
}

export interface EmailImageUrls {
  signatureImageUrl?: string;
  bodyImageUrl?: string;
}

function resolveEmailImageUrls(
  inlineImageUrl?: string | EmailImageUrls,
  bodyImageUrl?: string
): EmailImageUrls {
  if (typeof inlineImageUrl === "object" && inlineImageUrl !== null) {
    return inlineImageUrl;
  }
  return {
    signatureImageUrl: inlineImageUrl,
    bodyImageUrl,
  };
}

export function plainTextToEmailHtml(
  text: string,
  inlineImageUrl?: string | EmailImageUrls,
  bodyImageUrl?: string
): string {
  const imageUrls = resolveEmailImageUrls(inlineImageUrl, bodyImageUrl);
  const plain = text.replace(/<img[^>]*>/gi, "").trim();
  const { body, signature } = splitPlainTextEmail(plain);
  let cleanBody = replacePlainTextCidPlaceholder(
    body,
    imageUrls.bodyImageUrl || (!signature.trim() ? imageUrls.signatureImageUrl : undefined)
  );
  cleanBody = appendBodyImageIfNeeded(cleanBody, imageUrls.bodyImageUrl);

  const bodyHtml = cleanBody
    ? cleanBody.includes("<img")
      ? `<div class="email-plain-body" style="margin:0 0 12px;padding:0;font-size:13px;color:#222;line-height:1.55;">${cleanBody}</div>`
      : formatPlainTextBodyHtml(cleanBody)
    : "";

  if (!signature) {
    return bodyHtml;
  }

  const fields = parsePlainSignatureFields(signature);
  return `${bodyHtml}${buildSignatureHtml(fields, imageUrls.signatureImageUrl)}`;
}

export function extractInlineAttachmentUrl(content: string): string | undefined {
  const match = content.match(/src=["'](\/api\/attachments\/[a-f0-9-]+\/download)["']/i);
  return match?.[1];
}

export function normalizeEmailContent(
  content: string,
  inlineImageUrl?: string | EmailImageUrls,
  bodyImageUrl?: string
): string {
  const imageUrls = resolveEmailImageUrls(inlineImageUrl, bodyImageUrl);
  const trimmed = content.trim();
  const resolvedSignatureUrl =
    imageUrls.signatureImageUrl || extractInlineAttachmentUrl(trimmed);
  const plain = normalizeOutlookPlainText(emailTextFromContent(trimmed) || trimmed);

  let result: string;

  if (/email-signature-block/i.test(trimmed) && /<img\b/i.test(trimmed)) {
    result = processStructuredEmailHtml(trimmed, resolvedSignatureUrl, imageUrls.bodyImageUrl);
  } else if (shouldFormatPlainEmail(trimmed) || hasEmailSignatureContent(plain)) {
    result = plainTextToEmailHtml(plain, imageUrls);
  } else if (resolvedSignatureUrl && /email-signature-block/i.test(trimmed) && !/<img\b/i.test(trimmed)) {
    result = plainTextToEmailHtml(plain, imageUrls);
  } else {
    result = processStructuredEmailHtml(trimmed, resolvedSignatureUrl, imageUrls.bodyImageUrl);
  }

  if (resolvedSignatureUrl && !imageUrls.bodyImageUrl) {
    const { body, signature } = splitEmailContent(result);
    const cleanBody = stripImagesMatchingUrl(body, resolvedSignatureUrl);
    result = signature ? `${cleanBody}${signature}` : cleanBody;
  }

  return sanitizeEmailHtml(result);
}

export function splitEmailContent(html: string): { body: string; signature: string } {
  const sanitized = sanitizeEmailHtml(html);

  for (const pattern of SIGNATURE_MARKERS) {
    const match = sanitized.match(pattern);
    if (match?.index != null && match.index > 0) {
      return {
        body: sanitized.slice(0, match.index).trim(),
        signature: sanitized.slice(match.index).trim(),
      };
    }
  }

  const regardPatterns = [
    /(?:<p[^>]*>|<br\s*\/?>|\n)\s*(?:Kind regards|Best regards|Warm regards|Sincerely)[,.]?\s*(?:<\/p>|<br\s*\/?>)/gi,
  ];
  let bestIndex = -1;
  const minIndex = Math.floor(sanitized.length * 0.15);

  for (const pattern of regardPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sanitized)) !== null) {
      if (match.index >= minIndex && match.index > bestIndex) {
        bestIndex = match.index;
      }
    }
  }

  if (bestIndex > 0) {
    return {
      body: sanitized.slice(0, bestIndex).trim(),
      signature: sanitized.slice(bestIndex).trim(),
    };
  }

  const regardMatch = sanitized.match(HTML_REGARDS_SPLIT);
  if (regardMatch?.index != null && regardMatch.index > sanitized.length * 0.1) {
    return {
      body: sanitized.slice(0, regardMatch.index).trim(),
      signature: sanitized.slice(regardMatch.index).trim(),
    };
  }

  return { body: sanitized, signature: "" };
}

function stripForwardHeaderLines(plain: string): string {
  return plain
    .replace(/From:\s*"[^"]*"\s*(?:<[^>]+>|&lt;[^&]+&gt;)/gi, " ")
    .replace(/To:\s*"[^"]*"\s*(?:<[^>]+>|&lt;[^&]+&gt;)/gi, " ")
    .replace(/Date:\s*[^]+?(?=Subject:|$)/gi, " ")
    .replace(/Subject:\s*[^\n]+/gi, " ")
    .replace(/={3,}\s*Forwarded Message\s*={3,}/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractForwardPreviewText(content: string): string {
  const plain = htmlToPlainText(content);
  if (/forwarded message/i.test(plain)) {
    const parts = plain.split(/={3,}\s*Forwarded Message\s*={3,}/i);
    const body = (parts[parts.length - 1] || plain).trim();
    return stripForwardHeaderLines(body);
  }
  if (/\bFrom:\s*"/i.test(plain)) {
    return stripForwardHeaderLines(plain);
  }
  return plain;
}

export function getEmailPreview(
  content: string,
  inlineImageUrl?: string | EmailImageUrls,
  maxLength = 140
): string {
  const normalized = normalizeEmailContent(content, inlineImageUrl);
  const plainNormalized = htmlToPlainText(normalized);
  let text =
    /forwarded message/i.test(plainNormalized) || /\bFrom:\s*"/i.test(plainNormalized)
      ? extractForwardPreviewText(normalized)
      : "";
  if (!text) {
    const { body } = splitEmailContent(normalized);
    text = htmlToPlainText(body);
  }
  if (!text) text = htmlToPlainText(normalized);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

export function formatQuotedMessageBody(
  content: string,
  inlineImageUrl?: string | EmailImageUrls,
  bodyImageUrl?: string
): string {
  const imageUrls = resolveEmailImageUrls(inlineImageUrl, bodyImageUrl);
  const plain = normalizeOutlookPlainText(emailTextFromContent(content) || content);
  if (hasEmailSignatureContent(plain) || shouldFormatPlainEmail(content)) {
    return plainTextToEmailHtml(plain, imageUrls);
  }
  if (/email-signature-block/i.test(content)) {
    if (imageUrls.signatureImageUrl && !/<img\b/i.test(content)) {
      return plainTextToEmailHtml(plain, imageUrls);
    }
    return sanitizeEmailHtml(
      processStructuredEmailHtml(content, imageUrls.signatureImageUrl, imageUrls.bodyImageUrl)
    );
  }
  return sanitizeEmailHtml(
    processStructuredEmailHtml(content, imageUrls.signatureImageUrl, imageUrls.bodyImageUrl)
  );
}

function extractQuotedInnerHtml(quotedSection: string, headerText: string): string {
  let inner = quotedSection.replace(headerText, "").trim();
  inner = inner.replace(/^<div[^>]*class=["'][^"']*email-quoted-thread[^"']*["'][^>]*>/i, "").trim();
  inner = inner.replace(/<p[^>]*>[\s\S]*?wrote\s+---[\s\S]*?<\/p>/i, "").trim();
  const bodyWrap = inner.match(/<div[^>]*>\s*([\s\S]*?)\s*<\/div>\s*$/i);
  if (bodyWrap?.[1] && /email-signature-block|<p\b|<table\b/i.test(bodyWrap[1])) {
    return bodyWrap[1].trim();
  }
  if (/email-signature-block/i.test(inner)) {
    return inner.trim();
  }
  inner = inner.replace(/<\/?p[^>]*>/gi, " ").trim();
  return inner.replace(/^<div[^>]*>/i, "").replace(/<\/div>$/i, "").trim();
}

function formatQuoteHeaderLine(headerText: string): string {
  return escapeHtml(decodeHtmlEntities(stripHtmlTags(headerText)).trim());
}

const QUOTE_HEADER_PATTERN = /---\s*on\s+[\s\S]+?\s+wrote\s+---/i;

export function isAgentReplyWithQuote(content: string): boolean {
  return QUOTE_HEADER_PATTERN.test(content);
}

export interface AgentReplyParts {
  replyBody: string;
  quotedContent: string;
  agentSignature: string;
  preview: string;
  hasMore: boolean;
}

export function parseAgentReplyContent(
  content: string,
  inlineImageUrl?: string | EmailImageUrls
): AgentReplyParts | null {
  if (!isAgentReplyWithQuote(content)) return null;

  let html = sanitizeEmailHtml(content);

  let agentSignature = "";
  const agentSigMatch = html.match(/<div[^>]*data-email-signature[^>]*>[\s\S]*?<\/div>/i);
  if (agentSigMatch?.index != null) {
    agentSignature = agentSigMatch[0];
    html = html.slice(0, agentSigMatch.index).trim();
  }

  const headerMatch = html.match(QUOTE_HEADER_PATTERN);
  if (!headerMatch?.index) return null;

  let quoteStart = headerMatch.index;
  const before = html.slice(0, quoteStart);
  const prependMatch = before.match(/([\s\S]*?)(<hr[^>]*>\s*)$/i);
  if (prependMatch?.[1] != null) {
    quoteStart = prependMatch[1].length;
  } else {
    const brMatch = before.match(/([\s\S]*?)(<br\s*\/?>\s*)$/i);
    if (brMatch?.[1] != null) quoteStart = brMatch[1].length;
  }

  const replyBody = html.slice(0, quoteStart).trim();
  const quotedSection = html.slice(quoteStart).trim();

  const headerText = headerMatch[0];
  const quotedInner = extractQuotedInnerHtml(quotedSection, headerText);

  const formattedQuote = formatQuotedMessageBody(quotedInner, inlineImageUrl);
  const quotedContent = `
    <div class="email-quoted-thread" style="margin-top:12px;padding:10px 0 0 12px;border-left:2px solid #d9d9d9;">
      <p style="font-size:12px;color:#666;margin:0 0 10px;">${formatQuoteHeaderLine(headerText)}</p>
      ${formattedQuote}
    </div>
  `.trim();

  const previewText = stripHtmlTags(replyBody).replace(/\s+/g, " ").trim();

  return {
    replyBody,
    quotedContent,
    agentSignature,
    preview: previewText.length > 140 ? `${previewText.slice(0, 140).trim()}…` : previewText,
    hasMore: true,
  };
}

export function parseEmailContent(
  content: string,
  inlineImageUrl?: string | EmailImageUrls
): ParsedEmailContent {
  const plain = normalizeOutlookPlainText(emailTextFromContent(content.trim()) || content.trim());
  let normalized = normalizeEmailContent(content, inlineImageUrl);
  const useStandardLayout =
    shouldFormatPlainEmail(content) ||
    hasEmailSignatureContent(plain) ||
    /email-signature-block/i.test(normalized);
  const useSingleBlock =
    !useStandardLayout &&
    isStructuredEmailHtml(content) &&
    !shouldFormatPlainEmail(content);

  if (useSingleBlock) {
    const preview = getEmailPreview(content, inlineImageUrl);
    const fullText = stripHtmlTags(normalized).replace(/\s+/g, " ").trim();
    return {
      body: normalized,
      signature: "",
      preview,
      hasMore: fullText.length > stripHtmlTags(preview).length + 20,
      singleBlock: true,
    };
  }

  let { body, signature } = splitEmailContent(normalized);

  if (!signature && hasEmailSignatureContent(plain)) {
    normalized = plainTextToEmailHtml(plain, inlineImageUrl);
    ({ body, signature } = splitEmailContent(normalized));
  }

  const preview = getEmailPreview(content, inlineImageUrl);
  const fullText = stripHtmlTags(normalized).replace(/\s+/g, " ").trim();
  const previewText = stripHtmlTags(preview).replace(/\s+/g, " ").trim();

  return {
    body: body || normalized,
    signature,
    preview,
    hasMore:
      fullText.length > previewText.length + 20 ||
      Boolean(signature) ||
      /Confidentiality Note:/i.test(content),
    singleBlock: false,
  };
}
