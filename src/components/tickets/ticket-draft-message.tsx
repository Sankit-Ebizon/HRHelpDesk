"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  FileText,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  Printer,
  Send,
  Trash2,
} from "lucide-react";
import { ConversationAttachments } from "@/components/tickets/conversation-attachments";
import { EmailMessageContent } from "@/components/tickets/email-message-content";
import { PinMessageDialog } from "@/components/tickets/pin-message-dialog";
import { useTicketConversation } from "@/components/tickets/ticket-conversation-context";
import { deleteCommentDraft, sendCommentDraft } from "@/lib/actions/tickets";
import { unpinTicketMessage } from "@/lib/actions/ticket-pins";
import { runWithLoading } from "@/lib/loading-store";
import { openEmailPrintWindow } from "@/lib/print-email";
import { toast } from "@/lib/toast-store";
import { formatFileSize, getEmailPrintImageUrls } from "@/lib/ticket-conversation";
import { getInitials, htmlToPlainText, stripHtmlTags } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Profile, TicketAttachment, TicketComment } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TicketDraftMessageProps {
  ticketId: string;
  draft: TicketComment;
  attachments?: TicketAttachment[];
  currentUser?: Profile;
  quotedInlineImageUrl?: string;
  isPinned?: boolean;
  onDiscarded?: (draftId: string) => void;
}

export function TicketDraftMessage({
  ticketId,
  draft,
  attachments = [],
  currentUser,
  quotedInlineImageUrl,
  isPinned = false,
  onDiscarded,
}: TicketDraftMessageProps) {
  const router = useRouter();
  const { openComposer } = useTicketConversation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removed, setRemoved] = useState(false);

  const canManage =
    currentUser &&
    (draft.author_id === currentUser.id ||
      currentUser.role === "administrator" ||
      currentUser.role === "hr_manager");

  const savedTime = format(parseISO(draft.updated_at), "hh:mm a");
  const previewText = htmlToPlainText(draft.content).replace(/\s+/g, " ").trim();
  const collapsedPreview =
    previewText.length > 120 ? `${previewText.slice(0, 120).trim()}…` : previewText;
  const totalAttachmentSize = attachments.reduce((sum, att) => sum + (att.file_size || 0), 0);
  const messageKey = `draft-${draft.id}`;
  const imageAttachments = attachments.filter((att) => att.mime_type?.startsWith("image/"));
  const attachmentImageUrls = imageAttachments.map(
    (att) => `/api/attachments/${att.id}/download`
  );
  const inlineImageUrl = attachmentImageUrls[0] || quotedInlineImageUrl;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (removed) return null;

  async function handleDiscard() {
    setLoading(true);
    try {
      const result = await runWithLoading(() => deleteCommentDraft(draft.id));
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      setRemoved(true);
      onDiscarded?.(draft.id);
      setDiscardOpen(false);
      toast({ title: "Draft discarded", variant: "success" });
      router.refresh();
    } finally {
      setLoading(false);
      setMenuOpen(false);
    }
  }

  async function handleSend() {
    setLoading(true);
    try {
      const result = await runWithLoading(() => sendCommentDraft(draft.id));
      if (result?.error) toast({ title: result.error, variant: "error" });
      else router.refresh();
    } finally {
      setLoading(false);
      setMenuOpen(false);
    }
  }

  async function handleUnpin() {
    setLoading(true);
    try {
      const result = await runWithLoading(() => unpinTicketMessage(ticketId, messageKey));
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      toast({ title: "Message unpinned", variant: "success" });
      router.refresh();
    } finally {
      setLoading(false);
      setMenuOpen(false);
    }
  }

  function handleEdit() {
    const meta = draft.draft_metadata;
    openComposer({
      type: meta?.mode || "forward",
      messageId: meta?.quotedMessageId,
      draftId: draft.id,
    });
    setMenuOpen(false);
  }

  function handlePrint() {
    const printImages = getEmailPrintImageUrls(attachments, draft.content, quotedInlineImageUrl);

    openEmailPrintWindow({
      title: `Draft — ${draft.author_name}`,
      subtitle: `Draft saved @ ${savedTime}`,
      bodyHtml: draft.content,
      signatureImageUrl: printImages.signatureImageUrl,
      bodyImageUrl: printImages.bodyImageUrl,
      attachmentImageUrls: printImages.attachmentImageUrls,
    });
    setMenuOpen(false);
  }

  function handleShowOriginal() {
    window.open(`/tickets/${ticketId}/original/${draft.id}`, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

  return (
    <>
      <div className="relative rounded border border-[#f0e6b8] bg-[#fffbe6] px-3 py-3">
        <div className="flex gap-3">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-[11px] font-bold text-[#333]">
            {getInitials(draft.author_name)}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1a73b5] text-white">
              <Pencil className="h-2 w-2" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-semibold text-[#222]">{draft.author_name}</span>
                <span className="rounded bg-[#fde8e8] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#c0392b]">
                  Draft
                </span>
                <span className="rounded bg-[#fff3d6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#b8860b]">
                  Private
                </span>
                <span className="text-[12px] font-medium text-[#555]">
                  Draft saved @ {savedTime}
                </span>
              </div>

              <div className="relative flex shrink-0 items-center gap-1" ref={menuRef}>
                {attachments.length > 0 ? (
                  <span className="relative" title={`${attachments.length} attachment(s)`}>
                    <Paperclip className="h-3.5 w-3.5 text-[#888]" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#1a73b5] px-0.5 text-[9px] font-bold text-white">
                      {attachments.length}
                    </span>
                  </span>
                ) : null}
                {canManage ? (
                  <>
                    <button
                      type="button"
                      className="rounded p-1 text-[#888] hover:bg-[#f0f0f0] hover:text-[#444]"
                      onClick={() => setMenuOpen((prev) => !prev)}
                      aria-label="Draft actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-1 min-w-[170px] rounded border border-[#e0e0e0] bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#333] hover:bg-[#f5f7f9]"
                          )}
                          onClick={handleEdit}
                          disabled={loading}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit draft
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#333] hover:bg-[#f5f7f9]"
                          onClick={() => {
                            setDiscardOpen(true);
                            setMenuOpen(false);
                          }}
                          disabled={loading}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Discard draft
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#333] hover:bg-[#f5f7f9]"
                          onClick={handleSend}
                          disabled={loading}
                        >
                          <Send className="h-3.5 w-3.5" /> Send draft
                        </button>
                        <div className="my-1 border-t border-[#eee]" />
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#333] hover:bg-[#f5f7f9]"
                          onClick={handleShowOriginal}
                        >
                          <FileText className="h-3.5 w-3.5" /> Show Original
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#333] hover:bg-[#f5f7f9]"
                          onClick={handlePrint}
                        >
                          <Printer className="h-3.5 w-3.5" /> Print
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#333] hover:bg-[#f5f7f9]"
                          onClick={() => {
                            if (isPinned) {
                              handleUnpin();
                            } else {
                              setPinOpen(true);
                            }
                            setMenuOpen(false);
                          }}
                        >
                          <Pin className="h-3.5 w-3.5" /> {isPinned ? "Unpin" : "Pin"}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className="mt-2 w-full text-left"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <EmailMessageContent
                  content={draft.content}
                  attachments={attachments}
                  quotedInlineImageUrl={quotedInlineImageUrl}
                  expanded
                  collapsible={false}
                />
              ) : (
                <p className="text-[13px] leading-relaxed text-[#444]">{collapsedPreview || "…"}</p>
              )}
            </button>

            {attachments.length > 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-[12px] font-medium text-[#666]">
                  {attachments.length} Attachment{attachments.length !== 1 ? "s" : ""}
                  {totalAttachmentSize > 0 ? ` (${formatFileSize(totalAttachmentSize)})` : ""}
                </p>
                <ConversationAttachments attachments={attachments} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard draft?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This draft will be permanently deleted. You cannot undo this action.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard} disabled={loading}>
              {loading ? "Discarding..." : "Discard draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinMessageDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        ticketId={ticketId}
        messageKey={messageKey}
        onPinned={() => router.refresh()}
      />
    </>
  );
}
