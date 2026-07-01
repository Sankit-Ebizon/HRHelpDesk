"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTicketViewAction } from "@/lib/actions/ticket-views";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import type { SavedTicketView } from "@/types";

interface DeleteCustomViewButtonProps {
  view: SavedTicketView;
  onDeleted?: () => void;
}

export function DeleteCustomViewButton({ view, onDeleted }: DeleteCustomViewButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete custom view "${view.name}"?`)) return;
    setLoading(true);
    const result = await deleteTicketViewAction(view.id);
    setLoading(false);
    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }
    toast({ title: "View deleted", variant: "success" });
    onDeleted?.();
    router.push("/tickets?list=1");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-xs text-red-600"
      disabled={loading}
      onClick={() => void handleDelete()}
    >
      Delete
    </Button>
  );
}
