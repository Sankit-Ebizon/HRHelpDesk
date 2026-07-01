"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Star } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TICKET_VIEWS, type SavedTicketView, type TicketView } from "@/types";
import {
  buildCustomViewUrl,
  buildTicketViewListUrl,
  buildTicketsQuery,
  type TicketSearchParams,
} from "@/lib/ticket-url";
import { toggleSystemViewStarAction, toggleTicketViewStarAction } from "@/lib/actions/ticket-views";
import { toast } from "@/lib/toast-store";

interface TicketViewsDropdownProps {
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  currentFilters: TicketSearchParams;
  savedViews?: SavedTicketView[];
  starredSystemViews?: TicketView[];
  activeCustomView?: SavedTicketView | null;
  listCount?: number;
  variant?: "panel" | "status-list";
}

export function TicketViewsDropdown({
  view,
  viewCounts,
  currentFilters,
  savedViews = [],
  starredSystemViews = [],
  activeCustomView,
  listCount,
  variant = "panel",
}: TicketViewsDropdownProps) {
  const router = useRouter();
  const [viewSearch, setViewSearch] = useState("");
  const createViewHref = `/tickets/views/custom/new${buildTicketsQuery(currentFilters)}`;

  const currentView = TICKET_VIEWS.find((item) => item.id === view) ?? TICKET_VIEWS[2];
  const currentLabel = activeCustomView?.name ?? currentView.label;

  const starredViews = useMemo(
    () => savedViews.filter((item) => item.is_starred),
    [savedViews]
  );
  const otherViews = useMemo(
    () => savedViews.filter((item) => !item.is_starred),
    [savedViews]
  );

  const searchLower = viewSearch.toLowerCase();
  const filteredStarred = starredViews.filter((item) =>
    item.name.toLowerCase().includes(searchLower)
  );
  const filteredCustom = otherViews.filter((item) =>
    item.name.toLowerCase().includes(searchLower)
  );
  const starredSystemItems = TICKET_VIEWS.filter(
    (item) =>
      starredSystemViews.includes(item.id) &&
      item.label.toLowerCase().includes(searchLower)
  );
  const filteredSystem = TICKET_VIEWS.filter(
    (item) =>
      !starredSystemViews.includes(item.id) &&
      item.label.toLowerCase().includes(searchLower)
  );

  const showHeaderStar =
    activeCustomView?.is_starred || (!activeCustomView && starredSystemViews.includes(view));

  async function handleToggleStar(savedView: SavedTicketView, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleTicketViewStarAction(savedView.id, !savedView.is_starred);
    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }
    router.refresh();
  }

  async function handleToggleSystemStar(systemViewId: TicketView, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const isStarred = starredSystemViews.includes(systemViewId);
    const result = await toggleSystemViewStarAction(systemViewId, !isStarred);
    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }
    router.refresh();
  }

  const triggerClassName =
    variant === "status-list"
      ? "flex min-w-0 items-center gap-1.5 text-left text-[15px] font-semibold text-[#222]"
      : "flex min-w-0 flex-1 items-center gap-1 text-left text-[13px] font-semibold text-[#222]";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={triggerClassName}>
          {showHeaderStar && (
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
          )}
          <span className="truncate">
            {currentLabel}
            {variant === "panel" && listCount !== undefined
              ? ` (${String(listCount).padStart(2, "0")})`
              : ""}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0",
              variant === "status-list" ? "text-[#555]" : "text-[#444]"
            )}
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 max-h-[min(24rem,70vh)] min-w-[16rem] overflow-y-auto rounded border border-border bg-white p-1 shadow-md"
        >
          <div className="px-2 py-1.5">
            <Input
              placeholder="Search views..."
              value={viewSearch}
              onChange={(e) => setViewSearch(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          {(starredSystemItems.length > 0 || filteredStarred.length > 0) && (
            <>
              <DropdownMenu.Label className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
                Starred Views
              </DropdownMenu.Label>
              {starredSystemItems.map((systemView) => (
                <DropdownMenu.Item key={systemView.id} asChild>
                  <Link
                    href={buildTicketViewListUrl(systemView.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]",
                      !activeCustomView && view === systemView.id && "bg-[#e8f2fc]"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      <span className="truncate">{systemView.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular-nums text-[#555]">{viewCounts[systemView.id]}</span>
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-white"
                        onClick={(e) => void handleToggleSystemStar(systemView.id, e)}
                        aria-label="Unstar view"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      </button>
                    </span>
                  </Link>
                </DropdownMenu.Item>
              ))}
              {filteredStarred.map((savedView) => (
                <DropdownMenu.Item key={savedView.id} asChild>
                  <Link
                    href={buildCustomViewUrl(savedView.id, savedView.base_view, savedView.filters)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]",
                      activeCustomView?.id === savedView.id && "bg-[#e8f2fc]"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      <span className="truncate">{savedView.name}</span>
                    </span>
                    <button
                      type="button"
                      className="ml-2 shrink-0 rounded p-0.5 hover:bg-white"
                      onClick={(e) => void handleToggleStar(savedView, e)}
                      aria-label="Unstar view"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </button>
                  </Link>
                </DropdownMenu.Item>
              ))}
            </>
          )}

          <DropdownMenu.Label className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
            System Views
          </DropdownMenu.Label>
          {filteredSystem.map((systemView) => (
            <DropdownMenu.Item key={systemView.id} asChild>
              <Link
                href={buildTicketViewListUrl(systemView.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]",
                  !activeCustomView && view === systemView.id && "bg-[#e8f2fc]"
                )}
              >
                <span className="truncate">{systemView.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-[#555]">{viewCounts[systemView.id]}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-white"
                    onClick={(e) => void handleToggleSystemStar(systemView.id, e)}
                    aria-label="Star view"
                  >
                    <Star className="h-3.5 w-3.5 text-[#bbb]" />
                  </button>
                </span>
              </Link>
            </DropdownMenu.Item>
          ))}

          {filteredCustom.length > 0 && (
            <>
              <DropdownMenu.Label className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
                Custom Views
              </DropdownMenu.Label>
              {filteredCustom.map((savedView) => (
                <DropdownMenu.Item key={savedView.id} asChild>
                  <Link
                    href={buildCustomViewUrl(savedView.id, savedView.base_view, savedView.filters)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] font-medium text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]",
                      activeCustomView?.id === savedView.id && "bg-[#e8f2fc]"
                    )}
                  >
                    <span className="truncate">{savedView.name}</span>
                    <button
                      type="button"
                      className="ml-2 shrink-0 rounded p-0.5 hover:bg-white"
                      onClick={(e) => void handleToggleStar(savedView, e)}
                      aria-label="Star view"
                    >
                      <Star className="h-3.5 w-3.5 text-[#bbb]" />
                    </button>
                  </Link>
                </DropdownMenu.Item>
              ))}
            </>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href={createViewHref}
              className="block cursor-pointer rounded px-2 py-1.5 text-[13px] font-semibold text-primary outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
            >
              + Add Custom View
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
