import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmailWithAttachment } from "@/lib/email";
import { runCustomReport } from "@/lib/reports/custom-queries";
import { buildReportWorkbookBuffer, getReportFilename } from "@/lib/reports/export";
import { getPreviousCalendarWeek } from "@/lib/reports/date-ranges";
import { getFixedReport } from "@/lib/reports/queries";
import { withReportServiceClient } from "@/lib/reports/report-client";
import {
  computeNextScheduledRun,
  isScheduleDue,
  scheduleTimingFromReport,
} from "@/lib/reports/schedule-types";
import type { ScheduledReport } from "@/lib/reports/schedule-types";
import { getDefaultDateRange } from "@/lib/reports/types";
import type { CustomReportConfig, ReportDateRange, ReportFilters, ReportType } from "@/lib/reports/types";

function resolveDateRange(schedule: ScheduledReport): ReportDateRange | undefined {
  if (schedule.date_range_mode === "none") return undefined;
  if (schedule.date_range_mode === "previous_week") return getPreviousCalendarWeek();
  return getDefaultDateRange();
}

function resolveCustomDateRange(schedule: ScheduledReport): { dateFrom?: string; dateTo?: string } {
  if (schedule.date_range_mode === "none") return {};
  if (schedule.date_range_mode === "previous_week") {
    const range = getPreviousCalendarWeek();
    return { dateFrom: range.dateFrom, dateTo: range.dateTo };
  }
  const range = getDefaultDateRange();
  return { dateFrom: range.dateFrom, dateTo: range.dateTo };
}

export async function runScheduledReport(schedule: ScheduledReport) {
  const filters = (schedule.filters || {}) as ReportFilters;

  let result;
  let reportLabel = schedule.name;

  if (schedule.report_kind === "fixed" && schedule.fixed_report_type) {
    const reportType = schedule.fixed_report_type as ReportType;
    const dateRange = resolveDateRange(schedule);
    result = await getFixedReport(reportType, dateRange, filters);
    reportLabel = schedule.name;
  } else if (schedule.report_kind === "custom" && schedule.custom_config) {
    const baseConfig = schedule.custom_config as CustomReportConfig;
    const dateRange = resolveCustomDateRange(schedule);
    const config: CustomReportConfig = {
      ...baseConfig,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
      filters: baseConfig.moduleId === "tickets" ? filters : baseConfig.filters,
    };
    result = await runCustomReport(config);
    reportLabel = config.name || schedule.name;
  } else {
    throw new Error("Invalid schedule configuration");
  }

  const buffer = buildReportWorkbookBuffer(result);
  const filename = getReportFilename(reportLabel);
  const dateLabel = new Date().toLocaleDateString();

  for (const recipient of schedule.recipients) {
    const sent = await sendEmailWithAttachment({
      to: recipient,
      subject: `Scheduled Report: ${reportLabel}`,
      html: `<p>Your scheduled report <strong>${reportLabel}</strong> is attached.</p><p>Generated on ${dateLabel}.</p>`,
      attachment: {
        filename,
        content: buffer,
      },
    });
    if (!sent.ok) {
      throw new Error(sent.error || `Failed to send report to ${recipient}`);
    }
  }

  return { rowCount: result.rows.length };
}

export async function processDueScheduledReports(): Promise<{
  processed: number;
  errors: { id: string; error: string }[];
}> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: schedules, error } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_at", now);

  if (error) {
    throw new Error(error.message);
  }

  const dueSchedules = (schedules || []).filter((row) =>
    isScheduleDue(row as ScheduledReport, new Date(now))
  );

  if (!dueSchedules.length) {
    return { processed: 0, errors: [] };
  }

  let processed = 0;
  const errors: { id: string; error: string }[] = [];

  for (const row of dueSchedules) {
    const schedule = row as ScheduledReport;
    try {
      await withReportServiceClient(() => runScheduledReport(schedule));
      const nextRunAt = computeNextScheduledRun(scheduleTimingFromReport(schedule), new Date());
      await supabase
        .from("scheduled_reports")
        .update({
          last_run_at: now,
          next_run_at: nextRunAt.toISOString(),
          updated_at: now,
        })
        .eq("id", schedule.id);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ id: schedule.id, error: message });
      console.error(`[scheduled-reports] Failed for ${schedule.id}:`, err);
    }
  }

  return { processed, errors };
}

export async function runScheduledReportById(scheduleId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("id", scheduleId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Schedule not found");
  }

  const schedule = data as ScheduledReport;
  const now = new Date().toISOString();

  await withReportServiceClient(() => runScheduledReport(schedule));

  const nextRunAt = computeNextScheduledRun(scheduleTimingFromReport(schedule), new Date());
  const { error: updateError } = await supabase
    .from("scheduled_reports")
    .update({
      last_run_at: now,
      next_run_at: nextRunAt.toISOString(),
      updated_at: now,
    })
    .eq("id", scheduleId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}
