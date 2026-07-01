"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Loader2,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TICKET_VIEWS, type SavedTicketView, type TicketView } from "@/types";
import { buildCustomViewUrl, buildTicketViewListUrl, buildTicketsQuery, type TicketSearchParams } from "@/lib/ticket-url";
import { toggleSystemViewStarAction, toggleTicketViewStarAction } from "@/lib/actions/ticket-views";
import { resetGlobalLoading } from "@/lib/loading-store";
import { toast } from "@/lib/toast-store";

function formatViewCount(count: number): string {
  if (count >= 1000) {
    const value = count / 1000;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count).padStart(2, "0");
}

interface TicketViewsSidebarProps {
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  savedViews?: SavedTicketView[];
  starredSystemViews?: TicketView[];
  customViewCounts?: Record<string, number>;
  activeCustomView?: SavedTicketView | null;
  currentFilters: TicketSearchParams;
}

export function TicketViewsSidebar({
  view,
  viewCounts,
  savedViews = [],
  starredSystemViews = [],
  customViewCounts = {},
  activeCustomView,
  currentFilters,
}: TicketViewsSidebarProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [starredOpen, setStarredOpen] = useState(true);
  const [systemViewsOpen, setSystemViewsOpen] = useState(true);
  const [allViewsOpen, setAllViewsOpen] = useState(true);
  const [starLoadingKey, setStarLoadingKey] = useState<string | null>(null);

  const createViewHref = `/tickets/views/custom/new${buildTicketsQuery(currentFilters)}`;

  const starredCustom = useMemo(
    () => savedViews.filter((item) => item.is_starred),
    [savedViews]
  );
  const otherCustom = useMemo(
    () => savedViews.filter((item) => !item.is_starred),
    [savedViews]
  );

  const searchLower = search.toLowerCase();
  const filteredStarredCustom = starredCustom.filter((item) =>
    item.name.toLowerCase().includes(searchLower)
  );
  const filteredOtherCustom = otherCustom.filter((item) =>
    item.name.toLowerCase().includes(searchLower)
  );
  const starredSystemItems = TICKET_VIEWS.filter(
    (item) =>
      starredSystemViews.includes(item.id) &&
      item.label.toLowerCase().includes(searchLower)
  );
  const unstarredSystemItems = TICKET_VIEWS.filter(
    (item) =>
      !starredSystemViews.includes(item.id) &&
      item.label.toLowerCase().includes(searchLower)
  );

  async function handleToggleStar(savedView: SavedTicketView, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const loadingKey = `custom:${savedView.id}`;
    setStarLoadingKey(loadingKey);
    try {
      const result = await toggleTicketViewStarAction(savedView.id, !savedView.is_starred);
      if (result.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      router.refresh();
    } finally {
      setStarLoadingKey(null);
      resetGlobalLoading();
    }
  }

  async function handleToggleSystemStar(systemViewId: TicketView, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const loadingKey = `system:${systemViewId}`;
    setStarLoadingKey(loadingKey);
    try {
      const isStarred = starredSystemViews.includes(systemViewId);
      const result = await toggleSystemViewStarAction(systemViewId, !isStarred);
      if (result.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      router.refresh();
    } finally {
      setStarLoadingKey(null);
      resetGlobalLoading();
    }
  }

  function isSystemViewActive(systemViewId: TicketView) {
    return !activeCustomView && view === systemViewId;
  }

  function renderViewLink(options: {
    href: string;
    label: string;
    count: number;
    active: boolean;
    starred: boolean;
    starLoadingKey: string;
    onStarClick: (e: React.MouseEvent) => void;
  }) {
    const isStarLoading = starLoadingKey === options.starLoadingKey;

    return (
      <Link
        href={options.href}
        className={cn(
          "group flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition-colors",
          options.active
            ? "bg-[#3d4f63] text-[#7ec8ff]"
            : "text-[#c8d4e0] hover:bg-[#2f3d4f] hover:text-white"
        )}
        title={options.label}
      >
        <button
          type="button"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded p-0.5 opacity-70 hover:opacity-100 disabled:opacity-100"
          onClick={options.onStarClick}
          disabled={isStarLoading}
          aria-label={options.starred ? "Unstar view" : "Star view"}
        >
          {isStarLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7ec8ff]" />
          ) : (
            <Star
              className={cn(
                "h-3.5 w-3.5",
                options.starred ? "fill-amber-400 text-amber-400" : "text-[#8899aa]"
              )}
            />
          )}
        </button>
        <span className="min-w-0 flex-1 truncate">{options.label}</span>
        <span
          className={cn(
            "shrink-0 text-[11px] tabular-nums",
            options.active ? "text-[#7ec8ff]" : "text-[#8899aa]"
          )}
        >
          {formatViewCount(options.count)}
        </span>
      </Link>
    );
  }

  return (
    <aside className="flex h-full w-[210px] shrink-0 flex-col border-r border-[#1a2332] bg-[#232f3e] text-[#c8d4e0]">
      <div className="flex items-center justify-between gap-1 px-3 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Folder className="h-4 w-4 shrink-0 text-[#9eb0c3]" />
          <span className="truncate text-[13px] font-semibold text-white">Views</span>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-[#9eb0c3] hover:bg-[#2f3d4f] hover:text-white"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Search views"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <Link
            href={createViewHref}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-[#9eb0c3] hover:bg-[#2f3d4f] hover:text-white"
            aria-label="Create custom view"
            title="Create custom view"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="px-3 pb-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search views..."
            className="h-8 border-[#3d4f63] bg-[#1a2332] text-xs text-white placeholder:text-[#8899aa]"
            autoFocus
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <button
          type="button"
          className="mb-1 flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]"
          onClick={() => setStarredOpen((open) => !open)}
        >
          <span className="border-b border-[#8899aa] pb-0.5">Starred Views</span>
          {starredOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {starredOpen && (
          <div className="mb-3 space-y-0.5">
            {starredSystemItems.length === 0 && filteredStarredCustom.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-[#6b7c8f]">
                {search ? "No matching starred views" : "No starred views yet"}
              </p>
            ) : (
              <>
                {starredSystemItems.map((systemView) =>
                  renderViewLink({
                    href: buildTicketViewListUrl(systemView.id),
                    label: systemView.label,
                    count: viewCounts[systemView.id],
                    active: isSystemViewActive(systemView.id),
                    starred: true,
                    starLoadingKey: `system:${systemView.id}`,
                    onStarClick: (e) => void handleToggleSystemStar(systemView.id, e),
                  })
                )}
                {filteredStarredCustom.map((savedView) =>
                  renderViewLink({
                    href: buildCustomViewUrl(savedView.id, savedView.base_view, savedView.filters),
                    label: savedView.name,
                    count: customViewCounts[savedView.id] ?? 0,
                    active: activeCustomView?.id === savedView.id,
                    starred: true,
                    starLoadingKey: `custom:${savedView.id}`,
                    onStarClick: (e) => void handleToggleStar(savedView, e),
                  })
                )}
              </>
            )}
          </div>
        )}

        <button
          type="button"
          className="mb-1 flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]"
          onClick={() => setSystemViewsOpen((open) => !open)}
        >
          <span className="border-b border-[#8899aa] pb-0.5">System Views</span>
          {systemViewsOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {systemViewsOpen && (
          <div className="mb-3 space-y-0.5">
            {unstarredSystemItems.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-[#6b7c8f]">
                {search ? "No matching system views" : "All system views are starred"}
              </p>
            ) : (
              unstarredSystemItems.map((systemView) =>
                renderViewLink({
                  href: buildTicketViewListUrl(systemView.id),
                  label: systemView.label,
                  count: viewCounts[systemView.id],
                  active: isSystemViewActive(systemView.id),
                  starred: false,
                  starLoadingKey: `system:${systemView.id}`,
                  onStarClick: (e) => void handleToggleSystemStar(systemView.id, e),
                })
              )
            )}
          </div>
        )}

        <button
          type="button"
          className="mb-1 flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]"
          onClick={() => setAllViewsOpen((open) => !open)}
        >
          <span className="border-b border-[#8899aa] pb-0.5">All Views</span>
          {allViewsOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {allViewsOpen && (
          <div className="space-y-0.5">
            {savedViews.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-[#6b7c8f]">No custom views yet</p>
            ) : filteredOtherCustom.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-[#6b7c8f]">
                {search ? "No matching views" : "All custom views are starred"}
              </p>
            ) : (
              filteredOtherCustom.map((savedView) =>
                renderViewLink({
                  href: buildCustomViewUrl(savedView.id, savedView.base_view, savedView.filters),
                  label: savedView.name,
                  count: customViewCounts[savedView.id] ?? 0,
                  active: activeCustomView?.id === savedView.id,
                  starred: false,
                  starLoadingKey: `custom:${savedView.id}`,
                  onStarClick: (e) => void handleToggleStar(savedView, e),
                })
              )
            )}
          </div>
        )}

        <div className="mt-2 px-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start text-[12px] text-[#9eb0c3] hover:bg-[#2f3d4f] hover:text-white"
          >
            <Link href={createViewHref}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Custom View
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
