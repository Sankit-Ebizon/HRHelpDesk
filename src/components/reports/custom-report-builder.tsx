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

interface CustomReportBuilderProps {
  dateFrom: string;
  dateTo: string;
  filters?: ReportFilters;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function CustomReportBuilder({ dateFrom, dateTo, filters }: CustomReportBuilderProps) {
  const [reportName, setReportName] = useState("Custom Report");
  const [moduleId, setModuleId] = useState(REPORT_MODULES[0].id);
  const [joinId, setJoinId] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const activeModule = REPORT_MODULES.find((module) => module.id === moduleId)!;
  const availableFields = useMemo(
    () => getAvailableFields(moduleId, joinId || undefined),
    [moduleId, joinId]
  );
  const unselectedFields = availableFields.filter((field) => !selectedFields.includes(field.key));

  useEffect(() => {
    setSelectedFields([]);
    setJoinId("");
    setResult(null);
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
    setLoading(false);
    return data;
  }, [reportName, moduleId, joinId, selectedFields, dateFrom, dateTo, filters]);

  async function handleDownload() {
    const data = result ?? (await runReport());
    if (data) {
      downloadReportAsExcel(reportName, data);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="custom-report-name">Report Name</Label>
          <Input
            id="custom-report-name"
            value={reportName}
            onChange={(event) => setReportName(event.target.value)}
            placeholder="My custom report"
          />
        </div>
        <div className="space-y-2">
          <Label>Module</Label>
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
          <Label>Sub-module (Join)</Label>
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
            Join related data from another table into your report.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Available Fields</h3>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {unselectedFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">All fields have been added.</p>
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
          <h3 className="text-sm font-medium">Selected Fields ({selectedFields.length})</h3>
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
        <Button onClick={() => void runReport()} disabled={loading || selectedFields.length === 0}>
          <Play className="h-4 w-4 mr-2" />
          Run Report
        </Button>
        <Button
          variant="secondary"
          onClick={() => void handleDownload()}
          disabled={loading || selectedFields.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Running report...</p>
      ) : result && result.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {result.columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row, index) => (
                <TableRow key={index}>
                  {result.columns.map((column) => (
                    <TableCell key={column.key} className="text-sm">
                      {formatCellValue(row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : result ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No data found for this report configuration.
        </p>
      ) : null}
    </div>
  );
}
