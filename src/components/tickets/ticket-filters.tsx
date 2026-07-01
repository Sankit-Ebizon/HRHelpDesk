"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, type TicketFilters, type TicketView } from "@/types";
import type { TicketSearchParams } from "@/lib/ticket-url";
import { useState } from "react";

interface TicketFilterPanelProps {
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  currentFilters: Record<string, string | undefined>;
  ticketFilters?: TicketFilters;
  baseView?: TicketView;
  onClose?: () => void;
  onSaveAsView?: () => void;
}

export function countActiveFilters(currentFilters: Record<string, string | undefined>) {
  return Object.entries(currentFilters).filter(
    ([key, value]) => !["view", "custom_view", "list"].includes(key) && value
  ).length;
}

export function filtersToTicketFilters(currentFilters: TicketSearchParams): TicketFilters {
  return {
    status: currentFilters.status?.split(",") as never,
    owner_id: currentFilters.owner_id,
    category_id: currentFilters.category_id,
    department_id: currentFilters.department_id,
    priority: currentFilters.priority?.split(",") as never,
    search: currentFilters.search,
    date_from: currentFilters.date_from,
    date_to: currentFilters.date_to,
  };
}

export function TicketFilterPanel({
  agents,
  categories,
  departments = [],
  currentFilters,
  onClose,
  onSaveAsView,
}: TicketFilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentFilters.search || "");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/tickets?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", search);
  }

  function clearFilters() {
    const view = searchParams.get("view");
    router.push(view ? `/tickets?view=${view}` : "/tickets");
    setSearch("");
  }

  const hasFilters = countActiveFilters(currentFilters) > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Filters</p>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <form onSubmit={handleSearch} className="space-y-2">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            Search
          </Button>
        </form>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={currentFilters.status || "all"} onValueChange={(v) => updateFilter("status", v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Owner</Label>
          <Select value={currentFilters.owner_id || "all"} onValueChange={(v) => updateFilter("owner_id", v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={currentFilters.category_id || "all"} onValueChange={(v) => updateFilter("category_id", v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Department</Label>
          <Select
            value={currentFilters.department_id || "all"}
            onValueChange={(v) => updateFilter("department_id", v)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Select value={currentFilters.priority || "all"} onValueChange={(v) => updateFilter("priority", v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Created from</Label>
          <Input
            type="date"
            className="h-9"
            defaultValue={currentFilters.date_from}
            onChange={(e) => updateFilter("date_from", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Created to</Label>
          <Input
            type="date"
            className="h-9"
            defaultValue={currentFilters.date_to}
            onChange={(e) => updateFilter("date_to", e.target.value)}
          />
        </div>
      </div>

      {hasFilters && (
        <div className="space-y-2 border-t border-border p-4">
          {onSaveAsView && (
            <Button variant="default" size="sm" className="w-full" onClick={onSaveAsView}>
              Save as Custom View
            </Button>
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
            <X className="h-4 w-4" />
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
