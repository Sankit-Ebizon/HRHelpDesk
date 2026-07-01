import {
  extractInlineAttachmentUrl,
  normalizeEmailContent,
  sanitizeEmailHtml,
  type EmailImageUrls,
} from "@/lib/email-html";

const PRINT_EMAIL_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #222; font-size: 13px; line-height: 1.55; }
  .email-html-content table { border-collapse: collapse; border-spacing: 0; max-width: 100%; }
  .email-html-content tr { display: table-row; }
  .email-html-content td, .email-html-content th { display: table-cell; vertical-align: top; padding: 0; }
  .email-html-content p { margin: 0; padding: 0; }
  .email-html-content img { max-width: 100%; height: auto; display: block; }
  .email-html-content .email-signature-block img {
    width: 72px !important;
    height: 72px !important;
    max-width: 72px !important;
    object-fit: cover;
    border-radius: 2px;
  }
  .email-html-content .email-html-signature img {
    width: 72px !important;
    height: 72px !important;
    max-width: 72px !important;
    object-fit: cover;
    border-radius: 2px;
  }
  .email-html-content a { color: #1a73b5; text-decoration: none; }
  .email-html-content hr { border: none; border-top: 1px solid #d9d9d9; margin: 10px 0; }
  .email-html-content .email-signature-block { margin-top: 12px; }
  .email-html-content .email-plain-body { white-space: pre-wrap; word-break: break-word; }
`;

export function resolveEmailInlineImageUrl(
  html: string,
  options?: { inlineImageUrl?: string; attachmentImageUrls?: string[] }
): string | undefined {
  return (
    options?.inlineImageUrl ||
    options?.attachmentImageUrls?.[0] ||
    extractInlineAttachmentUrl(html)
  );
}

export function toAbsoluteAssetUrl(url: string | undefined, baseUrl: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export function resolveEmailPrintImageUrls(options?: {
  signatureImageUrl?: string;
  bodyImageUrl?: string;
  inlineImageUrl?: string;
  attachmentImageUrls?: string[];
  baseUrl?: string;
}): { imageUrls: EmailImageUrls; attachmentUrls: string[]; cidPool: string[] } {
  const baseUrl = options?.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const attachmentUrls = (options?.attachmentImageUrls || [])
    .map((url) => toAbsoluteAssetUrl(url, baseUrl))
    .filter((url): url is string => Boolean(url));

  const signatureImageUrl = toAbsoluteAssetUrl(
    options?.signatureImageUrl || options?.inlineImageUrl,
    baseUrl
  );
  let bodyImageUrl = toAbsoluteAssetUrl(options?.bodyImageUrl, baseUrl);
  if (!bodyImageUrl) {
    bodyImageUrl = attachmentUrls.find((url) => url !== signatureImageUrl);
  }

  const cidPool = [bodyImageUrl, signatureImageUrl, ...attachmentUrls].filter(
    (url, index, arr): url is string => Boolean(url) && arr.indexOf(url) === index
  );

  return {
    imageUrls: { signatureImageUrl, bodyImageUrl },
    attachmentUrls,
    cidPool,
  };
}

export interface PrepareEmailHtmlOptions {
  signatureImageUrl?: string;
  bodyImageUrl?: string;
  /** @deprecated Use signatureImageUrl / bodyImageUrl */
  inlineImageUrl?: string;
  attachmentImageUrls?: string[];
  baseUrl?: string;
}

export function prepareEmailHtmlForPrint(
  html: string,
  options?: PrepareEmailHtmlOptions
): string {
  const baseUrl = options?.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const { imageUrls, cidPool } = resolveEmailPrintImageUrls({ ...options, baseUrl });

  let prepared = html;
  let cidIndex = 0;
  prepared = prepared.replace(/src=["']cid:[^"']+["']/gi, () => {
    const url = cidPool[cidIndex++] || cidPool[0] || "";
    return url ? `src="${url}"` : 'src=""';
  });

  prepared = normalizeEmailContent(prepared, imageUrls);
  prepared = sanitizeEmailHtml(prepared);

  prepared = prepared.replace(/src=["'](\/api\/attachments\/[^"']+)["']/gi, (_, path: string) => {
    return `src="${baseUrl}${path}"`;
  });

  return prepared;
}

export function prepareOriginalMessageHtml(
  html: string,
  options?: PrepareEmailHtmlOptions
): string {
  return prepareEmailHtmlForPrint(html, options);
}

function printWhenImagesReady(printWindow: Window) {
  const images = printWindow.document.images;
  if (images.length === 0) {
    printWindow.print();
    return;
  }

  let loaded = 0;
  const tryPrint = () => {
    loaded += 1;
    if (loaded >= images.length) {
      printWindow.print();
    }
  };

  for (let i = 0; i < images.length; i += 1) {
    if (images[i].complete) {
      tryPrint();
    } else {
      images[i].onload = tryPrint;
      images[i].onerror = tryPrint;
    }
  }
}

export function openHtmlPrintWindow(options: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
}) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${options.title}</title>
        <style>${PRINT_EMAIL_STYLES}</style>
      </head>
      <body>
        ${options.subtitle ? `<p style="margin:0 0 16px;font-size:12px;color:#666;">${options.subtitle}</p>` : ""}
        ${options.bodyHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWhenImagesReady(printWindow);
}

export function openEmailPrintWindow(options: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  signatureImageUrl?: string;
  bodyImageUrl?: string;
  inlineImageUrl?: string;
  attachmentImageUrls?: string[];
}) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const prepared = prepareEmailHtmlForPrint(options.bodyHtml, {
    signatureImageUrl: options.signatureImageUrl || options.inlineImageUrl,
    bodyImageUrl: options.bodyImageUrl,
    attachmentImageUrls: options.attachmentImageUrls,
    baseUrl,
  });

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${options.title}</title>
        <style>${PRINT_EMAIL_STYLES}</style>
      </head>
      <body>
        ${options.subtitle ? `<p style="margin:0 0 16px;font-size:12px;color:#666;">${options.subtitle}</p>` : ""}
        <div class="email-html-content">${prepared}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWhenImagesReady(printWindow);
}
