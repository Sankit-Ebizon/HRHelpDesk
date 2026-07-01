"use client";

import { format, parseISO } from "date-fns";
import { Pin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConversationAttachments } from "@/components/tickets/conversation-attachments";
import { EmailMessageContent } from "@/components/tickets/email-message-content";
import { formatMessageTimestamp } from "@/lib/ticket-conversation";
import { getInitials } from "@/lib/utils";
import type { TicketAttachment, TicketPinnedMessage } from "@/types";

interface PinnedMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin: TicketPinnedMessage | null;
  authorName: string;
  createdAt: string;
  content: string;
  attachments?: TicketAttachment[];
  quotedInlineImageUrl?: string;
}

export function PinnedMessageDialog({
  open,
  onOpenChange,
  pin,
  authorName,
  createdAt,
  content,
  attachments = [],
  quotedInlineImageUrl,
}: PinnedMessageDialogProps) {
  if (!pin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pinned Incoming Thread</DialogTitle>
        </DialogHeader>

        <div className="rounded border border-[#e8e8e8] bg-[#fafbfc] px-3 py-2">
          <div className="flex items-center gap-2 text-[12px] text-[#555]">
            <Pin className="h-3.5 w-3.5 text-[#f0a030]" />
            <span>
              Pinned by <strong className="text-[#222]">{pin.pinned_by_name}</strong>
            </span>
            <span>·</span>
            <span>{format(parseISO(pin.created_at), "dd MMM yyyy hh:mm a")}</span>
            <span>·</span>
            <span>
              {pin.visibility === "all_agents"
                ? "Pin visible for all agents"
                : "Pin visible only to you"}
            </span>
          </div>
        </div>

        <div className="rounded border border-[#e8e8e8] bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8eef5] text-[11px] font-bold text-[#333]">
              {getInitials(authorName)}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#222]">{authorName}</p>
              <p className="text-[12px] text-[#666]">{formatMessageTimestamp(createdAt)}</p>
            </div>
          </div>

          <EmailMessageContent
            content={content}
            attachments={attachments}
            quotedInlineImageUrl={quotedInlineImageUrl}
            expanded
            collapsible={false}
          />

          {attachments.length > 0 ? (
            <div className="mt-4 border-t border-[#eee] pt-3">
              <ConversationAttachments attachments={attachments} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
