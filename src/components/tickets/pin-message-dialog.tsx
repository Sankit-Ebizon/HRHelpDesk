"use client";

import { useState } from "react";
import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pinTicketMessage, type PinVisibility } from "@/lib/actions/ticket-pins";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";

interface PinMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  messageKey: string;
  onPinned?: () => void;
}

export function PinMessageDialog({
  open,
  onOpenChange,
  ticketId,
  messageKey,
  onPinned,
}: PinMessageDialogProps) {
  const [visibility, setVisibility] = useState<PinVisibility>("all_agents");
  const [loading, setLoading] = useState(false);

  async function handlePin() {
    setLoading(true);
    try {
      const result = await runWithLoading(() =>
        pinTicketMessage(ticketId, messageKey, visibility)
      );
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      onPinned?.();
      onOpenChange(false);
      toast({ title: "Message pinned", variant: "success" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-[#1a73b5]" />
            Pin this message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex cursor-pointer items-start gap-3 rounded border border-[#e5e7eb] p-3 hover:bg-[#fafbfc]">
            <input
              type="radio"
              name="pin-visibility"
              checked={visibility === "all_agents"}
              onChange={() => setVisibility("all_agents")}
              className="mt-1"
            />
            <div>
              <p className="text-[13px] font-semibold text-[#222]">Pin visible for all agents</p>
              <p className="text-[12px] text-[#666]">Everyone working on this ticket can see the pin.</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded border border-[#e5e7eb] p-3 hover:bg-[#fafbfc]">
            <input
              type="radio"
              name="pin-visibility"
              checked={visibility === "only_me"}
              onChange={() => setVisibility("only_me")}
              className="mt-1"
            />
            <div>
              <p className="text-[13px] font-semibold text-[#222]">Pin visible only to me</p>
              <p className="text-[12px] text-[#666]">Only you will see this pinned message.</p>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button className="zoho-btn-primary" onClick={handlePin} disabled={loading}>
            Pin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
