"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/tickets";
import { cn, formatRelative } from "@/lib/utils";
import type { Notification } from "@/types";

export function NotificationMenu({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  userId,
}: {
  notifications: Notification[];
  unreadCount: number;
  userId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  const handleMarkRead = (notificationId: string) => {
    const wasUnread = notifications.some((n) => n.id === notificationId && !n.is_read);
    if (!wasUnread) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    startTransition(async () => {
      await markNotificationRead(notificationId);
      router.refresh();
    });
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsRead(userId);
      router.refresh();
    });
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-9 w-9 items-center justify-center rounded-lg",
            "text-white/75 transition-colors hover:bg-white/10 hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
            open && "bg-white/10 text-white"
          )}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white ring-2 ring-[hsl(221,39%,18%)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[360px] overflow-hidden rounded-xl glass-panel shadow-elevated animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">No notifications</p>
                <p className="mt-1 text-2xs text-muted-foreground">
                  Ticket updates and alerts will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {notifications.map((notification) => {
                  const content = (
                    <>
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          notification.is_read
                            ? "bg-muted-foreground/30"
                            : "bg-indigo-400 shadow-glow"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              notification.is_read
                                ? "font-medium text-muted-foreground"
                                : "font-semibold text-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="shrink-0 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                          {formatRelative(notification.created_at)}
                        </p>
                      </div>
                    </>
                  );

                  const itemClassName = cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors",
                    notification.is_read ? "bg-transparent" : "bg-indigo-500/[0.04]",
                    "hover:bg-muted/60"
                  );

                  if (notification.ticket_id) {
                    return (
                      <DropdownMenu.Item key={notification.id} asChild>
                        <Link
                          href={`/tickets/${notification.ticket_id}`}
                          className={itemClassName}
                          onClick={() => {
                            handleMarkRead(notification.id);
                            setOpen(false);
                          }}
                        >
                          {content}
                        </Link>
                      </DropdownMenu.Item>
                    );
                  }

                  return (
                    <DropdownMenu.Item
                      key={notification.id}
                      className={cn(itemClassName, "cursor-default")}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleMarkRead(notification.id);
                      }}
                    >
                      {content}
                    </DropdownMenu.Item>
                  );
                })}
              </div>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
