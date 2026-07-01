"use client";

import { useMemo } from "react";
import { ConversationAttachments } from "@/components/tickets/conversation-attachments";
import {
  isAgentReplyWithQuote,
  parseAgentReplyContent,
  parseEmailContent,
  sanitizeEmailHtml,
} from "@/lib/email-html";
import { getBodyInlineImageUrl, getSignatureInlineImageUrl, getMessageDisplayAttachments } from "@/lib/ticket-conversation";
import { stripHtmlTags } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TicketAttachment } from "@/types";

interface EmailMessageContentProps {
  content: string;
  attachments?: TicketAttachment[];
  quotedInlineImageUrl?: string;
  expanded: boolean;
  collapsible?: boolean;
}

function getEmailImageUrls(
  attachments: TicketAttachment[],
  content: string,
  quotedInlineImageUrl?: string
) {
  const signatureImageUrl =
    getSignatureInlineImageUrl(attachments, content) ?? quotedInlineImageUrl;
  const bodyImageUrl = getBodyInlineImageUrl(attachments, content);
  return { signatureImageUrl, bodyImageUrl };
}

export function EmailMessageContent({
  content,
  attachments = [],
  quotedInlineImageUrl,
  expanded,
  collapsible = true,
}: EmailMessageContentProps) {
  const imageUrls = useMemo(
    () => getEmailImageUrls(attachments, content, quotedInlineImageUrl),
    [attachments, content, quotedInlineImageUrl]
  );

  const displayAttachments = useMemo(
    () => getMessageDisplayAttachments(attachments, content),
    [attachments, content]
  );

  const agentReply = useMemo(() => {
    if (!isAgentReplyWithQuote(content)) return null;
    return parseAgentReplyContent(content, imageUrls);
  }, [content, imageUrls]);

  const parsed = useMemo(
    () => (agentReply ? null : parseEmailContent(content, imageUrls)),
    [content, imageUrls, agentReply]
  );

  const showToggle = collapsible && (
    agentReply?.hasMore ||
    parsed?.hasMore ||
    displayAttachments.length > 0 ||
    stripHtmlTags(content).length > 80
  );

  const preview = agentReply?.preview ?? parsed?.preview ?? "";
  const collapsedPreview = preview || "No message content";

  function renderExpandedContent() {
    if (agentReply) {
      return (
        <>
          {agentReply.replyBody ? (
            <EmailHtmlBlock html={sanitizeEmailHtml(agentReply.replyBody)} />
          ) : null}
          <EmailHtmlBlock html={sanitizeEmailHtml(agentReply.quotedContent)} />
          {agentReply.agentSignature ? (
            <EmailHtmlBlock html={sanitizeEmailHtml(agentReply.agentSignature)} isSignature />
          ) : null}
        </>
      );
    }

    if (!parsed) return null;

    const safeBody = sanitizeEmailHtml(parsed.body);
    const safeSignature = parsed.signature ? sanitizeEmailHtml(parsed.signature) : "";

    if (parsed.singleBlock) {
      return <EmailHtmlBlock html={safeBody} />;
    }

    return (
      <>
        {safeBody ? <EmailHtmlBlock html={safeBody} /> : null}
        {safeSignature ? <EmailHtmlBlock html={safeSignature} isSignature /> : null}
      </>
    );
  }

  if (!collapsible || !showToggle) {
    return (
      <div className="mt-2 space-y-3">
        {renderExpandedContent()}
        <ConversationAttachments attachments={displayAttachments} />
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
        aria-hidden={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="space-y-2 pb-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {renderExpandedContent()}
            <ConversationAttachments attachments={displayAttachments} />
          </div>
        </div>
      </div>

      {!expanded ? (
        <div className="space-y-2">
          <p className="text-[13px] leading-relaxed text-[#444]">{collapsedPreview}</p>
          {displayAttachments.length > 0 ? (
            <p className="text-[12px] font-medium text-[#888]">
              {displayAttachments.length} attachment{displayAttachments.length !== 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmailHtmlBlock({ html, isSignature }: { html: string; isSignature?: boolean }) {
  if (!html.trim()) return null;

  return (
    <div
      className={cn("email-html-content max-w-none", isSignature && "email-html-signature")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
