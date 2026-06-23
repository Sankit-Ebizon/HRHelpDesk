"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { GripVertical, Plus, Tag, Trash2, User } from "lucide-react";
import { toggleSubcategoryStatus, deleteSubcategory } from "@/lib/actions/settings";
import { runWithLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";
import { SubcategorySlidePanel } from "@/components/settings/subcategory-slide-panel";
import { SettingsDeleteDialog } from "@/components/settings/settings-delete-dialog";
import { cn, getInitials } from "@/lib/utils";
import type { Subcategory } from "@/types";

interface CategoryOption {
  id: string;
  name: string;
}

type StatusTab = "active" | "inactive";

interface SubcategoriesViewProps {
  subcategories: Subcategory[];
  categories: CategoryOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function ZohoToggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 rounded-full transition-colors",
        checked ? "bg-[#3dcc7e]" : "bg-zinc-300",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[17px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

function getTicketCount(subcategory: Subcategory) {
  return subcategory.tickets?.[0]?.count ?? 0;
}

function SubcategoryAvatar({ subcategory }: { subcategory: Subcategory }) {
  if (subcategory.image_url) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
        <Image
          src={subcategory.image_url}
          alt={`${subcategory.name} image`}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200">
      {getInitials(subcategory.name)}
    </div>
  );
}

function SubcategoryListRow({
  subcategory,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  subcategory: Subcategory;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  toggling: boolean;
}) {
  const ticketCount = getTicketCount(subcategory);

  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4 last:border-0 hover:bg-zinc-50/60">
      <button
        type="button"
        className="cursor-grab text-zinc-300 hover:text-zinc-400"
        aria-label="Reorder sub-category"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={canEdit ? onEdit : undefined}
        disabled={!canEdit}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-3 text-left",
          canEdit && "cursor-pointer"
        )}
      >
        <SubcategoryAvatar subcategory={subcategory} />

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-zinc-900">{subcategory.name}</p>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            {subcategory.description || "No description"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-400">
            <span>
              Tickets{" "}
              <span className="font-medium text-zinc-600">{ticketCount}</span>
            </span>
            {subcategory.category && (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span className="text-zinc-600">{subcategory.category.name}</span>
              </span>
            )}
            {subcategory.created_by_profile && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="text-zinc-600">
                  {subcategory.created_by_profile.full_name}
                </span>
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${subcategory.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <ZohoToggle
          checked={subcategory.is_active}
          onChange={onToggle}
          disabled={!canEdit || toggling}
          id={`subcategory-toggle-${subcategory.id}`}
        />
      </div>
    </div>
  );
}

export function SubcategoriesView({
  subcategories,
  categories,
  canCreate,
  canEdit,
  canDelete,
}: SubcategoriesViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<StatusTab>("active");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () =>
      subcategories.filter((s) => (tab === "active" ? s.is_active : !s.is_active)),
    [subcategories, tab]
  );

  function openAddPanel() {
    setEditingSubcategory(null);
    setPanelOpen(true);
  }

  function openEditPanel(subcategory: Subcategory) {
    setEditingSubcategory(subcategory);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingSubcategory(null);
  }

  async function handleToggle(subcategory: Subcategory, active: boolean) {
    setTogglingId(subcategory.id);
    const result = await runWithLoading(() =>
      toggleSubcategoryStatus(subcategory.id, active)
    );
    if (result.error) {
      toast({ title: result.error, variant: "error" });
    } else {
      toast({
        title: active ? "Sub-category activated" : "Sub-category deactivated",
        variant: "success",
      });
      router.refresh();
    }
    setTogglingId(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await runWithLoading(() => deleteSubcategory(deleteTarget.id));
    if (result.error) {
      toast({ title: result.error, variant: "error" });
      setDeleting(false);
      return;
    }
    toast({ title: "Sub-category deleted", variant: "success" });
    setDeleting(false);
    setDeleteTarget(null);
    if (editingSubcategory?.id === deleteTarget.id) closePanel();
    router.refresh();
  }

  return (
    <div className="relative min-h-full bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-[15px] font-medium text-zinc-900">Sub-categories</h1>
        {canCreate && (
          <button
            type="button"
            onClick={openAddPanel}
            className="inline-flex h-8 items-center gap-1.5 rounded bg-[#1a73b5] px-3.5 text-[13px] font-medium text-white hover:bg-[#155a8a]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Sub-category
          </button>
        )}
      </div>

      <div className="flex gap-6 border-b border-zinc-200 px-6">
        {(["active", "inactive"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "relative pb-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
              tab === value
                ? "text-[#1a73b5]"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {value}
            {tab === value && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#1a73b5]" />
            )}
          </button>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="px-6 py-16 text-center text-[13px] text-zinc-500">
          Create a category first before adding sub-categories.{" "}
          <Link href="/settings/categories" className="text-[#1a73b5] hover:underline">
            Go to Categories
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-16 text-center text-[13px] text-zinc-500">
          {tab === "active" ? (
            <>
              No active sub-categories.{" "}
              {canCreate && (
                <button
                  type="button"
                  onClick={openAddPanel}
                  className="text-[#1a73b5] hover:underline"
                >
                  Create one
                </button>
              )}
            </>
          ) : (
            "No inactive sub-categories."
          )}
        </div>
      ) : (
        <div>
          {filtered.map((sub) => (
            <SubcategoryListRow
              key={sub.id}
              subcategory={sub}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => openEditPanel(sub)}
              onDelete={() => setDeleteTarget(sub)}
              onToggle={(active) => handleToggle(sub, active)}
              toggling={togglingId === sub.id}
            />
          ))}
        </div>
      )}

      <SubcategorySlidePanel
        open={panelOpen}
        subcategory={editingSubcategory}
        categories={categories}
        canDelete={canDelete}
        onDelete={(sub) => setDeleteTarget(sub)}
        onClose={closePanel}
      />

      <SettingsDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete sub-category"
        description={
          <>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            This cannot be undone.
          </>
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
