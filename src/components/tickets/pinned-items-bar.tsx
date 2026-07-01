"use client";

import { format, parseISO } from "date-fns";
import { Pin, X } from "lucide-react";
import { unpinTicketMessage } from "@/lib/actions/ticket-pins";
import { runWithLoading } from "@/lib/loading-store";
import { htmlToPlainText } from "@/lib/utils";
import { extractForwardPreviewText } from "@/lib/email-html";
import type { TicketPinnedMessage } from "@/types";

export interface PinnedMessagePreview {
  key: string;
  pin: TicketPinnedMessage;
  preview: string;
}

interface PinnedItemsBarProps {
  ticketId: string;
  items: PinnedMessagePreview[];
  onSelect: (messageKey: string) => void;
  onUnpinned?: () => void;
}

export function PinnedItemsBar({ ticketId, items, onSelect, onUnpinned }: PinnedItemsBarProps) {
  if (items.length === 0) return null;

  async function handleUnpin(messageKey: string) {
    await runWithLoading(() => unpinTicketMessage(ticketId, messageKey));
    onUnpinned?.();
  }

  return (
    <div className="mb-3 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#666]">
        {items.length} Pinned Item{items.length !== 1 ? "s" : ""}
      </p>
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-2 rounded border border-[#c5d9f0] bg-[#eef5fc] px-3 py-2"
        >
          <Pin className="h-3.5 w-3.5 shrink-0 text-[#1a73b5]" />
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-[12px] text-[#333] hover:underline"
            onClick={() => onSelect(item.key)}
          >
            {item.preview}
          </button>
          <span className="shrink-0 text-[11px] text-[#888]">
            {format(parseISO(item.pin.created_at), "dd MMM yyyy hh:mm a")}
          </span>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[#888] hover:bg-white hover:text-[#444]"
            onClick={() => handleUnpin(item.key)}
            aria-label="Unpin"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function buildPinnedPreview(content: string, maxLength = 90): string {
  let text = extractForwardPreviewText(content);
  if (!text) text = htmlToPlainText(content).replace(/\s+/g, " ").trim();
  if (!text) return "Pinned message";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}
