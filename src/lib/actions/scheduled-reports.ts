"use server";

import { revalidatePath } from "next/cache";
import { canAccess, getUserPermissions, requireAuth, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  computeNextScheduledRun,
  DEFAULT_SCHEDULE_RUN_TIME,
  isValidEmail,
  SCHEDULE_TIMEZONE,
  type CreateScheduledReportInput,
  type ScheduledReport,
  type UpdateScheduledReportInput,
} from "@/lib/reports/schedule-types";

async function requireSchedulePermission(action: "read" | "create" | "edit" | "delete" | "enable") {
  return requirePermission("scheduled_reports", action);
}

function validateRecipients(recipients: string[]): string | null {
  if (recipients.length === 0) return "At least one recipient email is required";
  const invalid = recipients.find((email) => !isValidEmail(email));
  if (invalid) return `Invalid email address: ${invalid}`;
  return null;
}

function validateTiming(timing: CreateScheduledReportInput["timing"]): string | null {
  if (timing.frequency === "weekly" && !(timing.weeklyDays?.length)) {
    return "Select at least one day of the week";
  }
  if (timing.frequency === "monthly") {
    const day = timing.monthlyDay ?? 1;
    if (day < 1 || day > 31) return "Day of month must be between 1 and 31";
  }
  return null;
}

function timingToDbColumns(timing: CreateScheduledReportInput["timing"]) {
  return {
    frequency: timing.frequency,
    run_time: DEFAULT_SCHEDULE_RUN_TIME,
    timezone: SCHEDULE_TIMEZONE,
    weekly_days: timing.weeklyDays?.length ? timing.weeklyDays : [1],
    monthly_day: timing.monthlyDay ?? 1,
    interval_days:
      timing.frequency === "daily" ? 1 : timing.frequency === "weekly" ? 7 : 30,
  };
}

export async function getScheduledReportsAction(): Promise<ScheduledReport[]> {
  await requireSchedulePermission("read");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ScheduledReport[]) || [];
}

export async function createScheduledReportAction(
  input: CreateScheduledReportInput
): Promise<{ error?: string; id?: string }> {
  const { profile } = await requireSchedulePermission("create");

  const recipients = input.recipients.map((r) => r.trim().toLowerCase()).filter(Boolean);
  const recipientError = validateRecipients(recipients);
  if (recipientError) return { error: recipientError };

  const timingError = validateTiming(input.timing);
  if (timingError) return { error: timingError };

  if (input.reportKind === "fixed" && !input.fixedReportType) {
    return { error: "Report type is required" };
  }
  if (input.reportKind === "custom" && !input.customConfig) {
    return { error: "Custom report configuration is required" };
  }

  const nextRunAt = computeNextScheduledRun(input.timing);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scheduled_reports")
    .insert({
      name: input.name.trim() || "Scheduled Report",
      created_by: profile.id,
      report_kind: input.reportKind,
      fixed_report_type: input.fixedReportType ?? null,
      custom_config: input.customConfig ?? null,
      filters: input.filters ?? {},
      date_range_mode: input.dateRangeMode,
      recipients,
      next_run_at: nextRunAt.toISOString(),
      ...timingToDbColumns(input.timing),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/reports/schedules");
  return { id: data.id };
}

export async function updateScheduledReportAction(
  id: string,
  updates: UpdateScheduledReportInput
): Promise<{ error?: string }> {
  const profile = await requireAuth();
  const permissions = await getUserPermissions(profile.role);

  const canEdit = canAccess(permissions, "scheduled_reports", "edit");
  const canEnable = canAccess(permissions, "scheduled_reports", "enable");

  if (updates.is_active !== undefined && Object.keys(updates).length === 1) {
    if (!canEnable) return { error: "Forbidden" };
  } else if (!canEdit) {
    return { error: "Forbidden" };
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) payload.name = updates.name.trim() || "Scheduled Report";
  if (updates.dateRangeMode !== undefined) payload.date_range_mode = updates.dateRangeMode;
  if (updates.is_active !== undefined) payload.is_active = updates.is_active;

  if (updates.timing !== undefined) {
    const timingError = validateTiming(updates.timing);
    if (timingError) return { error: timingError };
    Object.assign(payload, timingToDbColumns(updates.timing));
    payload.next_run_at = computeNextScheduledRun(updates.timing).toISOString();
  }

  if (updates.recipients !== undefined) {
    const recipients = updates.recipients.map((r) => r.trim().toLowerCase()).filter(Boolean);
    const recipientError = validateRecipients(recipients);
    if (recipientError) return { error: recipientError };
    payload.recipients = recipients;
  }

  const { error } = await supabase.from("scheduled_reports").update(payload).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/reports/schedules");
  return {};
}

export async function deleteScheduledReportAction(id: string): Promise<{ error?: string }> {
  await requireSchedulePermission("delete");
  const supabase = await createClient();
  const { error } = await supabase.from("scheduled_reports").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/reports/schedules");
  return {};
}

export async function runScheduledReportNowAction(id: string): Promise<{ error?: string }> {
  await requireSchedulePermission("edit");
  try {
    const { runScheduledReportById } = await import("@/lib/reports/schedule-runner");
    await runScheduledReportById(id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to run schedule" };
  }

  revalidatePath("/reports/schedules");
  return {};
}
