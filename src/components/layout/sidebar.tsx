"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Contact,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserCheck,
  ChevronDown,
  Command,
  Search,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const SIDEBAR_WIDTH = 280;

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/ticket-owners", label: "Ticket Owners", icon: UserCheck },
  { href: "/users", label: "Users", icon: Users, roles: ["administrator", "hr_manager"] },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppSidebar({
  profile,
  unreadCount,
  openTicketCount,
}: {
  profile: Profile;
  unreadCount: number;
  openTicketCount: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  );

  return (
    <>
      <button
        className={cn(
          "lg:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center",
          "rounded-xl glass-card shadow-glass",
          "transition-all surface-hover active:scale-95"
        )}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        style={{ width: SIDEBAR_WIDTH }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col app-sidebar",
          "transition-transform duration-300 ease-spring lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Command className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">HR Helpdesk</p>
            <p className="truncate text-2xs text-muted-foreground">Ebizon Digital</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Workspace
          </p>
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  "transition-all duration-200",
                  active
                    ? "nav-item-active glow-active font-medium"
                    : "text-muted-foreground surface-hover hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full gradient-primary shadow-glow" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-primary dark:text-indigo-400" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {item.href === "/tickets" && openTicketCount > 0 && (
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-2xs font-bold text-primary ring-1 ring-primary/20 dark:bg-indigo-500/30 dark:text-indigo-200 dark:ring-indigo-500/30"
                    title={`${openTicketCount} open ticket${openTicketCount === 1 ? "" : "s"}`}
                  >
                    {openTicketCount > 9 ? "9+" : openTicketCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function ProfileMenu({
  profile,
  variant = "header",
}: {
  profile: Profile;
  variant?: "header" | "sidebar";
}) {
  const logoutFormId = useId();

  if (variant === "sidebar") {
    return (
      <>
        <form id={logoutFormId} action={signOut} className="hidden" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors surface-hover"
            >
              <Avatar className="h-9 w-9 ring-2 ring-indigo-500/20">
                <AvatarFallback className="gradient-primary text-white text-2xs">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{profile.full_name}</p>
                <p className="truncate text-2xs capitalize text-muted-foreground">
                  {profile.role.replace("_", " ")}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              side="top"
              sideOffset={8}
              className="z-50 min-w-[220px] rounded-xl glass-panel p-1.5 shadow-elevated animate-in fade-in-0 zoom-in-95"
            >
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors surface-hover"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px subtle-divider" />
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  (document.getElementById(logoutFormId) as HTMLFormElement | null)?.requestSubmit();
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 outline-none transition-colors hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </>
    );
  }

  return (
    <>
      <form id={logoutFormId} action={signOut} className="hidden" />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2.5 rounded-xl px-2 py-1.5",
              "border border-border bg-card/80 backdrop-blur-sm",
              "transition-all duration-200 surface-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
            aria-label="Open profile menu"
          >
            <Avatar className="h-7 w-7 ring-2 ring-indigo-500/25">
              <AvatarFallback className="text-2xs gradient-primary text-white">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium truncate max-w-[120px]">{profile.full_name}</span>
              <span className="text-2xs text-muted-foreground truncate max-w-[120px] capitalize">
                {profile.role.replace("_", " ")}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[220px] rounded-xl glass-panel p-1.5 shadow-elevated animate-in fade-in-0 zoom-in-95"
          >
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold leading-none">{profile.full_name}</p>
              <p className="text-2xs text-muted-foreground mt-1 capitalize">
                {profile.role.replace("_", " ")}
              </p>
            </div>
            <DropdownMenu.Separator className="my-1 h-px subtle-divider" />
            <DropdownMenu.Item asChild>
              <Link
                href="/settings"
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors surface-hover"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px subtle-divider" />
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                (document.getElementById(logoutFormId) as HTMLFormElement | null)?.requestSubmit();
              }}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 outline-none transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}

export function AppHeader({
  title,
  profile,
  children,
}: {
  title: string;
  profile?: Profile;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 app-header px-4 sm:px-6 lg:px-8"
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {children}
        <ThemeToggle />
        {profile && <ProfileMenu profile={profile} variant="header" />}
      </div>
    </header>
  );
}

export const sidebarWidth = 280;
