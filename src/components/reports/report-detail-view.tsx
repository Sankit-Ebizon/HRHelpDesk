"use client";

import { useCallback, useEffect, useState } from "react";
import { runFixedReportAction } from "@/lib/actions/reports";
import { downloadReportAsExcel } from "@/lib/reports/export";
import { getDefaultDateRange } from "@/lib/reports/types";
import type {
  ReportDateRange,
  ReportDefinition,
  ReportFilters,
  ReportResult,
  ReportType,
} from "@/lib/reports/types";
import { getPreviousCalendarWeek } from "@/lib/reports/date-ranges";
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
import { Download, Search } from "lucide-react";
import { OwnerMultiSelect } from "@/components/reports/owner-multi-select";
import { ReportDetailHeader } from "@/components/reports/report-detail-header";

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function buildFilters(
  contactName: string,
  contactEmail: string,
  ownerIds: string[],
  categoryId: string,
  departmentId: string,
  timesheetAgentId: string
): ReportFilters | undefined {
  const filters: ReportFilters = {};
  if (contactName.trim()) filters.contact_name = contactName.trim();
  if (contactEmail.trim()) filters.contact_email = contactEmail.trim();
  if (ownerIds.length > 0) filters.owner_ids = ownerIds;
  if (categoryId) filters.category_id = categoryId;
  if (departmentId) filters.department_id = departmentId;
  if (timesheetAgentId) filters.timesheet_agent_id = timesheetAgentId;
  return Object.keys(filters).length > 0 ? filters : undefined;
}

interface ReportDetailViewProps {
  report: ReportDefinition;
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

export function ReportDetailView({
  report,
  agents,
  categories,
  departments,
}: ReportDetailViewProps) {
  const previousWeek = getPreviousCalendarWeek();
  const defaultRange =
    report.id === "timesheet-agent" ? previousWeek : getDefaultDateRange();

  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [timesheetAgentId, setTimesheetAgentId] = useState(agents[0]?.id ?? "");
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultRange.dateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(defaultRange.dateTo);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters | undefined>();
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(
    async (showTable = true) => {
      setLoading(true);
      try {
        const dateRange: ReportDateRange | undefined = report.usesDateRange
          ? { dateFrom: appliedDateFrom, dateTo: appliedDateTo }
          : undefined;

        const data = await runFixedReportAction(report.id as ReportType, dateRange, appliedFilters);
        if (showTable) {
          setResult(data);
        }
        return data;
      } finally {
        setLoading(false);
      }
    },
    [report.id, report.usesDateRange, appliedDateFrom, appliedDateTo, appliedFilters]
  );

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function handleSearch() {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedFilters(
      buildFilters(contactName, contactEmail, ownerIds, categoryId, departmentId, timesheetAgentId)
    );
  }

  async function handleDownload() {
    const data = result ?? (await loadReport(false));
    const selectedAgent = agents.find((agent) => agent.id === timesheetAgentId);
    const title =
      report.id === "timesheet-agent" && selectedAgent
        ? `Timesheet ${selectedAgent.full_name}`
        : report.label;
    downloadReportAsExcel(title, data);
    if (!result) {
      setResult(data);
    }
  }

  const selectedAgent = agents.find((agent) => agent.id === timesheetAgentId);
  const displayTitle =
    report.id === "timesheet-agent" && selectedAgent
      ? `Timesheet ${selectedAgent.full_name}`
      : report.label;

  return (
    <div className="space-y-6">
      <ReportDetailHeader
        title={displayTitle}
        description={report.description}
        actions={
          <Button onClick={handleDownload} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
        }
      />

      <div className="rounded-lg border bg-white p-4 sm:p-6 space-y-6">
        {report.usesDateRange && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-date-from">From</Label>
              <Input
                id="report-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-date-to">To</Label>
              <Input
                id="report-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
        )}

        {!report.usesDateRange && (
          <p className="text-sm text-muted-foreground">
            This report shows a current snapshot and does not use a date filter.
          </p>
        )}

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
            <OwnerMultiSelect
              id="report-owner"
              agents={agents}
              value={ownerIds}
              onChange={setOwnerIds}
            />
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
            <Button className="w-full" onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {report.id === "timesheet-agent" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={timesheetAgentId} onValueChange={setTimesheetAgentId}>
                <SelectTrigger id="timesheet-agent">
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                Showing previous week by default. Adjust the date range above and click Search to
                change the period.
              </p>
            </div>
          </div>
        )}

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

        {loading ? (
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
      </div>
    </div>
  );
}
