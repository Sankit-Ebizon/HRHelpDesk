"use client";

import { useCallback, useEffect, useState } from "react";
import { runFixedReportAction } from "@/lib/actions/reports";
import { downloadReportAsExcel } from "@/lib/reports/export";
import { getDefaultDateRange, REPORT_DEFINITIONS } from "@/lib/reports/types";
import type { ReportDateRange, ReportFilters, ReportResult, ReportType } from "@/lib/reports/types";
import { runWithLoading } from "@/lib/loading-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, Search } from "lucide-react";

interface FixedReportsProps {
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function buildFilters(
  contactName: string,
  contactEmail: string,
  ownerId: string,
  categoryId: string,
  departmentId: string
): ReportFilters | undefined {
  const filters: ReportFilters = {};
  if (contactName.trim()) filters.contact_name = contactName.trim();
  if (contactEmail.trim()) filters.contact_email = contactEmail.trim();
  if (ownerId) filters.owner_id = ownerId;
  if (categoryId) filters.category_id = categoryId;
  if (departmentId) filters.department_id = departmentId;
  return Object.keys(filters).length > 0 ? filters : undefined;
}

export function FixedReports({ agents, categories, departments }: FixedReportsProps) {
  const defaultRange = getDefaultDateRange();
  const [activeReport, setActiveReport] = useState<ReportType>("tickets-created");
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultRange.dateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(defaultRange.dateTo);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters | undefined>();
  const [results, setResults] = useState<Partial<Record<ReportType, ReportResult>>>({});
  const [loadingReport, setLoadingReport] = useState<ReportType | null>(null);

  const activeDefinition = REPORT_DEFINITIONS.find((report) => report.id === activeReport)!;

  const loadReport = useCallback(
    async (reportType: ReportType, showTable = true) => {
      setLoadingReport(reportType);
      const definition = REPORT_DEFINITIONS.find((report) => report.id === reportType)!;
      const dateRange: ReportDateRange | undefined = definition.usesDateRange
        ? { dateFrom: appliedDateFrom, dateTo: appliedDateTo }
        : undefined;

      const data = await runWithLoading(() =>
        runFixedReportAction(reportType, dateRange, appliedFilters)
      );
      if (showTable) {
        setResults((current) => ({ ...current, [reportType]: data }));
      }
      setLoadingReport(null);
      return data;
    },
    [appliedDateFrom, appliedDateTo, appliedFilters]
  );

  useEffect(() => {
    void loadReport(activeReport);
  }, [activeReport, appliedDateFrom, appliedDateTo, appliedFilters, loadReport]);

  function handleSearch() {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedFilters(buildFilters(contactName, contactEmail, ownerId, categoryId, departmentId));
  }

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
          View and download predefined reports. Date and ticket filters apply to matching reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="report-contact-name">Contact Name</Label>
            <Input
              id="report-contact-name"
              placeholder="Search by name..."
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-contact-email">Contact Email</Label>
            <Input
              id="report-contact-email"
              type="email"
              placeholder="Search by email..."
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select
              value={ownerId || "all"}
              onValueChange={(value) => setOwnerId(value === "all" ? "" : value)}
            >
              <SelectTrigger id="report-owner">
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId || "all"}
              onValueChange={(value) => setCategoryId(value === "all" ? "" : value)}
            >
              <SelectTrigger id="report-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={departmentId || "all"}
              onValueChange={(value) => setDepartmentId(value === "all" ? "" : value)}
            >
              <SelectTrigger id="report-department">
                <SelectValue placeholder="All Departments" />
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
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={handleSearch}
              disabled={loadingReport === activeReport}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
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
