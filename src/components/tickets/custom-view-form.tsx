"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createTicketViewAction, updateTicketViewAction } from "@/lib/actions/ticket-views";
import {
  createEmptyFilterRow,
  filtersToRows,
  rowsToFilters,
  TICKET_FILTER_FIELD_LABELS,
  TICKET_FILTER_OPERATORS,
  type TicketFilterField,
  type TicketFilterRow,
} from "@/lib/ticket-view-filters";
import { buildCustomViewUrl } from "@/lib/ticket-url";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_VIEW_VISIBILITY_LABELS,
  TICKET_VIEWS,
  type SavedTicketView,
  type TicketFilters,
  type TicketView,
  type TicketViewVisibility,
} from "@/types";

interface CustomViewFormProps {
  mode: "create" | "edit";
  view?: SavedTicketView;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  initialFilters?: TicketFilters;
  initialBaseView?: TicketView;
  cancelHref?: string;
}

export function CustomViewForm({
  mode,
  view,
  agents,
  categories,
  departments,
  initialFilters = {},
  initialBaseView = "all",
  cancelHref = "/tickets?list=1",
}: CustomViewFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(view?.name ?? "");
  const [baseView, setBaseView] = useState<TicketView>(view?.base_view ?? initialBaseView);
  const [visibility, setVisibility] = useState<TicketViewVisibility>(
    view?.visibility ?? "private"
  );
  const [rows, setRows] = useState<TicketFilterRow[]>(() =>
    filtersToRows(view?.filters ?? initialFilters)
  );

  const fieldOptions = useMemo(
    () => Object.entries(TICKET_FILTER_FIELD_LABELS) as [TicketFilterField, string][],
    []
  );

  function updateRow(id: string, patch: Partial<TicketFilterRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.field === "search") next.operator = "contains";
        if (patch.field && patch.field !== row.field) {
          next.value = "";
          next.operator = TICKET_FILTER_OPERATORS[patch.field][0]?.value ?? "is";
        }
        return next;
      })
    );
  }

  function addRow() {
    setRows((current) => [...current, createEmptyFilterRow()]);
  }

  function removeRow(id: string) {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
  }

  function renderValueInput(row: TicketFilterRow) {
    if (!row.field) {
      return <Input disabled placeholder="Select a field first" className="h-9" />;
    }

    if (row.field === "status") {
      return (
        <Select value={row.value} onValueChange={(value) => updateRow(row.id, { value })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (row.field === "priority") {
      return (
        <Select value={row.value} onValueChange={(value) => updateRow(row.id, { value })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (row.field === "owner_id") {
      return (
        <Select value={row.value} onValueChange={(value) => updateRow(row.id, { value })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (row.field === "department_id") {
      return (
        <Select value={row.value} onValueChange={(value) => updateRow(row.id, { value })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (row.field === "category_id") {
      return (
        <Select value={row.value} onValueChange={(value) => updateRow(row.id, { value })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (row.field === "date_from" || row.field === "date_to") {
      return (
        <Input
          type="date"
          className="h-9"
          value={row.value}
          onChange={(e) => updateRow(row.id, { value: e.target.value })}
        />
      );
    }

    return (
      <Input
        className="h-9"
        value={row.value}
        placeholder={row.field === "search" ? "Search text" : "Value"}
        onChange={(e) => updateRow(row.id, { value: e.target.value })}
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "View name is required", variant: "error" });
      return;
    }

    const filters = rowsToFilters(rows);
    const hasCriteria = Object.keys(filters).length > 0;
    if (!hasCriteria) {
      toast({ title: "Add at least one filter criterion", variant: "error" });
      return;
    }

    setLoading(true);
    const payload = {
      name: name.trim(),
      baseView,
      filters,
      visibility,
    };

    const result =
      mode === "edit" && view
        ? await updateTicketViewAction(view.id, payload)
        : await createTicketViewAction(payload);

    setLoading(false);

    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }

    toast({
      title: mode === "edit" ? "View updated" : "Custom view created",
      variant: "success",
    });

    if (mode === "create") {
      const created = result as { id?: string };
      if (created.id) {
        router.push(buildCustomViewUrl(created.id, baseView, filters));
        return;
      }
    }

    if (view) {
      router.push(buildCustomViewUrl(view.id, baseView, filters));
      return;
    }

    router.push("/tickets?list=1");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-var(--top-nav-height))] bg-[#f5f7f9]">
      <div className="border-b border-border bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#222]">
          {mode === "edit" ? "Edit Custom View" : "Create Custom View"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-4 px-6 py-6">
        <section className="rounded border border-border bg-white p-5 shadow-sm">
          <Label htmlFor="view-name" className="text-sm font-semibold text-[#222]">
            View Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="view-name"
            className="mt-3 h-10 max-w-xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter view name"
            required
          />
        </section>

        <section className="rounded border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#222]">
                Filter Criteria <span className="text-red-500">*</span>
              </h2>
              <p className="mt-1 text-xs text-[#666]">Define one or more conditions for this view.</p>
            </div>
            <div className="w-48">
              <Label className="text-xs text-[#666]">Base View</Label>
              <Select value={baseView} onValueChange={(value) => setBaseView(value as TicketView)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_VIEWS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => {
              const operators = row.field ? TICKET_FILTER_OPERATORS[row.field] : [{ value: "is", label: "is" }];
              return (
                <div key={row.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <span className="w-6 shrink-0 text-sm font-medium text-[#666]">{index + 1}</span>
                  <Select
                    value={row.field || undefined}
                    onValueChange={(value) =>
                      updateRow(row.id, { field: value as TicketFilterField })
                    }
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <SelectValue placeholder="-- Click to select --" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map(([field, label]) => (
                        <SelectItem key={field} value={field}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={row.operator}
                    onValueChange={(value) =>
                      updateRow(row.id, { operator: value as TicketFilterRow["operator"] })
                    }
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((operator) => (
                        <SelectItem key={operator.value} value={operator.value}>
                          {operator.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="min-w-0 flex-1">{renderValueInput(row)}</div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove filter row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  {index === rows.length - 1 && (
                    <Button
                      type="button"
                      size="icon"
                      className="zoho-btn-primary h-9 w-9 shrink-0"
                      onClick={addRow}
                      aria-label="Add filter row"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded border border-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#222]">View&apos;s Permission</h2>
          <div className="mt-4 max-w-xs">
            <Label className="text-xs text-[#666]">Visible To</Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as TicketViewVisibility)}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TICKET_VIEW_VISIBILITY_LABELS) as TicketViewVisibility[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TICKET_VIEW_VISIBILITY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="flex items-center gap-3 border-t border-border bg-[#f5f7f9] pt-2">
          <Button type="submit" className="zoho-btn-primary min-w-24" disabled={loading}>
            {loading ? "Saving..." : mode === "edit" ? "Save" : "Create"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
