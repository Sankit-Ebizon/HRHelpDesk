"use client";

import { useCallback, useEffect, useState } from "react";
import { runFixedReportAction } from "@/lib/actions/reports";
import { downloadReportAsExcel } from "@/lib/reports/export";
import { getDefaultDateRange, REPORT_DEFINITIONS } from "@/lib/reports/types";
import type { ReportDateRange, ReportResult, ReportType } from "@/lib/reports/types";
import { runWithLoading } from "@/lib/loading-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, RefreshCw } from "lucide-react";

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function FixedReports() {
  const defaultRange = getDefaultDateRange();
  const [activeReport, setActiveReport] = useState<ReportType>("tickets-created");
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [results, setResults] = useState<Partial<Record<ReportType, ReportResult>>>({});
  const [loadingReport, setLoadingReport] = useState<ReportType | null>(null);

  const activeDefinition = REPORT_DEFINITIONS.find((report) => report.id === activeReport)!;

  const loadReport = useCallback(
    async (reportType: ReportType, showTable = true) => {
      setLoadingReport(reportType);
      const definition = REPORT_DEFINITIONS.find((report) => report.id === reportType)!;
      const dateRange: ReportDateRange | undefined = definition.usesDateRange
        ? { dateFrom, dateTo }
        : undefined;

      const data = await runWithLoading(() => runFixedReportAction(reportType, dateRange));
      if (showTable) {
        setResults((current) => ({ ...current, [reportType]: data }));
      }
      setLoadingReport(null);
      return data;
    },
    [dateFrom, dateTo]
  );

  useEffect(() => {
    void loadReport(activeReport);
  }, [activeReport, loadReport]);

  async function handleView(reportType: ReportType) {
    setActiveReport(reportType);
    await loadReport(reportType);
  }

  async function handleDownload(reportType: ReportType) {
    const definition = REPORT_DEFINITIONS.find((report) => report.id === reportType)!;
    const existing = results[reportType];
    const data = existing ?? (await loadReport(reportType, false));
    downloadReportAsExcel(definition.label, data);
    if (!existing) {
      setResults((current) => ({ ...current, [reportType]: data }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reports</CardTitle>
        <CardDescription>
          View and download predefined reports. Date filters apply to time-based reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="report-date-from">From</Label>
            <Input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              disabled={!activeDefinition.usesDateRange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-date-to">To</Label>
            <Input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              disabled={!activeDefinition.usesDateRange}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => loadReport(activeReport)}
              disabled={loadingReport === activeReport}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Report
            </Button>
          </div>
        </div>

        {!activeDefinition.usesDateRange && (
          <p className="text-sm text-muted-foreground">
            {activeDefinition.label} shows a current snapshot and does not use the date filter.
          </p>
        )}

        <Tabs value={activeReport} onValueChange={(value) => setActiveReport(value as ReportType)}>
          <TabsList className="h-auto flex-wrap justify-start">
            {REPORT_DEFINITIONS.map((report) => (
              <TabsTrigger key={report.id} value={report.id}>
                {report.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {REPORT_DEFINITIONS.map((report) => {
            const result = results[report.id];
            const isLoading = loadingReport === report.id;

            return (
              <TabsContent key={report.id} value={report.id} className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-medium">{report.label}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleView(report.id)}
                      disabled={isLoading}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button onClick={() => handleDownload(report.id)} disabled={isLoading}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Excel
                    </Button>
                  </div>
                </div>

                {result?.summary && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(result.summary).map(([key, value]) => (
                      <div key={key} className="rounded-lg border bg-muted/30 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-2xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading report...</p>
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
                    No data found for this report.
                  </p>
                ) : null}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
