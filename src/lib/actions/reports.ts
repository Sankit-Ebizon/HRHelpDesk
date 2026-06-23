"use server";

import { requirePermission, getUserReportSections, canViewReportSection } from "@/lib/auth";
import { runCustomReport } from "@/lib/reports/custom-queries";
import { getFixedReport } from "@/lib/reports/queries";
import { CUSTOM_REPORT_SECTION } from "@/lib/reports/sections";
import type {
  CustomReportConfig,
  ReportDateRange,
  ReportFilters,
  ReportResult,
  ReportType,
} from "@/lib/reports/types";

export async function runFixedReportAction(
  reportType: ReportType,
  dateRange?: ReportDateRange,
  filters?: ReportFilters
): Promise<ReportResult> {
  const { profile } = await requirePermission("reports", "read");
  const reportSections = await getUserReportSections(profile.role);
  if (!canViewReportSection(reportSections, reportType, profile.role)) {
    throw new Error("Forbidden");
  }
  return getFixedReport(reportType, dateRange, filters);
}

export async function runCustomReportAction(config: CustomReportConfig): Promise<ReportResult> {
  const { profile } = await requirePermission("reports", "read");
  const reportSections = await getUserReportSections(profile.role);
  if (!canViewReportSection(reportSections, CUSTOM_REPORT_SECTION, profile.role)) {
    throw new Error("Forbidden");
  }
  return runCustomReport(config);
}
