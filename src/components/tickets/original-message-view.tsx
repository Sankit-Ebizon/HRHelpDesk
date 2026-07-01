"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Download, Printer } from "lucide-react";
import { prepareOriginalMessageHtml } from "@/lib/print-email";
import type { OriginalEmailSource } from "@/lib/email-original";
import { formatFileSize } from "@/lib/ticket-conversation";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import type { TicketAttachment } from "@/types";

interface OriginalMessageViewProps {
  source: OriginalEmailSource;
  /** Formatted message body — matches conversation view (preferred for Content tab). */
  displayContent?: string;
  signatureImageUrl?: string;
  bodyImageUrl?: string;
  /** @deprecated Use signatureImageUrl */
  inlineImageUrl?: string;
  displayAttachments?: TicketAttachment[];
  ticketId?: string;
}

export function OriginalMessageView({
  source,
  displayContent,
  signatureImageUrl,
  bodyImageUrl,
  inlineImageUrl,
  displayAttachments = [],
  ticketId,
}: OriginalMessageViewProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "content" ? "content" : "header";
  const [copying, setCopying] = useState(false);

  const contentHtml = useMemo(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const rawContent = displayContent || source.html || source.text || "";
    const imageAttachmentUrls = displayAttachments
      .filter((att) => att.mime_type?.startsWith("image/"))
      .map((att) => `/api/attachments/${att.id}/download`);
    return prepareOriginalMessageHtml(rawContent, {
      signatureImageUrl: signatureImageUrl || inlineImageUrl,
      bodyImageUrl,
      attachmentImageUrls: imageAttachmentUrls,
      baseUrl,
    });
  }, [
    displayContent,
    source.html,
    source.text,
    signatureImageUrl,
    bodyImageUrl,
    inlineImageUrl,
    displayAttachments,
  ]);

  async function handleCopyHeader() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(source.headers);
      toast({ title: "Header copied to clipboard", variant: "success" });
    } catch {
      toast({ title: "Failed to copy header", variant: "error" });
    } finally {
      setCopying(false);
    }
  }

  function handleDownloadHeader() {
    const blob = new Blob([source.headers], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeId = source.messageId.replace(/[<>]/g, "").replace(/[^\w.-]+/g, "_");
    anchor.href = url;
    anchor.download = `email-header-${safeId || "message"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  const attachmentLabel =
    source.attachmentCount === 0
      ? "No attachments"
      : `${source.attachmentCount} Attachment${source.attachmentCount === 1 ? "" : "s"} (${(source.attachmentSize / 1024).toFixed(1)} KB)`;

  return (
    <div className="min-h-screen bg-[#f5f7f9] p-5">
      <div className="mx-auto max-w-5xl rounded border border-[#e5e7eb] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <h1 className="text-[18px] font-semibold text-[#222]">Original Message</h1>
          <div className="flex items-center gap-2">
            {activeTab === "header" ? (
              <>
                <button
                  type="button"
                  onClick={handleCopyHeader}
                  disabled={copying}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-[#ddd] bg-white px-3 text-[12px] font-medium text-[#444] hover:bg-[#fafbfc] disabled:opacity-60"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Header
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHeader}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-[#ddd] bg-white px-3 text-[12px] font-medium text-[#444] hover:bg-[#fafbfc]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Header
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#ddd] text-[#555] hover:bg-[#fafbfc]"
              aria-label="Print"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {[
              ["Message ID", source.messageId],
              ["From", source.from],
              ["To", source.to],
              ["Date", source.date],
              ["Subject", source.subject],
              ["Thread Subject", source.threadSubject],
              ["Return-Path", source.returnPath],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-[#f0f0f0]">
                <td className="w-40 px-5 py-3 font-semibold text-[#666]">{label}</td>
                <td className="px-5 py-3 text-[#222]">{value}</td>
              </tr>
            ))}
            <tr className="border-b border-[#f0f0f0]">
              <td className="w-40 px-5 py-3 font-semibold text-[#666]">Attachments</td>
              <td className="px-5 py-3 text-[#222]">
                {source.attachmentCount === 0 ? (
                  attachmentLabel
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-[#1a73b5]">{attachmentLabel}</p>
                    {displayAttachments.length > 0 ? (
                      <ul className="space-y-1">
                        {displayAttachments.map((att) => (
                          <li key={att.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                            <a
                              href={`/api/attachments/${att.id}/download`}
                              className="text-[#1a73b5] hover:underline"
                              download
                            >
                              {att.file_name}
                              {att.file_size ? ` (${formatFileSize(att.file_size)})` : ""}
                            </a>
                            {att.onedrive_url ? (
                              <a
                                href={att.onedrive_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#666] hover:text-[#1a73b5] hover:underline"
                              >
                                Open in OneDrive
                              </a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {ticketId ? (
                      <a
                        href={`/tickets/${ticketId}?tab=attachments`}
                        className="text-[12px] text-[#1a73b5] hover:underline"
                      >
                        View in ticket
                      </a>
                    ) : null}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex gap-6 border-b border-[#e5e7eb] px-5">
          <Link
            href="?tab=header"
            className={cn(
              "border-b-2 py-3 text-[12px] font-bold uppercase tracking-wide",
              activeTab === "header"
                ? "border-[#1a73b5] text-[#1a73b5]"
                : "border-transparent text-[#666]"
            )}
          >
            Header
          </Link>
          <Link
            href="?tab=content"
            className={cn(
              "border-b-2 py-3 text-[12px] font-bold uppercase tracking-wide",
              activeTab === "content"
                ? "border-[#1a73b5] text-[#1a73b5]"
                : "border-transparent text-[#666]"
            )}
          >
            Content
          </Link>
        </div>

        <div className="p-5">
          {activeTab === "header" ? (
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded border bg-[#fafafa] p-4 font-mono text-[12px] leading-relaxed text-[#333]">
              {source.headers}
            </pre>
          ) : (
            <div
              className="email-html-content zoho-tickets max-h-[70vh] overflow-auto text-[13px] leading-relaxed text-[#222]"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
