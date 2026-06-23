"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTicket } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

interface DeleteTicketButtonProps {
  ticketId: string;
  ticketNumber: string;
  subject?: string;
  variant?: "icon" | "button";
  redirectTo?: string;
}

export function DeleteTicketButton({
  ticketId,
  ticketNumber,
  subject,
  variant = "icon",
  redirectTo = "/tickets",
}: DeleteTicketButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await runWithLoading(() => deleteTicket(ticketId));
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      toast({ title: "Ticket deleted", variant: "success" });
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Delete ticket"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="zoho-btn-danger h-8 px-3 shadow-none"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete ticket</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete ticket <strong>{ticketNumber}</strong>
            {subject ? (
              <>
                {" "}
                — <strong>{subject}</strong>
              </>
            ) : null}
            ? This will permanently remove all comments, attachments, and history.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
