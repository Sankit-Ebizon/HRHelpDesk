"use client";

import Link from "next/link";
import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TICKET_VIEWS, type TicketView } from "@/types";
import { TicketFilterPanel, countActiveFilters } from "@/components/tickets/ticket-filters";

interface TicketViewsSidebarProps {
  view: TicketView;
  viewCounts: Record<TicketView, number>;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  currentFilters: Record<string, string | undefined>;
}

export function TicketViewsSidebar({
  view,
  viewCounts,
  agents,
  categories,
  currentFilters,
}: TicketViewsSidebarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = countActiveFilters(currentFilters);

  return (
    <aside className="relative hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Views
        </p>
        <Button
          variant={filterOpen ? "secondary" : "ghost"}
          size="icon"
          className="relative h-8 w-8"
          onClick={() => setFilterOpen((open) => !open)}
          aria-label={filterOpen ? "Close filters" : "Open filters"}
          aria-expanded={filterOpen}
        >
          <Filter className="h-4 w-4" />
          {!filterOpen && activeFilterCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount > 9 ? "9+" : activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-5 pb-5">
        {TICKET_VIEWS.map((v) => (
          <Link
            key={v.id}
            href={`/tickets?view=${v.id}`}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
              view === v.id
                ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/20"
                : "text-muted-foreground surface-hover hover:text-foreground"
            )}
          >
            <span>{v.label}</span>
            <span
              className={cn(
                "text-2xs font-semibold tabular-nums rounded-lg px-2 py-0.5",
                view === v.id
                  ? "bg-primary/15 text-primary dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {viewCounts[v.id]}
            </span>
          </Link>
        ))}
      </nav>

      {filterOpen && (
        <div className="absolute inset-0 z-10 flex flex-col bg-muted/30 backdrop-blur-sm animate-in fade-in-0 slide-in-from-left-2 duration-200">
          <TicketFilterPanel
            agents={agents}
            categories={categories}
            currentFilters={currentFilters}
            onClose={() => setFilterOpen(false)}
          />
        </div>
      )}
    </aside>
  );
}

export function TicketMobileFilterButton({
  agents,
  categories,
  currentFilters,
}: Omit<TicketViewsSidebarProps, "view" | "viewCounts">) {
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = countActiveFilters(currentFilters);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative md:hidden"
        onClick={() => setFilterOpen(true)}
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-bold text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background shadow-elevated md:hidden animate-in slide-in-from-left duration-200">
            <TicketFilterPanel
              agents={agents}
              categories={categories}
              currentFilters={currentFilters}
              onClose={() => setFilterOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
