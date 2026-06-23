"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard,
  Ticket,
  Contact,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserCheck,
  Command,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { useId, useState } from "react";
import { usePathname } from "next/navigation";

export const topNavHeight = 48;

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/ticket-owners", label: "Ticket Owners", icon: UserCheck },
  // { href: "/users", label: "Users", icon: Users, roles: ["administrator", "hr_manager"] },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

function TopNavIconButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "text-white/75 transition-colors hover:bg-white/10 hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function ProfileMenu({ profile }: { profile: Profile }) {
  const logoutFormId = useId();

  return (
    <>
      <form id={logoutFormId} action={signOut} className="hidden" />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={cn(
              "relative inline-flex items-center rounded-full",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            )}
            aria-label="Open profile menu"
          >
            <Avatar className="h-8 w-8 ring-2 ring-white/20">
              <AvatarFallback className="bg-indigo-500 text-2xs text-white">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[hsl(221,39%,18%)] bg-emerald-400" />
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
              <p className="mt-1 text-2xs capitalize text-muted-foreground">
                {profile.role.replace("_", " ")}
              </p>
            </div>
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

export function AppTopNav({
  profile,
  openTicketCount,
  showSettings = false,
}: {
  profile: Profile;
  unreadCount?: number;
  openTicketCount: number;
  showSettings?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  );

  return (
    <>
      <header
        style={{ height: topNavHeight }}
        className="fixed inset-x-0 top-0 z-50 app-topnav"
      >
        <div className="flex h-full items-center gap-3 px-3 sm:px-4 lg:px-5">
          {/* Brand */}
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Command className="h-4 w-4 text-white" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight text-white sm:inline">
              HR Helpdesk
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-hidden lg:flex">
            {filteredNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative shrink-0 px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  {item.label}
                  {item.href === "/tickets" && openTicketCount > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold text-white">
                      {openTicketCount > 9 ? "9+" : openTicketCount}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1 lg:hidden" />

          {/* Right utilities */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <span className="mr-1 hidden text-xs text-white/60 xl:inline">
              Helpdesk Support
            </span>

            {showSettings && (
              <Link
                href="/settings"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                  "text-white/75 transition-colors hover:bg-white/10 hover:text-white",
                  (pathname === "/settings" || pathname.startsWith("/settings/")) &&
                    "bg-white/10 text-white"
                )}
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            )}

            <ProfileMenu profile={profile} />

            <TopNavIconButton
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </TopNavIconButton>
          </div>
        </div>
      </header>

      {/* Mobile navigation panel */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            style={{ top: topNavHeight }}
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="fixed inset-x-0 z-40 border-b border-white/10 bg-[hsl(221,39%,14%)] px-3 py-2 shadow-lg lg:hidden"
            style={{ top: topNavHeight }}
          >
            <div className="flex flex-col gap-0.5">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.href === "/tickets" && openTicketCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-2xs font-bold text-white">
                        {openTicketCount > 9 ? "9+" : openTicketCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </>
  );
}

/** @deprecated Use AppTopNav */
export const AppSidebar = AppTopNav;

/** @deprecated Use topNavHeight */
export const sidebarWidth = 0;

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
      style={{ top: topNavHeight }}
      className={cn(
        "sticky z-30 flex h-14 items-center justify-between gap-4 app-header px-4 sm:px-6 lg:px-8"
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">{children}</div>
    </header>
  );
}
