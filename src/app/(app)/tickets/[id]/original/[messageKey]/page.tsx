import { notFound, redirect } from "next/navigation";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { OriginalMessageView } from "@/components/tickets/original-message-view";
import {
  getOriginalEmailSourceForComment,
  getOriginalEmailSourceForTicket,
} from "@/lib/email-original";
import {
  getSupportEmail,
  getTicketAttachments,
  getTicketById,
  getTicketComments,
} from "@/lib/queries";
import {
  getBodyInlineImageUrl,
  getMessageDisplayAttachments,
  getSignatureInlineImageUrl,
  isEmailAttachment,
} from "@/lib/ticket-conversation";
import { canAccess } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string; messageKey: string }>;
}

export default async function OriginalMessagePage({ params }: PageProps) {
  const { id, messageKey } = await params;
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "tickets", "read")) redirect("/dashboard");

  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const [comments, attachments, supportEmail] = await Promise.all([
    getTicketComments(id),
    getTicketAttachments(id),
    getSupportEmail(),
  ]);

  if (messageKey === "initial") {
    const initialAttachments = attachments.filter(
      (att) => isEmailAttachment(att) && !att.comment_id
    );
    const displayAttachments = getMessageDisplayAttachments(
      initialAttachments,
      ticket.description
    );
    const attachmentSize = displayAttachments.reduce((sum, att) => sum + (att.file_size || 0), 0);
    const signatureImageUrl = getSignatureInlineImageUrl(initialAttachments, ticket.description);
    const bodyImageUrl = getBodyInlineImageUrl(initialAttachments, ticket.description);
    const source = getOriginalEmailSourceForTicket(
      ticket,
      supportEmail,
      displayAttachments.length,
      attachmentSize
    );
    return (
      <OriginalMessageView
        source={source}
        displayContent={ticket.description}
        signatureImageUrl={signatureImageUrl}
        bodyImageUrl={bodyImageUrl}
        displayAttachments={displayAttachments}
        ticketId={ticket.id}
      />
    );
  }

  const comment = comments.find((item) => item.id === messageKey);
  if (!comment) notFound();

  const commentAttachments = attachments.filter(
    (att) => att.comment_id === comment.id && isEmailAttachment(att)
  );
  const displayAttachments = getMessageDisplayAttachments(commentAttachments, comment.content);
  const attachmentSize = displayAttachments.reduce((sum, att) => sum + (att.file_size || 0), 0);
  const signatureImageUrl = getSignatureInlineImageUrl(commentAttachments, comment.content);
  const bodyImageUrl = getBodyInlineImageUrl(commentAttachments, comment.content);
  const source = getOriginalEmailSourceForComment(
    comment,
    ticket,
    supportEmail,
    displayAttachments.length,
    attachmentSize
  );

  return (
    <OriginalMessageView
      source={source}
      displayContent={comment.content}
      signatureImageUrl={signatureImageUrl}
      bodyImageUrl={bodyImageUrl}
      displayAttachments={displayAttachments}
      ticketId={ticket.id}
    />
  );
}
