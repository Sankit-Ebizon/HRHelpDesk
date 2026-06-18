"use server";

import { requirePermission } from "@/lib/auth";
import { getFixedReport } from "@/lib/reports/queries";
import type { ReportDateRange, ReportFilters, ReportResult, ReportType } from "@/lib/reports/types";

export async function runFixedReportAction(
  reportType: ReportType,
  dateRange?: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  await requirePermission("reports", "read");
  return getFixedReport(reportType, dateRange, filters);
}
