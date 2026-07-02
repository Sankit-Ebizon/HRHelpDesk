"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Send,
  Strikethrough,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveCommentDraft,
  sendCommentDraft,
  uploadAttachment,
} from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import {
  buildEmailSignature,
  buildForwardBody,
  buildFullThreadQuote,
  getForwardSubject,
  getReplyRecipients,
  type EmailRecipient,
} from "@/lib/ticket-conversation";
import { cn, stripHtmlTags } from "@/lib/utils";
import type { DraftMetadata, Profile, Ticket, TicketComment } from "@/types";

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight";

interface TicketEmailComposerProps {
  ticket: Ticket;
  comments: TicketComment[];
  currentUser: Profile;
  supportEmail: string;
  mode: "reply" | "replyAll" | "forward";
  messageId?: string;
  initialInlineImageUrl?: string;
  editingDraft?: TicketComment;
  onCancel: () => void;
  onSent: () => void;
}

function RecipientChips({
  label,
  recipients,
  onRemove,
}: {
  label: string;
  recipients: EmailRecipient[];
  onRemove?: (email: string) => void;
}) {
  if (recipients.length === 0) return null;

  return (
    <div className="flex min-h-[36px] items-start gap-2 border-b border-[#e8e8e8] px-3 py-2">
      <span className="w-10 shrink-0 pt-1 text-[12px] font-medium text-[#666]">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {recipients.map((recipient) => (
          <span
            key={recipient.email}
            className="inline-flex items-center gap-1 rounded bg-[#eef2f7] px-2 py-0.5 text-[12px] font-medium text-[#333]"
          >
            {recipient.name || recipient.email}
            {onRemove ? (
              <button
                type="button"
                className="text-[#888] hover:text-[#333]"
                onClick={() => onRemove(recipient.email)}
                aria-label={`Remove ${recipient.email}`}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function parseRecipientInput(value: string): EmailRecipient | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    return { name: match[1]?.trim() || match[2].trim(), email: match[2].trim() };
  }
  if (trimmed.includes("@")) {
    return { name: trimmed, email: trimmed };
  }
  return null;
}

export function TicketEmailComposer({
  ticket,
  comments,
  currentUser,
  supportEmail,
  mode,
  messageId,
  initialInlineImageUrl,
  editingDraft,
  onCancel,
  onSent,
}: TicketEmailComposerProps) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showCcInput, setShowCcInput] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const draftId = editingDraft?.id;

  const replyRecipients = getReplyRecipients(
    ticket,
    comments,
    supportEmail,
    mode === "replyAll" ? "replyAll" : "reply",
    { messageId, currentUserEmail: currentUser.email }
  );
  const [toRecipients, setToRecipients] = useState<EmailRecipient[]>(
    editingDraft?.draft_metadata?.to ?? (mode === "forward" ? [] : replyRecipients.to)
  );
  const [ccRecipients, setCcRecipients] = useState<EmailRecipient[]>(
    editingDraft?.draft_metadata?.cc ?? (mode === "forward" ? [] : replyRecipients.cc)
  );
  const [bccRecipients, setBccRecipients] = useState<EmailRecipient[]>(
    editingDraft?.draft_metadata?.bcc ?? []
  );
  const fromAddress = supportEmail.split(",")[0]?.trim() || currentUser.email;

  const composerTitle =
    mode === "forward" ? "Forward" : mode === "replyAll" ? "Reply All" : "Reply";

  useEffect(() => {
    if (!editorRef.current || editingDraft) return;

    if (mode === "forward") {
      editorRef.current.innerHTML = buildForwardBody({
        ticket,
        comments,
        messageId: messageId || "initial",
        supportEmail,
        inlineImageUrl: initialInlineImageUrl,
      });
    } else {
      const quote = buildFullThreadQuote(ticket, comments, messageId, initialInlineImageUrl);
      const sig = buildEmailSignature(currentUser, supportEmail);
      editorRef.current.innerHTML = `<p><br /></p>${quote}${sig}`;
    }
    editorRef.current.focus();
  }, [
    mode,
    messageId,
    ticket,
    comments,
    currentUser,
    supportEmail,
    initialInlineImageUrl,
    editingDraft,
  ]);

  useEffect(() => {
    if (!editorRef.current || !editingDraft) return;
    editorRef.current.innerHTML = editingDraft.content;
    if (editingDraft.draft_metadata?.bcc?.length) setShowBcc(true);
    editorRef.current.focus();
  }, [editingDraft]);

  function buildMetadata(): DraftMetadata {
    return {
      mode,
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      quotedMessageId: messageId || "initial",
      subject: mode === "forward" ? getForwardSubject(ticket) : undefined,
    };
  }

  function exec(command: Command) {
    editorRef.current?.focus();
    document.execCommand(command);
  }

  function addLink() {
    editorRef.current?.focus();
    const url = window.prompt("Enter URL");
    if (!url) return;
    document.execCommand("createLink", false, url);
  }

  function getEditorHtml() {
    return editorRef.current?.innerHTML || "";
  }

  function removeCc(email: string) {
    setCcRecipients((prev) => prev.filter((r) => r.email !== email));
  }

  function removeTo(email: string) {
    setToRecipients((prev) => prev.filter((r) => r.email !== email));
  }

  async function uploadPendingFiles(commentId: string) {
    for (const file of pendingFiles) {
      const formData = new FormData();
      formData.append("file", file);
      await runWithLoading(() => uploadAttachment(ticket.id, formData, { commentId }));
    }
  }

  async function handleSaveDraft(): Promise<string | undefined> {
    const html = getEditorHtml();
    if (!stripHtmlTags(html).trim()) return undefined;

    const result = await runWithLoading(() =>
      saveCommentDraft(ticket.id, html, buildMetadata(), draftId)
    );

    if (result?.error) {
      toast({ title: result.error, variant: "error" });
      return undefined;
    }

    if (result?.draftId && pendingFiles.length > 0) {
      await uploadPendingFiles(result.draftId);
      setPendingFiles([]);
    }

    return result?.draftId;
  }

  async function handleCancel() {
    const html = getEditorHtml();
    if (!stripHtmlTags(html).trim()) {
      onCancel();
      return;
    }

    setSavingDraft(true);
    try {
      const savedId = await handleSaveDraft();
      if (savedId) {
        toast({ title: "Draft saved", variant: "success" });
        onCancel();
        router.refresh();
      }
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSend() {
    const html = getEditorHtml();
    if (!stripHtmlTags(html).trim()) return;

    if (toRecipients.length === 0) {
      toast({ title: "Enter at least one recipient", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const id = await handleSaveDraft();
      if (!id) return;

      const result = await runWithLoading(() => sendCommentDraft(id));
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }

      onSent();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles((prev) => [...prev, ...files]);
    }
    e.target.value = "";
  }

  const composerActions = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        className={cn("zoho-btn-primary h-8 gap-1 px-4")}
        onClick={handleSend}
        disabled={loading || savingDraft}
      >
        <Send className="h-3.5 w-3.5" />
        Send
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-[#ccc] px-4 text-[13px] font-medium text-[#444] hover:bg-[#f5f7f9]"
        onClick={handleCancel}
        disabled={loading || savingDraft}
      >
        Cancel
      </Button>
    </div>
  );

  return (
    <div className="mb-4 overflow-hidden rounded border border-[#d9e2ec] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e8e8e8] bg-[#fafbfc] px-3 py-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-[#555]">
          {composerTitle}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#999]">
            {savingDraft ? "Saving draft..." : null}
          </span>
          {composerActions}
        </div>
      </div>

      <div className="border-b border-[#e8e8e8]">
        <div className="flex min-h-[36px] items-center gap-2 border-b border-[#e8e8e8] px-3 py-2">
          <span className="w-10 shrink-0 text-[12px] font-medium text-[#666]">From</span>
          <span className="inline-flex rounded bg-[#eef2f7] px-2 py-0.5 text-[12px] font-medium text-[#333]">
            Helpdesk Support &lt;{fromAddress}&gt;
          </span>
        </div>

        <>
          <RecipientChips label="To" recipients={toRecipients} onRemove={removeTo} />
          <div className="flex min-h-[36px] items-center gap-2 border-b border-[#e8e8e8] px-3 py-2">
            <span className="w-10 shrink-0 text-[12px] font-medium text-[#666]">
              {toRecipients.length > 0 ? "" : "To"}
            </span>
            <Input
              className="h-7 flex-1 border-0 bg-transparent px-0 text-[12px] shadow-none focus-visible:ring-0"
              placeholder="Enter the Recipients Email Address"
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== ",") return;
                e.preventDefault();
                const recipient = parseRecipientInput(e.currentTarget.value);
                if (!recipient) return;
                setToRecipients((prev) =>
                  prev.some((r) => r.email.toLowerCase() === recipient.email.toLowerCase())
                    ? prev
                    : [...prev, recipient]
                );
                e.currentTarget.value = "";
              }}
            />
            {mode === "forward" ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="text-[12px] text-[#1a73b5] hover:underline"
                  onClick={() => setShowCcInput((prev) => !prev)}
                >
                  Cc
                </button>
                <button
                  type="button"
                  className="text-[12px] text-[#1a73b5] hover:underline"
                  onClick={() => setShowBcc((prev) => !prev)}
                >
                  Bcc
                </button>
              </div>
            ) : null}
          </div>
        </>

        {mode === "forward" && showCcInput ? (
          <div className="flex min-h-[36px] items-center gap-2 border-b border-[#e8e8e8] px-3 py-2">
            <span className="w-10 shrink-0 text-[12px] font-medium text-[#666]">Cc</span>
            <Input
              className="h-7 flex-1 border-0 bg-transparent px-0 text-[12px] shadow-none focus-visible:ring-0"
              placeholder="Add Cc recipients"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const recipient = parseRecipientInput(e.currentTarget.value);
                if (!recipient) return;
                setCcRecipients((prev) => [...prev, recipient]);
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : (
          <RecipientChips label="Cc" recipients={ccRecipients} onRemove={removeCc} />
        )}

        {showBcc ? (
          <div className="flex min-h-[36px] items-center gap-2 border-b border-[#e8e8e8] px-3 py-2">
            <span className="w-10 shrink-0 text-[12px] font-medium text-[#666]">Bcc</span>
            <Input
              className="h-7 flex-1 border-0 bg-transparent px-0 text-[12px] shadow-none focus-visible:ring-0"
              placeholder="Add Bcc recipients"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const recipient = parseRecipientInput(e.currentTarget.value);
                if (!recipient) return;
                setBccRecipients((prev) => [...prev, recipient]);
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : null}

        {mode !== "forward" ? (
          <div className="flex justify-end px-3 py-1">
            <button
              type="button"
              className="text-[12px] text-[#1a73b5] hover:underline"
              onClick={() => setShowBcc((prev) => !prev)}
            >
              Bcc
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#e8e8e8] bg-[#fafbfc] px-2 py-1.5">
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("strikeThrough")}>
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
        <span className="mx-1 h-4 w-px bg-[#ddd]" />
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("justifyLeft")}>
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("justifyCenter")}>
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("justifyRight")}>
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
        <span className="mx-1 h-4 w-px bg-[#ddd]" />
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <span className="mx-1 h-4 w-px bg-[#ddd]" />
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={addLink}>
          <Link2 className="mr-1 h-3.5 w-3.5" />
          Link
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        className="min-h-[220px] max-h-[420px] overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-[#222] focus:outline-none [&_a]:text-[#1a73b5] [&_blockquote]:border-l-2 [&_blockquote]:border-[#ccc] [&_blockquote]:pl-3"
        suppressContentEditableWarning
      />

      {pendingFiles.length > 0 ? (
        <div className="border-t border-[#e8e8e8] px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1 rounded bg-[#eef2f7] px-2 py-1 text-[11px] text-[#333]"
              >
                <Paperclip className="h-3 w-3" />
                {file.name}
                <button
                  type="button"
                  className="text-[#888] hover:text-[#333]"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-[#e8e8e8] bg-[#fafbfc] px-3 py-2">
        <div className="flex items-center gap-1">
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileSelect} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[#555]"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {composerActions}
        </div>
      </div>
    </div>
  );
}
