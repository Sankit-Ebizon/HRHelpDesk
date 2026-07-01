"use client";

import { Download, FileImage, FileText, Paperclip } from "lucide-react";
import { formatFileSize } from "@/lib/ticket-conversation";
import type { TicketAttachment } from "@/types";

interface ConversationAttachmentsProps {
  attachments: TicketAttachment[];
  compact?: boolean;
}

function AttachmentIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) {
    return <FileImage className="h-5 w-5 text-[#1a73b5]" />;
  }
  return <FileText className="h-5 w-5 text-[#1a73b5]" />;
}

export function ConversationAttachments({ attachments, compact }: ConversationAttachmentsProps) {
  if (attachments.length === 0) return null;

  const totalSize = attachments.reduce((sum, att) => sum + (att.file_size || 0), 0);

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-[#555]">
        <Paperclip className="h-3.5 w-3.5" />
        {attachments.length} Attachment{attachments.length !== 1 ? "s" : ""}
        {totalSize > 0 ? ` (${formatFileSize(totalSize)})` : ""}
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={`/api/attachments/${attachment.id}/download`}
            download
            className="group flex min-w-[180px] max-w-[240px] items-center gap-2.5 rounded border border-[#d9e2ec] bg-[#f8fafc] px-3 py-2 transition-colors hover:border-[#1a73b5]/40 hover:bg-[#eef4fa]"
          >
            <AttachmentIcon mimeType={attachment.mime_type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[#222] group-hover:text-[#1a73b5]">
                {attachment.file_name}
              </p>
              {attachment.file_size ? (
                <p className="text-[11px] text-[#666]">{formatFileSize(attachment.file_size)}</p>
              ) : null}
            </div>
            <Download className="h-3.5 w-3.5 shrink-0 text-[#888] opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </div>
  );
}
