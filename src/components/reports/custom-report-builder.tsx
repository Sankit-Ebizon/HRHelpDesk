"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { runCustomReportAction } from "@/lib/actions/reports";
import { getAvailableFields, REPORT_MODULES } from "@/lib/reports/catalog";
import { downloadReportAsExcel } from "@/lib/reports/export";
import type { CustomReportConfig, ReportFilters, ReportResult } from "@/lib/reports/types";
import { runWithLoading } from "@/lib/loading-store";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Download, Play } from "lucide-react";
import { ScheduleReportDialog } from "@/components/reports/schedule-report-dialog";
import type { RecipientOption } from "@/components/reports/recipient-email-multi-select";

interface CustomReportBuilderProps {
  dateFrom: string;
  dateTo: string;
  filters?: ReportFilters;
  canSchedule?: boolean;
  recipientOptions?: RecipientOption[];
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function CustomReportBuilder({
  dateFrom,
  dateTo,
  filters,
  canSchedule = false,
  recipientOptions = [],
}: CustomReportBuilderProps) {
  const ROWS_PER_PAGE = 10;
  const [reportName, setReportName] = useState("Custom Report");
  const [moduleId, setModuleId] = useState(REPORT_MODULES[0].id);
  const [joinId, setJoinId] = useState<string>("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const activeModule = REPORT_MODULES.find((module) => module.id === moduleId)!;
  const availableFields = useMemo(
    () => getAvailableFields(moduleId, joinId || undefined),
    [moduleId, joinId]
  );
  const normalizedFieldSearch = fieldSearch.trim().toLowerCase();
  const unselectedFields = availableFields.filter((field) => {
    if (selectedFields.includes(field.key)) return false;
    if (!normalizedFieldSearch) return true;
    return field.label.toLowerCase().includes(normalizedFieldSearch);
  });

  useEffect(() => {
    setSelectedFields([]);
    setJoinId("");
    setResult(null);
    setFieldSearch("");
  }, [moduleId]);

  useEffect(() => {
    setSelectedFields((current) =>
      current.filter((key) => availableFields.some((field) => field.key === key))
    );
  }, [availableFields]);

  const addField = (fieldKey: string) => {
    if (!selectedFields.includes(fieldKey)) {
      setSelectedFields((current) => [...current, fieldKey]);
    }
  };

  const removeField = (fieldKey: string) => {
    setSelectedFields((current) => current.filter((key) => key !== fieldKey));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setSelectedFields((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const runReport = useCallback(async (): Promise<ReportResult | null> => {
    if (selectedFields.length === 0) return null;

    setLoading(true);
    try {
      const config: CustomReportConfig = {
        name: reportName.trim() || "Custom Report",
        moduleId,
        joinId: joinId || undefined,
        fields: selectedFields,
        dateFrom,
        dateTo,
        filters: moduleId === "tickets" ? filters : undefined,
      };

      const data = await runWithLoading(() => runCustomReportAction(config));
      setResult(data);
      setCurrentPage(1);
      return data;
    } finally {
      setLoading(false);
    }
  }, [reportName, moduleId, joinId, selectedFields, dateFrom, dateTo, filters]);

  async function handleDownload() {
    const data = result ?? (await runReport());
    if (data) {
      downloadReportAsExcel(reportName, data);
    }
  }

  const customConfig: CustomReportConfig | undefined =
    selectedFields.length > 0
      ? {
          name: reportName.trim() || "Custom Report",
          moduleId,
          joinId: joinId || undefined,
          fields: selectedFields,
          dateFrom,
          dateTo,
          filters: moduleId === "tickets" ? filters : undefined,
        }
      : undefined;
  const totalRows = result?.rows.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedRows = result?.rows.slice(startIndex, endIndex) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/20 px-4 py-3">
        <p className="text-sm font-medium text-foreground">Build your report in 3 steps</p>
        <p className="text-xs text-muted-foreground">
          1) Choose source, 2) choose columns, 3) run and export.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="custom-report-name">Step 1: Report Name</Label>
          <Input
            id="custom-report-name"
            value={reportName}
            onChange={(event) => setReportName(event.target.value)}
            placeholder="My custom report"
          />
        </div>
        <div className="space-y-2">
          <Label>Step 1: Data Source</Label>
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_MODULES.map((module) => (
                <SelectItem key={module.id} value={module.id}>
                  {module.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{activeModule.description}</p>
        </div>
        <div className="space-y-2">
          <Label>Step 1: Related Data (Optional)</Label>
          <Select
            value={joinId || "none"}
            onValueChange={(value) => setJoinId(value === "none" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No join" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {activeModule.joins.map((join) => (
                <SelectItem key={join.id} value={join.id}>
                  {join.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Add extra fields from another table if needed.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Step 2: Available Columns</h3>
            <Input
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              placeholder="Search columns..."
              className="h-8 max-w-[180px]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {unselectedFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {normalizedFieldSearch ? "No matching columns found." : "All columns have been added."}
              </p>
            ) : (
              unselectedFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => addField(field.key)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span>{field.label}</span>
                  <span className="text-xs text-muted-foreground">Add</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Step 2: Selected Columns ({selectedFields.length})</h3>
            {selectedFields.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFields([])}>
                Clear all
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: top-to-bottom order here is the column order in the report.
          </p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {selectedFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add at least one field to run the report.</p>
            ) : (
              selectedFields.map((fieldKey, index) => {
                const field = availableFields.find((entry) => entry.key === fieldKey);
                return (
                  <div
                    key={fieldKey}
                    className="flex items-center gap-2 rounded-md border px-2 py-2 text-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ChevronLeft className="h-3 w-3 rotate-90" />
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveField(index, 1)}
                        disabled={index === selectedFields.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronRight className="h-3 w-3 rotate-90" />
                      </button>
                    </div>
                    <span className="flex-1">{field?.label ?? fieldKey}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(fieldKey)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Label className="w-full text-xs text-muted-foreground">Step 3: Generate Output</Label>
        <Button onClick={() => void runReport()} disabled={loading || selectedFields.length === 0}>
          <Play className="h-4 w-4 mr-2" />
          Preview Report
        </Button>
        <Button
          variant="secondary"
          onClick={() => void handleDownload()}
          disabled={loading || selectedFields.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </Button>
        {canSchedule && customConfig && (
          <ScheduleReportDialog
            reportName={customConfig.name}
            reportKind="custom"
            customConfig={customConfig}
            filters={filters}
            usesDateRange
            recipientOptions={recipientOptions}
          />
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Running report...</p>
      ) : result && result.rows.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {result.columns.map((column) => (
                  <TableHead key={column.key} className="px-2 py-1 text-[11px] font-semibold leading-tight">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, index) => (
                <TableRow key={index}>
                  {result.columns.map((column) => (
                    <TableCell key={column.key} className="px-2 py-1 text-[12px] leading-tight">
                      {formatCellValue(row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {startIndex + 1}-{Math.min(endIndex, totalRows)} of {totalRows}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <span>
                Page {safePage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : result ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No data found for this report configuration.
        </p>
      ) : null}
    </div>
  );
}
