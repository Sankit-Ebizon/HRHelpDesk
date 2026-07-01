"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Forward,
  Lock,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  Printer,
  Reply,
  ReplyAll,
  Trash2,
  FileText,
} from "lucide-react";
import { ConversationAttachments } from "@/components/tickets/conversation-attachments";
import { EmailMessageContent } from "@/components/tickets/email-message-content";
import { PinMessageDialog } from "@/components/tickets/pin-message-dialog";
import { useTicketConversation } from "@/components/tickets/ticket-conversation-context";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteComment, updateInternalComment } from "@/lib/actions/tickets";
import { unpinTicketMessage } from "@/lib/actions/ticket-pins";
import { runWithLoading } from "@/lib/loading-store";
import { formatMessageTimestamp, getEmailPrintImageUrls, getMessageDisplayAttachments } from "@/lib/ticket-conversation";
import { isHtmlContent } from "@/lib/email-html";
import { openEmailPrintWindow } from "@/lib/print-email";
import { toast } from "@/lib/toast-store";
import { cn, formatDateTime, getInitials, sanitizeRichTextHtml, stripHtmlTags } from "@/lib/utils";
import type { Profile, TicketAttachment, TicketComment } from "@/types";

type MessageMenuType = "public" | "internal" | "none";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  dividerBefore?: boolean;
}

interface TicketConversationMessageProps {
  id: string;
  ticketId: string;
  authorName: string;
  authorEmail?: string;
  createdAt: string;
  content: string;
  isInternal?: boolean;
  attachments?: TicketAttachment[];
  quotedInlineImageUrl?: string;
  menuType?: MessageMenuType;
  currentUser?: Profile;
  authorId?: string | null;
  isPinned?: boolean;
  variant?: "default" | "zoho";
}

function MessageActionMenu({ items }: { items: MenuItem[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="rounded p-1 text-[#888] hover:bg-[#f0f0f0] hover:text-[#444]"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Message actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded border border-[#e0e0e0] bg-white py-1 shadow-lg">
          {items.map((item) => (
            <div key={item.label}>
              {item.dividerBefore ? <div className="my-1 border-t border-[#eee]" /> : null}
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] hover:bg-[#f5f7f9]",
                  item.destructive ? "text-red-600" : "text-[#333]"
                )}
                onClick={() => {
                  item.onClick();
                  setMenuOpen(false);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TicketConversationMessage({
  id,
  ticketId,
  authorName,
  createdAt,
  content,
  isInternal = false,
  attachments = [],
  quotedInlineImageUrl,
  menuType = "public",
  currentUser,
  authorId,
  isPinned = false,
  variant = "zoho",
}: TicketConversationMessageProps) {
  const router = useRouter();
  const { openComposer } = useTicketConversation();
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [pinOpen, setPinOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageExpanded, setMessageExpanded] = useState(false);
  const isZoho = variant === "zoho";
  const htmlContent = isHtmlContent(content);
  const isPublicEmail = !isInternal && menuType === "public";

  const canManageInternal =
    isInternal &&
    currentUser &&
    (authorId === currentUser.id ||
      currentUser.role === "administrator" ||
      currentUser.role === "hr_manager");

  async function handleDelete() {
    if (!window.confirm("Delete this internal comment?")) return;
    setLoading(true);
    try {
      const result = await runWithLoading(() => deleteComment(id));
      if (!result?.error) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!stripHtmlTags(editContent).trim()) return;
    setLoading(true);
    try {
      const result = await runWithLoading(() => updateInternalComment(id, editContent));
      if (!result?.error) {
        setEditOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
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
    }
  }

  function handlePrint() {
    const printImages = getEmailPrintImageUrls(attachments, content, quotedInlineImageUrl);

    openEmailPrintWindow({
      title: authorName,
      subtitle: formatDateTime(createdAt),
      bodyHtml: content,
      signatureImageUrl: printImages.signatureImageUrl,
      bodyImageUrl: printImages.bodyImageUrl,
      attachmentImageUrls: printImages.attachmentImageUrls,
    });
  }

  function handleShowOriginal() {
    const messageKey = id === "initial" ? "initial" : id;
    window.open(`/tickets/${ticketId}/original/${messageKey}`, "_blank", "noopener,noreferrer");
  }

  const messageKey = id === "initial" ? "initial" : id;

  const menuItems: MenuItem[] = [];

  if (menuType === "public") {
    menuItems.push(
      {
        label: "Reply",
        icon: <Reply className="h-3.5 w-3.5" />,
        onClick: () => openComposer({ type: "reply", messageId: id }),
      },
      {
        label: "Reply All",
        icon: <ReplyAll className="h-3.5 w-3.5" />,
        onClick: () => openComposer({ type: "replyAll", messageId: id }),
      },
      {
        label: "Forward",
        icon: <Forward className="h-3.5 w-3.5" />,
        onClick: () => openComposer({ type: "forward", messageId: id }),
      },
      {
        label: "Show Original",
        icon: <FileText className="h-3.5 w-3.5" />,
        onClick: handleShowOriginal,
        dividerBefore: true,
      },
      {
        label: "Print",
        icon: <Printer className="h-3.5 w-3.5" />,
        onClick: handlePrint,
      },
      {
        label: isPinned ? "Unpin" : "Pin",
        icon: <Pin className="h-3.5 w-3.5" />,
        onClick: isPinned ? handleUnpin : () => setPinOpen(true),
      }
    );
  } else if (menuType === "internal" && canManageInternal) {
    menuItems.push(
      {
        label: "Edit",
        icon: <Pencil className="h-3.5 w-3.5" />,
        onClick: () => {
          setEditContent(content);
          setEditOpen(true);
        },
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        onClick: handleDelete,
        destructive: true,
      },
      {
        label: isPinned ? "Unpin" : "Pin",
        icon: <Pin className="h-3.5 w-3.5" />,
        onClick: isPinned ? handleUnpin : () => setPinOpen(true),
      }
    );
  }

  const displayAttachmentCount = getMessageDisplayAttachments(attachments, content).length;

  return (
    <>
      <div
        className={cn(
          "relative",
          isInternal && isZoho
            ? "rounded border border-[#f0e6b8] bg-[#fffbe6] px-3 py-3"
            : "border-b border-border pb-4",
          isInternal && !isZoho && "rounded border border-amber-200 bg-amber-50/50 p-4",
          isPublicEmail && "cursor-pointer rounded-sm transition-colors hover:bg-[#fafbfc]"
        )}
        onClick={isPublicEmail ? () => setMessageExpanded((prev) => !prev) : undefined}
        onKeyDown={
          isPublicEmail
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setMessageExpanded((prev) => !prev);
                }
              }
            : undefined
        }
        role={isPublicEmail ? "button" : undefined}
        tabIndex={isPublicEmail ? 0 : undefined}
        aria-expanded={isPublicEmail ? messageExpanded : undefined}
      >
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              isInternal
                ? "bg-[#f5e6a8] text-[#8a6d00]"
                : isZoho
                  ? "bg-[#e8eef5] text-[#333]"
                  : "bg-blue-100 text-blue-700"
            )}
          >
            {getInitials(authorName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn("font-semibold", isZoho ? "text-[13px] text-[#222]" : "text-sm")}>
                  {authorName}
                </span>
                {isInternal ? (
                  <span className="inline-flex items-center gap-1 rounded bg-[#f5e6a8] px-1.5 py-0.5 text-[11px] font-medium text-[#8a6d00]">
                    <Lock className="h-3 w-3" />
                    Private
                  </span>
                ) : null}
                <span className={cn(isZoho ? "text-[12px] font-medium text-[#555]" : "text-xs text-muted-foreground")}>
                  {isZoho ? formatMessageTimestamp(createdAt) : formatDateTime(createdAt)}
                </span>
              </div>
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {displayAttachmentCount > 0 ? (
                  <span title={`${displayAttachmentCount} attachment(s)`}>
                    <Paperclip className="h-3.5 w-3.5 text-[#888]" />
                  </span>
                ) : null}
                {menuType !== "none" ? <MessageActionMenu items={menuItems} /> : null}
              </div>
            </div>

            {isPublicEmail ? (
              <EmailMessageContent
                content={content}
                attachments={attachments}
                quotedInlineImageUrl={quotedInlineImageUrl}
                expanded={messageExpanded}
                collapsible
              />
            ) : htmlContent ? (
              <div
                className={cn(
                  "mt-2 max-w-none break-words leading-relaxed [&_a]:text-[#1a73b5] [&_img]:max-w-full [&_img]:rounded",
                  isZoho ? "text-[13px] text-[#222]" : "prose prose-sm text-sm"
                )}
                dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(content) }}
              />
            ) : (
              <p
                className={cn(
                  "mt-2 whitespace-pre-wrap break-words leading-relaxed",
                  isZoho ? "text-[13px] text-[#222]" : "text-sm"
                )}
              >
                {content}
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Internal Comment</DialogTitle>
          </DialogHeader>
          <RichTextEditor value={editContent} onChange={setEditContent} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="zoho-btn-primary"
              onClick={handleSaveEdit}
              disabled={loading || !stripHtmlTags(editContent).trim()}
            >
              Save
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

interface TicketCommentMessageProps {
  comment: TicketComment;
  attachments?: TicketAttachment[];
  quotedInlineImageUrl?: string;
  currentUser?: Profile;
  isPinned?: boolean;
  variant?: "default" | "zoho";
}

export function TicketCommentMessage({
  comment,
  attachments = [],
  quotedInlineImageUrl,
  currentUser,
  isPinned = false,
  variant = "zoho",
}: TicketCommentMessageProps) {
  const isInternal = comment.comment_type === "internal";

  return (
    <TicketConversationMessage
      id={comment.id}
      ticketId={comment.ticket_id}
      authorName={comment.author_name}
      authorEmail={comment.author_email || undefined}
      createdAt={comment.created_at}
      content={comment.content}
      isInternal={isInternal}
      attachments={isInternal ? [] : attachments}
      quotedInlineImageUrl={isInternal ? undefined : quotedInlineImageUrl}
      menuType={isInternal ? "internal" : "public"}
      currentUser={currentUser}
      authorId={comment.author_id}
      isPinned={isPinned}
      variant={variant}
    />
  );
}
