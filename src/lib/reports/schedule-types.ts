import { addDays } from "date-fns";
import type { CustomReportConfig, ReportFilters, ReportType } from "./types";

export type ScheduleDateRangeMode = "rolling_30d" | "previous_week" | "none";
export type ScheduleReportKind = "fixed" | "custom";
export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface ScheduledReport {
  id: string;
  name: string;
  created_by: string;
  report_kind: ScheduleReportKind;
  fixed_report_type: string | null;
  custom_config: CustomReportConfig | null;
  filters: ReportFilters;
  date_range_mode: ScheduleDateRangeMode;
  interval_days: number;
  frequency: ScheduleFrequency;
  run_time: string;
  timezone: string;
  weekly_days: number[];
  monthly_day: number;
  recipients: string[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

export const SCHEDULE_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_SCHEDULE_RUN_TIME = "09:00";
export const SCHEDULE_TIME_LABEL = "9:00 AM IST";

export interface ScheduleTimingInput {
  frequency: ScheduleFrequency;
  weeklyDays?: number[];
  monthlyDay?: number;
}

type ResolvedScheduleTiming = ScheduleTimingInput & {
  runTime: string;
  timezone: string;
};

export function resolveScheduleTiming(timing: ScheduleTimingInput): ResolvedScheduleTiming {
  return {
    ...timing,
    runTime: DEFAULT_SCHEDULE_RUN_TIME,
    timezone: SCHEDULE_TIMEZONE,
  };
}

export interface CreateScheduledReportInput {
  name: string;
  reportKind: ScheduleReportKind;
  fixedReportType?: ReportType;
  customConfig?: CustomReportConfig;
  filters?: ReportFilters;
  dateRangeMode: ScheduleDateRangeMode;
  timing: ScheduleTimingInput;
  recipients: string[];
}

export interface UpdateScheduledReportInput {
  name?: string;
  timing?: ScheduleTimingInput;
  recipients?: string[];
  dateRangeMode?: ScheduleDateRangeMode;
  is_active?: boolean;
}

export const DATE_RANGE_MODE_LABELS: Record<ScheduleDateRangeMode, string> = {
  rolling_30d: "Last 30 days",
  previous_week: "Previous calendar week",
  none: "Current snapshot (no date range)",
};

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function addDaysToYmd(year: number, month: number, day: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function makeZonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    const dayDiff = Math.round(
      (Date.UTC(year, month - 1, day) - Date.UTC(parts.year, parts.month - 1, parts.day)) /
        86_400_000
    );
    const minuteDiff = dayDiff * 24 * 60 + (hour - parts.hour) * 60 + (minute - parts.minute);
    if (minuteDiff === 0) break;
    utcMs += minuteDiff * 60_000;
  }
  return new Date(utcMs);
}

function normalizeRunTime(runTime: string | null | undefined): string {
  if (!runTime) return "09:00";
  const match = runTime.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function matchesSchedule(date: Date, timing: ScheduleTimingInput): boolean {
  const resolved = resolveScheduleTiming(timing);
  const parts = getZonedParts(date, resolved.timezone);
  const [runHour, runMinute] = normalizeRunTime(resolved.runTime).split(":").map(Number);
  if (parts.hour !== runHour || parts.minute !== runMinute) return false;

  if (timing.frequency === "daily") return true;

  if (timing.frequency === "weekly") {
    const days = timing.weeklyDays?.length ? timing.weeklyDays : [1];
    return days.includes(parts.weekday);
  }

  const targetDay = timing.monthlyDay ?? 1;
  const lastDay = daysInMonth(parts.year, parts.month);
  return parts.day === Math.min(targetDay, lastDay);
}

/** True when a schedule's stored next_run_at has been reached. */
export function isScheduleDue(schedule: Pick<ScheduledReport, "next_run_at" | "is_active">, now: Date = new Date()): boolean {
  if (!schedule.is_active) return false;
  return new Date(schedule.next_run_at).getTime() <= now.getTime();
}

export function computeNextScheduledRun(
  timing: ScheduleTimingInput,
  from: Date = new Date()
): Date {
  const resolved = resolveScheduleTiming(timing);
  const [runHour, runMinute] = normalizeRunTime(resolved.runTime).split(":").map(Number);
  const startParts = getZonedParts(from, resolved.timezone);

  for (let dayOffset = 0; dayOffset < 400; dayOffset++) {
    const { year, month, day } = addDaysToYmd(
      startParts.year,
      startParts.month,
      startParts.day,
      dayOffset
    );
    const candidate = makeZonedDate(year, month, day, runHour, runMinute, resolved.timezone);
    if (candidate.getTime() <= from.getTime()) continue;
    if (matchesSchedule(candidate, timing)) return candidate;
  }

  return addDays(from, 1);
}

export function formatNextRunInTimezone(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SCHEDULE_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** @deprecated Use computeNextScheduledRun */
export function computeNextRunAt(intervalDays: number, from: Date = new Date()): Date {
  const days = intervalDays > 0 ? intervalDays : 1;
  return addDays(from, days);
}

export function formatScheduleTiming(report: Pick<
  ScheduledReport,
  "frequency" | "weekly_days" | "monthly_day"
>): string {
  if (report.frequency === "daily") {
    return `Daily at ${SCHEDULE_TIME_LABEL}`;
  }
  if (report.frequency === "weekly") {
    const days = (report.weekly_days || [1])
      .map((day) => WEEKDAY_LABELS[day] || day)
      .join(", ");
    return `Weekly on ${days} at ${SCHEDULE_TIME_LABEL}`;
  }
  return `Monthly on day ${report.monthly_day || 1} at ${SCHEDULE_TIME_LABEL}`;
}

/** @deprecated */
export function formatIntervalDays(days: number): string {
  return days === 1 ? "Every day" : `Every ${days} days`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function defaultDateRangeModeForReport(
  reportType: ReportType,
  usesDateRange: boolean
): ScheduleDateRangeMode {
  if (!usesDateRange) return "none";
  if (reportType === "timesheet-agent") return "previous_week";
  return "rolling_30d";
}

export function scheduleTimingFromReport(report: ScheduledReport): ScheduleTimingInput {
  return {
    frequency: report.frequency || "daily",
    weeklyDays: report.weekly_days?.length ? report.weekly_days : [1],
    monthlyDay: report.monthly_day || 1,
  };
}

export interface ScheduledReportPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canEnable: boolean;
}
