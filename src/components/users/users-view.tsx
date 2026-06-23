"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Ban,
  Info,
  LayoutGrid,
  List,
  Pencil,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { deactivateUser, deleteUser } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { UserSlidePanel } from "@/components/users/user-slide-panel";
import { SettingsDeleteDialog } from "@/components/settings/settings-delete-dialog";
import { cn, getInitials } from "@/lib/utils";
import {
  getRoleLabel,
  USER_STATUS_LABELS,
  type Profile,
  type RoleDefinition,
  type UserStatus,
} from "@/types";

interface Department {
  id: string;
  name: string;
}

type StatusTab = "all" | "active" | "invited" | "deactivated";
type ViewMode = "list" | "grid";

interface UsersViewProps {
  users: Profile[];
  departments: Department[];
  roles: RoleDefinition[];
  roleLabels: Record<string, string>;
  canInvite: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function matchesTab(user: Profile, tab: StatusTab) {
  if (tab === "all") return true;
  if (tab === "active") return user.status === "active";
  if (tab === "invited") return user.status === "invited";
  return user.status === "inactive" || user.status === "rejected";
}

function UserListAvatar({ user }: { user: Profile }) {
  if (user.avatar_url) {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-100">
        <Image
          src={user.avatar_url}
          alt={`${user.full_name} avatar`}
          fill
          className="object-cover"
          sizes="36px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[13px] font-medium text-zinc-500">
      {getInitials(user.full_name).charAt(0)}
    </div>
  );
}

function UserGridAvatar({ user }: { user: Profile }) {
  if (user.avatar_url) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
        <Image
          src={user.avatar_url}
          alt={`${user.full_name} avatar`}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef6fc] text-[13px] font-semibold text-[#1a73b5] ring-1 ring-zinc-200">
      {getInitials(user.full_name)}
    </div>
  );
}

function StatusBadge({ status, compact }: { status: UserStatus; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium leading-none",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        status === "active" && "bg-[#e6f4ea] text-[#137333]",
        status === "invited" && "bg-amber-50 text-amber-700",
        status === "rejected" && "bg-red-50 text-red-700",
        status === "inactive" && "bg-zinc-100 text-zinc-600"
      )}
    >
      {USER_STATUS_LABELS[status]}
    </span>
  );
}

function UserHoverActions({
  user,
  canEdit,
  canDelete,
  onEdit,
  onDeactivate,
  onDelete,
  className,
}: {
  user: Profile;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const showDeactivate = user.status === "active" || user.status === "invited";
  const hasActions = (canEdit && showDeactivate) || canEdit || canDelete;

  if (!hasActions) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        className
      )}
    >
      {canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          aria-label={`Edit ${user.full_name}`}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {canEdit && showDeactivate && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeactivate();
          }}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          aria-label={`Deactivate ${user.full_name}`}
          title="Deactivate"
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete ${user.full_name}`}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function UserListRow({
  user,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  user: Profile;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center border-b border-zinc-100 px-6 py-3.5 last:border-0 hover:bg-zinc-50/60">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <UserListAvatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-zinc-900">{user.full_name}</p>
            <StatusBadge status={user.status} compact />
          </div>
          <p className="mt-0.5 truncate text-[13px] text-zinc-500">{user.email}</p>
        </div>
      </button>
      <UserHoverActions
        user={user}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onDelete={onDelete}
      />
    </div>
  );
}

function UserGridCard({
  user,
  roleLabels,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  user: Profile;
  roleLabels: Record<string, string>;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex w-full flex-col rounded border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50/40">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <UserGridAvatar user={user} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-zinc-900">{user.full_name}</p>
            <p className="mt-0.5 truncate text-[12px] text-zinc-500">{user.email}</p>
          </div>
        </button>
        <UserHoverActions
          user={user}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onDelete={onDelete}
          className="self-start"
        />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 flex w-full items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-left"
      >
        <span className="truncate text-[12px] text-zinc-600">
          {getRoleLabel(user.role, roleLabels)}
        </span>
        <StatusBadge status={user.status} />
      </button>
    </div>
  );
}

export function UsersView({
  users,
  departments,
  roles,
  roleLabels,
  canInvite,
  canEdit,
  canDelete,
}: UsersViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [panelOpen, setPanelOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tabCounts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((u) => u.status === "active").length,
      invited: users.filter((u) => u.status === "invited").length,
      deactivated: users.filter(
        (u) => u.status === "inactive" || u.status === "rejected"
      ).length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      if (!matchesTab(user, tab)) return false;

      if (letter) {
        const first = user.full_name.trim().charAt(0).toUpperCase();
        if (first !== letter) return false;
      }

      if (!normalizedSearch) return true;

      return (
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [users, tab, search, letter]);

  function openInvitePanel() {
    setPanelOpen(true);
  }

  function openUserDetail(user: Profile) {
    router.push(`/users/${user.id}`);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  async function handleDeactivate(user: Profile) {
    const result = await runWithLoading(() => deactivateUser(user.id));
    if (result?.error) {
      toast({ title: result.error, variant: "error" });
    } else {
      toast({ title: `${user.full_name} deactivated`, variant: "success" });
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await runWithLoading(() => deleteUser(deleteTarget.id));
    if (result?.error) {
      toast({ title: result.error, variant: "error" });
      setDeleting(false);
      return;
    }
    toast({ title: "User deleted", variant: "success" });
    setDeleting(false);
    setDeleteTarget(null);
    router.refresh();
  }

  const tabs: { id: StatusTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "invited", label: "Invited" },
    { id: "deactivated", label: "Deactivated" },
  ];

  return (
    <div className="relative min-h-full bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4">
        <h1 className="text-[15px] font-medium text-zinc-900">
          HR Helpdesk{" "}
          <span className="font-normal text-zinc-500">: Users</span>
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="h-8 w-44 rounded border border-zinc-300 bg-white pl-8 pr-3 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-500 focus:border-[#1a73b5] focus:ring-1 focus:ring-[#1a73b5]/20 sm:w-52"
            />
          </div>

          {canInvite && (
            <button
              type="button"
              onClick={openInvitePanel}
              className="inline-flex h-8 items-center gap-1.5 rounded bg-[#1a73b5] px-3.5 text-[13px] font-medium text-white hover:bg-[#155a8a]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite Users
            </button>
          )}

          <div className="flex items-center rounded border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-8 w-8 items-center justify-center transition-colors",
                viewMode === "list"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-8 w-8 items-center justify-center border-l border-zinc-200 transition-colors",
                viewMode === "grid"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
            aria-label="About users"
            title="Manage HR helpdesk users, roles, and access status."
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-zinc-200 px-6 pt-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "relative -mb-px py-3 text-[11px] font-semibold uppercase tracking-wide transition-colors",
              tab === id ? "text-[#1a73b5]" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {label} ({tabCounts[id]})
            {tab === id && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1a73b5]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex">
        <div className="min-w-0 flex-1">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-[13px] text-zinc-500">
              No Users in the list.
              {canInvite && tab === "all" && !search && !letter && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={openInvitePanel}
                    className="text-[#1a73b5] hover:underline"
                  >
                    Invite a user
                  </button>
                </>
              )}
            </div>
          ) : viewMode === "list" ? (
            <div>
              {filtered.map((user) => (
                <UserListRow
                  key={user.id}
                  user={user}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onOpen={() => openUserDetail(user)}
                  onEdit={() => openUserDetail(user)}
                  onDeactivate={() => handleDeactivate(user)}
                  onDelete={() => setDeleteTarget(user)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 p-6">
              {filtered.map((user) => (
                <UserGridCard
                  key={user.id}
                  user={user}
                  roleLabels={roleLabels}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onOpen={() => openUserDetail(user)}
                  onEdit={() => openUserDetail(user)}
                  onDeactivate={() => handleDeactivate(user)}
                  onDelete={() => setDeleteTarget(user)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="hidden w-8 shrink-0 border-l border-zinc-100 py-4 lg:block">
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => setLetter(null)}
              className={cn(
                "px-1 text-[10px] font-medium leading-tight transition-colors",
                letter === null ? "text-[#1a73b5]" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              All
            </button>
            {ALPHABET.map((char) => {
              const hasUsers = users.some(
                (u) => u.full_name.trim().charAt(0).toUpperCase() === char
              );
              return (
                <button
                  key={char}
                  type="button"
                  disabled={!hasUsers}
                  onClick={() => setLetter(char)}
                  className={cn(
                    "px-1 text-[10px] leading-tight transition-colors",
                    letter === char
                      ? "font-semibold text-[#1a73b5]"
                      : hasUsers
                        ? "text-zinc-500 hover:text-zinc-700"
                        : "cursor-default text-zinc-200"
                  )}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <UserSlidePanel
        open={panelOpen}
        user={null}
        departments={departments}
        roles={roles}
        onClose={closePanel}
      />

      <SettingsDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user"
        description={
          <>
            Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This
            removes their account and cannot be undone.
          </>
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
