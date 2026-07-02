"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addComment, updateTicket, addTimeLog, updateTimeLog, deleteTimeLog, uploadAttachment } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { formatDate, formatDateTime, formatRelative, minutesToHHMM, sanitizeRichTextHtml, stripHtmlTags } from "@/lib/utils";
import { isHtmlContent } from "@/lib/email-html";
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/types";
import type { Ticket, TicketComment, TicketAttachment, TimeLog, TicketHistory, Profile } from "@/types";
import { MessageSquare, FileText, Clock, History, Paperclip, Send, Lock, Download, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTicketConversation } from "@/components/tickets/ticket-conversation-context";
import { TicketEmailComposer } from "@/components/tickets/ticket-email-composer";
import { TicketInternalCommentComposer } from "@/components/tickets/ticket-internal-comment-composer";
import { TicketCommentMessage, TicketConversationMessage } from "@/components/tickets/ticket-conversation-message";
import { TicketDraftMessage } from "@/components/tickets/ticket-draft-message";
import { PinnedItemsBar, buildPinnedPreview } from "@/components/tickets/pinned-items-bar";
import { PinnedMessageDialog } from "@/components/tickets/pinned-message-dialog";
import { EmailMessageContent } from "@/components/tickets/email-message-content";
import { groupAttachmentsByMessage, getEmailPrintImageUrls, getInternalAttachments, partitionComments, getSignatureInlineImageUrl } from "@/lib/ticket-conversation";
import { openHtmlPrintWindow, prepareEmailHtmlForPrint } from "@/lib/print-email";
import { toast } from "@/lib/toast-store";
import type { TicketPinnedMessage } from "@/types";

interface TicketDetailViewProps {
  ticket: Ticket;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  timeLogs: TimeLog[];
  history: TicketHistory[];
  departments: { id: string; name: string }[];
  categories: { id: string; name: string; subcategories?: { id: string; name: string }[] }[];
  agents: { id: string; full_name: string }[];
  currentUser: Profile;
  supportEmail?: string;
  pins?: TicketPinnedMessage[];
  variant?: "default" | "zoho";
}

export function TicketDetailView({
  ticket,
  comments,
  attachments,
  timeLogs,
  history,
  departments,
  categories,
  agents,
  currentUser,
  supportEmail = "",
  pins = [],
  variant = "default",
}: TicketDetailViewProps) {
  const { composerMode, closeComposer, activeTab, setActiveTab, registerHeaderCallbacks } =
    useTicketConversation();
  const router = useRouter();
  const ticketRef = useRef(ticket);
  const commentsRef = useRef(comments);
  const attachmentsRef = useRef(attachments);
  ticketRef.current = ticket;
  commentsRef.current = comments;
  attachmentsRef.current = attachments;
  const [replyContent, setReplyContent] = useState("");
  const [internalContent, setInternalContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [categoryId, setCategoryId] = useState(ticket.category_id || "");
  const [editingTimeLogId, setEditingTimeLogId] = useState<string | null>(null);
  const [discardedDraftIds, setDiscardedDraftIds] = useState<string[]>([]);
  const [pinnedDialogKey, setPinnedDialogKey] = useState<string | null>(null);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const agentsById = new Map(agents.map((agent) => [agent.id, agent.full_name]));
  const categoriesById = new Map(categories.map((category) => [category.id, category.name]));

  const totalMinutes = timeLogs.reduce((sum, log) => sum + log.time_spent_minutes, 0);
  const canEditAllTimeLogs = ["administrator", "hr_manager"].includes(currentUser.role);
  const isZoho = variant === "zoho";
  const conversationCount = comments.length + 1;
  const tabTriggerClass = isZoho
    ? "rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#444] shadow-none data-[state=active]:border-[#1a73b5] data-[state=active]:text-[#1a73b5] data-[state=active]:shadow-none"
    : "shrink-0 gap-1.5 px-2.5 py-2 text-xs sm:px-3.5 sm:text-sm";
  const tabListClass = isZoho
    ? "inline-flex h-auto w-full flex-nowrap justify-start gap-0 rounded-none border-b border-border bg-transparent p-0"
    : "inline-flex h-auto w-max min-w-full flex-nowrap justify-start p-1 sm:w-auto";
  const attachmentsByMessage = groupAttachmentsByMessage(attachments);
  const internalAttachments = getInternalAttachments(attachments);
  const initialMessageAttachments = attachmentsByMessage.get("initial") || [];
  const ticketLevelImageAttachments = attachments.filter((att) => !att.comment_id);
  const quotedInlineImageUrl =
    getSignatureInlineImageUrl(initialMessageAttachments) ??
    getSignatureInlineImageUrl(ticketLevelImageAttachments);
  const { internalComments, publicComments, draftComments } = partitionComments(comments);
  const publicCommentsNewestFirst = [...publicComments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const visibleDraftComments = draftComments.filter(
    (draft) => !discardedDraftIds.includes(draft.id)
  );

  const pinnedItems = pins.map((pin) => {
    let previewContent = "";
    if (pin.message_key === "initial") {
      previewContent = ticket.description;
    } else if (pin.message_key.startsWith("draft-")) {
      const draftId = pin.message_key.replace("draft-", "");
      previewContent = comments.find((item) => item.id === draftId)?.content || "";
    } else {
      previewContent = comments.find((item) => item.id === pin.message_key)?.content || "";
    }
    return {
      key: pin.message_key,
      pin,
      preview: buildPinnedPreview(previewContent),
    };
  });
  const pinnedMessageKeys = new Set(pins.map((pin) => pin.message_key));

  const selectedPin = pins.find((pin) => pin.message_key === pinnedDialogKey);
  const selectedPinContent = (() => {
    if (!pinnedDialogKey) return null;
    if (pinnedDialogKey === "initial") {
      return {
        authorName: ticket.contact_name,
        createdAt: ticket.created_at,
        content: ticket.description,
        attachments: attachmentsByMessage.get("initial") || [],
      };
    }
    if (pinnedDialogKey.startsWith("draft-")) {
      const draftId = pinnedDialogKey.replace("draft-", "");
      const draft = comments.find((item) => item.id === draftId);
      if (!draft) return null;
      return {
        authorName: draft.author_name,
        createdAt: draft.updated_at,
        content: draft.content,
        attachments: attachments.filter((att) => att.comment_id === draftId),
      };
    }
    const comment = comments.find((item) => item.id === pinnedDialogKey);
    if (!comment) return null;
    return {
      authorName: comment.author_name,
      createdAt: comment.created_at,
      content: comment.content,
      attachments: attachments.filter((att) => att.comment_id === comment.id),
    };
  })();

  useEffect(() => {
    registerHeaderCallbacks({
      onEdit: () => {
        setActiveTab("details");
        setEditMode(true);
      },
      onPrint: () => {
        const currentTicket = ticketRef.current;
        const currentAttachments = attachmentsRef.current;
        const attachmentsByMsg = groupAttachmentsByMessage(currentAttachments);
        const initialAttachments = attachmentsByMsg.get("initial") || [];
        const initialFallbackSignature = getSignatureInlineImageUrl(
          initialAttachments,
          currentTicket.description
        );
        const { internalComments: internal, publicComments: public_ } = partitionComments(
          commentsRef.current
        );

        const baseUrl = window.location.origin;
        const renderBody = (content: string, messageAttachments: typeof currentAttachments) => {
          const printImages = getEmailPrintImageUrls(
            messageAttachments,
            content,
            initialFallbackSignature
          );
          return prepareEmailHtmlForPrint(content, {
            signatureImageUrl: printImages.signatureImageUrl,
            bodyImageUrl: printImages.bodyImageUrl,
            attachmentImageUrls: printImages.attachmentImageUrls,
            baseUrl,
          });
        };

        const messageBlocks: string[] = [];

        for (const comment of internal) {
          messageBlocks.push(`
            <div style="margin-bottom:20px;padding:12px;background:#fff8e6;border:1px solid #f0e0b0;border-radius:4px;">
              <p style="margin:0 0 8px;font-size:13px;"><strong>${comment.author_name}</strong> · Private · ${formatDateTime(comment.created_at)}</p>
              <div class="email-html-content">${renderBody(comment.content, [])}</div>
            </div>
          `);
        }

        messageBlocks.push(`
          <div style="margin-bottom:20px;">
            <p style="margin:0 0 8px;font-size:13px;"><strong>${currentTicket.contact_name}</strong> · ${formatDateTime(currentTicket.created_at)}</p>
            <div class="email-html-content">${renderBody(currentTicket.description, initialAttachments)}</div>
          </div>
        `);

        for (const comment of public_) {
          const commentAttachments = currentAttachments.filter((att) => att.comment_id === comment.id);
          messageBlocks.push(`
            <div style="margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:13px;"><strong>${comment.author_name}</strong> · ${formatDateTime(comment.created_at)}</p>
              <div class="email-html-content">${renderBody(comment.content, commentAttachments)}</div>
            </div>
          `);
        }

        openHtmlPrintWindow({
          title: `${currentTicket.ticket_number} — ${currentTicket.subject}`,
          subtitle: `${currentTicket.ticket_number} · ${currentTicket.contact_name}`,
          bodyHtml: `
            <h1 style="font-size:18px;margin:0 0 4px;">${currentTicket.subject}</h1>
            ${messageBlocks.join("")}
          `,
        });
      },
    });
  }, [registerHeaderCallbacks, setActiveTab]);

  async function handleReply(type: "reply" | "internal") {
    const content = type === "reply" ? replyContent : internalContent;
    if (!stripHtmlTags(content).trim()) return;
    setLoading(true);
    try {
      await runWithLoading(() => addComment(ticket.id, content, type));
      if (type === "reply") setReplyContent("");
      else setInternalContent("");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await runWithLoading(() => updateTicket(ticket.id, formData));
      setEditMode(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTimeLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await runWithLoading(() => addTimeLog(ticket.id, formData));
      (e.target as HTMLFormElement).reset();
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTimeLog(e: React.FormEvent<HTMLFormElement>, logId: string) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await runWithLoading(() => updateTimeLog(logId, formData));
      setEditingTimeLogId(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const result = await runWithLoading(() => uploadAttachment(ticket.id, formData));
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      toast({ title: "Attachment uploaded", variant: "success" });
      e.target.value = "";
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 space-y-4">
      <div className={cn("-mx-1 overflow-x-auto pb-1", isZoho && "mx-0")}>
        <TabsList className={tabListClass}>
          <TabsTrigger value="conversation" className={tabTriggerClass}>
            {!isZoho && <MessageSquare className="h-4 w-4 shrink-0" />}
            {isZoho ? `${conversationCount} Conversation` : (
              <>
                <span className="hidden sm:inline">Conversation</span>
                <span className="sr-only sm:hidden">Conversation</span>
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="details" className={tabTriggerClass}>
            {!isZoho && <FileText className="h-4 w-4 shrink-0" />}
            {isZoho ? "Resolution" : (
              <>
                <span className="hidden sm:inline">Details</span>
                <span className="sr-only sm:hidden">Details</span>
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="time-logs" className={tabTriggerClass}>
            {!isZoho && <Clock className="h-4 w-4 shrink-0" />}
            {isZoho ? `Time Entry (${timeLogs.length})` : (
              <>
                <span className="hidden sm:inline">Time Logs ({timeLogs.length})</span>
                <span className="sm:hidden">{timeLogs.length}</span>
                <span className="sr-only sm:hidden">Time Logs</span>
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="attachments" className={tabTriggerClass}>
            {!isZoho && <Paperclip className="h-4 w-4 shrink-0" />}
            {isZoho ? `Attachment (${internalAttachments.length})` : (
              <>
                <span className="hidden sm:inline">Attachments ({internalAttachments.length})</span>
                <span className="sm:hidden">{internalAttachments.length}</span>
                <span className="sr-only sm:hidden">Attachments</span>
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClass}>
            {!isZoho && <History className="h-4 w-4 shrink-0" />}
            {isZoho ? "Activity" : (
              <>
                <span className="hidden sm:inline">History</span>
                <span className="sr-only sm:hidden">History</span>
              </>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Conversation Tab */}
      <TabsContent value="conversation" className="space-y-4">
        {isZoho && composerMode?.type === "internal" ? (
          <TicketInternalCommentComposer
            ticketId={ticket.id}
            currentUser={currentUser}
            onCancel={closeComposer}
            onSent={closeComposer}
          />
        ) : null}

        {isZoho &&
        (composerMode?.type === "reply" ||
          composerMode?.type === "replyAll" ||
          composerMode?.type === "forward") ? (
          <TicketEmailComposer
            ticket={ticket}
            comments={comments}
            currentUser={currentUser}
            supportEmail={supportEmail}
            mode={composerMode.type}
            messageId={composerMode.messageId}
            initialInlineImageUrl={quotedInlineImageUrl}
            editingDraft={
              composerMode.draftId
                ? comments.find((c) => c.id === composerMode.draftId)
                : undefined
            }
            onCancel={closeComposer}
            onSent={closeComposer}
          />
        ) : null}

        <div className="space-y-4">
          {isZoho ? (
            <PinnedItemsBar
              ticketId={ticket.id}
              items={pinnedItems}
              onSelect={setPinnedDialogKey}
              onUnpinned={() => router.refresh()}
            />
          ) : null}

          {isZoho
            ? visibleDraftComments
                .filter(
                  (draft) =>
                    !composerMode ||
                    composerMode.type === "internal" ||
                    composerMode.draftId !== draft.id
                )
                .map((draft) => (
                <TicketDraftMessage
                  key={draft.id}
                  ticketId={ticket.id}
                  draft={draft}
                  attachments={attachments.filter((att) => att.comment_id === draft.id)}
                  currentUser={currentUser}
                  quotedInlineImageUrl={quotedInlineImageUrl}
                  isPinned={pinnedMessageKeys.has(`draft-${draft.id}`)}
                  onDiscarded={(draftId) =>
                    setDiscardedDraftIds((prev) => [...prev, draftId])
                  }
                />
              ))
            : null}

          {isZoho
            ? internalComments.map((comment) => (
                <TicketCommentMessage
                  key={comment.id}
                  comment={comment}
                  currentUser={currentUser}
                  isPinned={pinnedMessageKeys.has(comment.id)}
                  variant="zoho"
                />
              ))
            : null}

          {isZoho ? null : (
          <Card>
            <CardContent className="p-4 pt-6 sm:p-6">
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                  {ticket.contact_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-sm">{ticket.contact_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(ticket.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap break-words">{ticket.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {isZoho
            ? publicCommentsNewestFirst.map((comment) => (
                <TicketCommentMessage
                  key={comment.id}
                  comment={comment}
                  attachments={attachmentsByMessage.get(comment.id) || []}
                  quotedInlineImageUrl={quotedInlineImageUrl}
                  currentUser={currentUser}
                  isPinned={pinnedMessageKeys.has(comment.id)}
                  variant="zoho"
                />
              ))
            : comments.map((comment) => (
            <Card key={comment.id} className={comment.comment_type === "internal" ? "border-amber-200 bg-amber-50/50" : ""}>
              <CardContent className="p-4 pt-6 sm:p-6">
                <div className="flex gap-3">
                  <div className={cn(
                    "h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold",
                    comment.comment_type === "internal" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  )}>
                    {comment.author_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      {comment.comment_type === "internal" && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                          <Lock className="h-3 w-3" /> Internal
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
                    </div>
                    <div
                      className="prose prose-sm mt-1 max-w-none break-words text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(comment.content) }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}

          {isZoho ? (
            <TicketConversationMessage
              id="initial"
              ticketId={ticket.id}
              authorName={ticket.contact_name}
              authorEmail={ticket.contact_email}
              createdAt={ticket.created_at}
              content={ticket.description}
              attachments={attachmentsByMessage.get("initial") || []}
              quotedInlineImageUrl={quotedInlineImageUrl}
              menuType="public"
              isPinned={pinnedMessageKeys.has("initial")}
              variant="zoho"
            />
          ) : null}
        </div>

        {!isZoho ? (
        <div id="ticket-reply" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-sm", isZoho && "font-semibold text-[#222]")}>Reply to Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RichTextEditor
                placeholder="Type your reply..."
                value={replyContent}
                onChange={setReplyContent}
              />
              <Button
                size="sm"
                className={cn(isZoho && "zoho-btn-primary")}
                onClick={() => handleReply("reply")}
                disabled={loading || !stripHtmlTags(replyContent).trim()}
              >
                <Send className="h-4 w-4 mr-1" /> Send Reply
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-sm flex items-center gap-2", isZoho && "font-semibold text-[#222]")}>
                <Lock className="h-4 w-4" /> Internal Comment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add internal note (not visible to contact)..."
                value={internalContent}
                onChange={(e) => setInternalContent(e.target.value)}
                rows={4}
              />
              <Button
                size="sm"
                variant={isZoho ? "outline" : "secondary"}
                className={cn(isZoho && "border-[#ccc] font-medium text-[#222] hover:bg-[#f5f7f9]")}
                onClick={() => handleReply("internal")}
                disabled={loading || !stripHtmlTags(internalContent).trim()}
              >
                Add Internal Note
              </Button>
            </CardContent>
          </Card>
        </div>
        ) : null}

        {isZoho && selectedPin && selectedPinContent ? (
          <PinnedMessageDialog
            open={Boolean(pinnedDialogKey)}
            onOpenChange={(open) => {
              if (!open) setPinnedDialogKey(null);
            }}
            pin={selectedPin}
            authorName={selectedPinContent.authorName}
            createdAt={selectedPinContent.createdAt}
            content={selectedPinContent.content}
            attachments={selectedPinContent.attachments}
            quotedInlineImageUrl={quotedInlineImageUrl}
          />
        ) : null}
      </TabsContent>

      {/* Details Tab */}
      <TabsContent value="details" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{isZoho ? "Ticket Details" : "Ticket Details"}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? "Cancel" : "Edit"}
            </Button>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <form onSubmit={handleUpdateTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input name="subject" defaultValue={ticket.subject} required />
                </div>
                {isZoho ? (
                  <input type="hidden" name="description" value={ticket.description} />
                ) : (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea name="description" defaultValue={ticket.description} rows={4} required />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input name="contact_name" defaultValue={ticket.contact_name} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input name="contact_email" type="email" defaultValue={ticket.contact_email} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Details</Label>
                  <Input name="contact_details" defaultValue={ticket.contact_details || ""} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={ticket.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue={ticket.priority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select name="owner_id" defaultValue={ticket.owner_id || ""}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input name="due_date" type="date" defaultValue={ticket.due_date?.split("T")[0] || ""} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select name="department_id" defaultValue={ticket.department_id || ""}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="category_id" value={categoryId} />
                  </div>
                </div>
                {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Sub-category</Label>
                    <Select name="subcategory_id" defaultValue={ticket.subcategory_id || ""}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {selectedCategory.subcategories.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" disabled={loading}>Save Changes</Button>
              </form>
            ) : (
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Ticket ID</dt><dd className="font-mono font-medium">{ticket.ticket_number}</dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd>{TICKET_STATUS_LABELS[ticket.status]}</dd></div>
                <div><dt className="text-muted-foreground">Priority</dt><dd>{TICKET_PRIORITY_LABELS[ticket.priority]}</dd></div>
                <div><dt className="text-muted-foreground">Owner</dt><dd>{ticket.owner?.full_name || "Unassigned"}</dd></div>
                <div><dt className="text-muted-foreground">Department</dt><dd>{ticket.department?.name || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Category</dt><dd>{ticket.category?.name || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Due Date</dt><dd>{ticket.due_date ? formatDate(ticket.due_date) : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Created</dt><dd>{formatDateTime(ticket.created_at)}</dd></div>
                <div><dt className="text-muted-foreground">Modified</dt><dd>{formatDateTime(ticket.updated_at)}</dd></div>
                {!isZoho ? (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Description</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words">{ticket.description}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Attachments Tab — internal uploads only; mail attachments appear in conversation */}
      <TabsContent value="attachments">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className={cn("text-base", isZoho && "font-semibold text-[#222]")}>Attachments</CardTitle>
            <div>
              <input type="file" id="file-upload" className="hidden" onChange={handleUpload} />
              <Button
                variant="outline"
                size="sm"
                className={cn(isZoho && "border-[#ccc] font-medium text-[#222] hover:bg-[#f5f7f9]")}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                Upload File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {internalAttachments.length === 0 ? (
              <p className={cn("text-sm", isZoho ? "font-medium text-[#444]" : "text-muted-foreground")}>
                {isZoho ? "No internal attachments yet. Files from email appear in the conversation." : "No attachments yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {internalAttachments.map((att) => (
                  <div key={att.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#222]">{att.file_name}</p>
                        <p className={cn("text-xs", isZoho ? "font-medium text-[#555]" : "text-muted-foreground")}>
                          {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ""} · {formatRelative(att.created_at)}
                        </p>
                      </div>
                    </div>
                    <a href={`/api/attachments/${att.id}/download`} download>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Time Logs Tab */}
      <TabsContent value="time-logs" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex flex-col gap-1 text-base sm:flex-row sm:items-center sm:justify-between", isZoho && "font-semibold text-[#222]")}>
              <span>Time Logs</span>
              <span className={cn("text-sm font-normal", isZoho ? "font-medium text-[#555]" : "text-muted-foreground")}>
                Total: <strong className="text-[#222]">{minutesToHHMM(totalMinutes)}</strong>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeLogs.length === 0 ? (
              <p className={cn("text-sm mb-4", isZoho ? "font-medium text-[#444]" : "text-muted-foreground")}>No time entries yet.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {timeLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3">
                    {editingTimeLogId === log.id ? (
                      <form onSubmit={(e) => handleUpdateTimeLog(e, log.id)} className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Log Date</Label>
                            <Input name="log_date" type="date" defaultValue={log.log_date} required max={new Date().toISOString().split("T")[0]} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Time (HH:MM)</Label>
                            <Input name="time_spent" defaultValue={minutesToHHMM(log.time_spent_minutes)} required pattern="\d{1,2}:\d{2}" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Textarea name="description" defaultValue={log.description} required rows={2} />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={loading}>Save</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingTimeLogId(null)}>Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:gap-3">
                            <span className="font-medium">{log.user?.full_name}</span>
                            <span className="hidden text-muted-foreground sm:inline">|</span>
                            <span>{formatDate(log.log_date)}</span>
                            <span className="hidden text-muted-foreground sm:inline">|</span>
                            <span className="font-mono font-medium">{minutesToHHMM(log.time_spent_minutes)}</span>
                          </div>
                          <p className={cn("mt-1 text-sm", isZoho ? "text-[#444]" : "text-muted-foreground")}>{log.description}</p>
                        </div>
                        {(log.user_id === currentUser.id || canEditAllTimeLogs) && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingTimeLogId(log.id)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive text-xs"
                              onClick={() => runWithLoading(() => deleteTimeLog(log.id))}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Add Time Entry</h4>
              <form onSubmit={handleAddTimeLog} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
                <div className="space-y-2">
                  <Label>Log Date *</Label>
                  <Input name="log_date" type="date" required max={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-2">
                  <Label>Time Spent (HH:MM) *</Label>
                  <Input name="time_spent" placeholder="00:30" required pattern="\d{1,2}:\d{2}" />
                </div>
                <div className="col-span-1 space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label>Description *</Label>
                  <Textarea name="description" placeholder="What did you work on?" required rows={2} />
                </div>
                <Button type="submit" size="sm" disabled={loading}>Add Time Entry</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle className={cn("text-base", isZoho && "font-semibold text-[#222]")}>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className={cn("text-sm", isZoho ? "font-medium text-[#444]" : "text-muted-foreground")}>No history recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-3">
                    <div className={cn("shrink-0 text-xs sm:w-36", isZoho ? "font-medium text-[#555]" : "text-muted-foreground")}>{formatDateTime(h.created_at)}</div>
                    <div className="min-w-0 break-words">
                      {(() => {
                        if (h.field_name === "attachment") {
                          return (
                            <>
                              <span className="font-medium">{h.user_name}</span>
                              {" added attachment "}
                              <span className="font-medium">{h.new_value}</span>
                            </>
                          );
                        }

                        const fieldName = h.field_name === "owner_id"
                          ? "owner"
                          : h.field_name === "category_id"
                            ? "category"
                            : h.field_name;
                        const oldValue = h.field_name === "owner_id"
                          ? (h.old_value ? agentsById.get(h.old_value) || "Unassigned" : "Unassigned")
                          : h.field_name === "category_id"
                            ? (h.old_value ? categoriesById.get(h.old_value) || "—" : "—")
                            : h.old_value;
                        const newValue = h.field_name === "owner_id"
                          ? (h.new_value ? agentsById.get(h.new_value) || "Unassigned" : "Unassigned")
                          : h.field_name === "category_id"
                            ? (h.new_value ? categoriesById.get(h.new_value) || "—" : "—")
                            : h.new_value;
                        return (
                          <>
                      <span className="font-medium">{h.user_name}</span>
                      {" changed "}
                      <span className="font-medium">{fieldName}</span>
                      {oldValue && <> from <span className="text-muted-foreground">{oldValue}</span></>}
                      {" to "}
                      <span className="font-medium">{newValue}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
