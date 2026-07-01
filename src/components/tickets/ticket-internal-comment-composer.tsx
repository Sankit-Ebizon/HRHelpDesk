"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { addComment } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { getInitials, stripHtmlTags } from "@/lib/utils";
import type { Profile } from "@/types";

interface TicketInternalCommentComposerProps {
  ticketId: string;
  currentUser: Profile;
  onCancel: () => void;
  onSent: () => void;
}

export function TicketInternalCommentComposer({
  ticketId,
  currentUser,
  onCancel,
  onSent,
}: TicketInternalCommentComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!stripHtmlTags(content).trim()) return;

    setLoading(true);
    try {
      const result = await runWithLoading(() => addComment(ticketId, content, "internal"));
      if (!result?.error) {
        setContent("");
        onSent();
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 overflow-hidden rounded border border-[#f0e6b8] bg-[#fffbe6] shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5e6a8] text-[11px] font-bold text-[#8a6d00]">
          {getInitials(currentUser.full_name)}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <RichTextEditor
            placeholder="Add an internal comment..."
            value={content}
            onChange={setContent}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="zoho-btn-primary h-8 gap-1 px-3"
                onClick={handleSubmit}
                disabled={loading || !stripHtmlTags(content).trim()}
              >
                Comment
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
              <span className="inline-flex items-center gap-1 rounded bg-[#f5e6a8] px-2 py-0.5 text-[11px] font-medium text-[#8a6d00]">
                <Lock className="h-3 w-3" />
                Private
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-[#ddd] px-4 text-[13px] font-medium text-[#444] hover:bg-white/80"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
