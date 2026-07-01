"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Ban,
  ChevronDown,
  CircleCheck,
  Copy,
  Forward,
  Mail,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Printer,
  Reply,
  ReplyAll,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTicketConversation } from "@/components/tickets/ticket-conversation-context";
import { deleteTicket } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { Ticket } from "@/types";

interface TicketHeaderActionsProps {
  ticket: Ticket;
  canDelete?: boolean;
  hasInternalComments?: boolean;
}

function HeaderIconButton({
  children,
  title,
  onClick,
  className,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[#ccc] bg-white text-[#444] transition-colors hover:bg-[#f5f7f9] hover:text-[#222]",
        className
      )}
    >
      {children}
    </button>
  );
}

function MenuShortcut({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto pl-6 text-[11px] text-[#999]">{children}</span>;
}

export function TicketHeaderActions({
  ticket,
  canDelete = false,
  hasInternalComments = false,
}: TicketHeaderActionsProps) {
  const router = useRouter();
  const { openComposer, getHeaderCallbacks } = useTicketConversation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    const result = await runWithLoading(() => deleteTicket(ticket.id));
    if (result.error) {
      setDeleteError(result.error);
      setDeleteLoading(false);
      return;
    }
    setDeleteOpen(false);
    setDeleteLoading(false);
    toast({ title: "Ticket deleted", variant: "success" });
    router.push("/tickets");
    router.refresh();
  }

  function handleComingSoon(label: string) {
    toast({ title: `${label} is not available yet` });
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="inline-flex overflow-hidden rounded-sm">
          <button
            type="button"
            className="zoho-btn-primary inline-flex h-8 items-center gap-1.5 rounded-none px-3"
            onClick={() => openComposer({ type: "replyAll" })}
          >
            <ReplyAll className="h-4 w-4" />
            Reply All
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="zoho-btn-primary inline-flex h-8 items-center rounded-none border-l border-white/25 px-1.5"
                aria-label="More reply options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-[10rem] rounded border border-border bg-white p-1 shadow-md"
              >
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                  onSelect={() => openComposer({ type: "replyAll" })}
                >
                  <ReplyAll className="h-4 w-4 text-[#555]" />
                  Reply All
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                  onSelect={() => openComposer({ type: "reply" })}
                >
                  <Reply className="h-4 w-4 text-[#555]" />
                  Reply
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                  onSelect={() => openComposer({ type: "forward" })}
                >
                  <Forward className="h-4 w-4 text-[#555]" />
                  Forward
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <HeaderIconButton title="Internal Comment" onClick={() => openComposer({ type: "internal" })}>
          <MessageSquarePlus className="h-4 w-4 text-[#1a73b5]" />
          {hasInternalComments ? (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#1a73b5]" />
          ) : null}
        </HeaderIconButton>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              title="More actions"
              aria-label="More actions"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[#ccc] bg-white text-[#444] transition-colors hover:bg-[#f5f7f9] hover:text-[#222]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[12.5rem] rounded border border-border bg-white p-1 shadow-md"
            >
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                onSelect={() => getHeaderCallbacks().onEdit?.()}
              >
                <Pencil className="h-4 w-4 text-[#555]" />
                Edit
                <MenuShortcut>E</MenuShortcut>
              </DropdownMenu.Item>
              {/* <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                onSelect={() => handleComingSoon("Follow")}
              >
                <CircleCheck className="h-4 w-4 text-[#555]" />
                Follow
                <MenuShortcut>Shift+W</MenuShortcut>
              </DropdownMenu.Item> */}
              {/* <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                onSelect={() => handleComingSoon("Mark as Unread")}
              >
                <Mail className="h-4 w-4 text-[#555]" />
                Mark as Unread
              </DropdownMenu.Item> */}
              {/* <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                onSelect={() => handleComingSoon("Mark Spam")}
              >
                <Ban className="h-4 w-4 text-[#555]" />
                Mark Spam
                <MenuShortcut>Shift+S</MenuShortcut>
              </DropdownMenu.Item> */}
              {canDelete ? (
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 text-[#555]" />
                  Delete
                </DropdownMenu.Item>
              ) : null}
              {/* <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                onSelect={() => handleComingSoon("Clone")}
              >
                <Copy className="h-4 w-4 text-[#555]" />
                Clone
              </DropdownMenu.Item> */}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <HeaderIconButton title="Print" onClick={() => getHeaderCallbacks().onPrint?.()}>
          <Printer className="h-4 w-4" />
        </HeaderIconButton>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete ticket</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete ticket <strong>{ticket.ticket_number}</strong>
            {ticket.subject ? (
              <>
                {" "}
                — <strong>{ticket.subject}</strong>
              </>
            ) : null}
            ? This will permanently remove all comments, attachments, and history.
          </p>
          {deleteError ? (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
