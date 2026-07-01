"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteScheduledReportAction,
  runScheduledReportNowAction,
  updateScheduledReportAction,
} from "@/lib/actions/scheduled-reports";
import {
  DATE_RANGE_MODE_LABELS,
  formatScheduleTiming,
  formatNextRunInTimezone,
  type ScheduledReport,
  type ScheduledReportPermissions,
} from "@/lib/reports/schedule-types";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { ZohoToggle } from "@/components/ui/zoho-toggle";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditScheduleDialog } from "@/components/reports/edit-schedule-dialog";
import type { RecipientOption } from "@/components/reports/recipient-email-multi-select";
import { Trash2, Play } from "lucide-react";

function formatNextRun(schedule: ScheduledReport): string {
  return formatNextRunInTimezone(schedule.next_run_at);
}

interface ScheduledReportsViewProps {
  schedules: ScheduledReport[];
  permissions: ScheduledReportPermissions;
  recipientOptions: RecipientOption[];
}

export function ScheduledReportsView({
  schedules,
  permissions,
  recipientOptions,
}: ScheduledReportsViewProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  async function handleToggleActive(schedule: ScheduledReport) {
    const result = await updateScheduledReportAction(schedule.id, {
      is_active: !schedule.is_active,
    });
    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }
    toast({
      title: schedule.is_active ? "Schedule disabled" : "Schedule enabled",
      variant: "success",
    });
    router.refresh();
  }

  async function handleRunNow(schedule: ScheduledReport) {
    setRunningId(schedule.id);
    const result = await runScheduledReportNowAction(schedule.id);
    setRunningId(null);
    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }
    toast({ title: "Report sent to recipients", variant: "success" });
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteScheduledReportAction(deleteId);
    setDeleting(false);
    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }
    toast({ title: "Schedule deleted", variant: "success" });
    setDeleteId(null);
    router.refresh();
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border bg-white px-6 py-8 sm:px-8">
        <p className="text-sm text-muted-foreground">
          No scheduled reports yet. Open a report and click Schedule to set up automatic delivery.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b px-6 py-3 sm:px-8">
          <h2 className="text-sm font-semibold text-zinc-800">
            Scheduled Reports ({schedules.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-6 py-2.5 sm:px-8">Name</th>
                <th className="px-6 py-2.5 sm:px-8">Schedule</th>
                <th className="px-6 py-2.5 sm:px-8">Date Range</th>
                <th className="px-6 py-2.5 sm:px-8">Recipients</th>
                <th className="px-6 py-2.5 sm:px-8">Next Run</th>
                <th className="px-6 py-2.5 sm:px-8">Active</th>
                <th className="px-6 py-2.5 sm:px-8" />
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-6 py-3.5 text-[15px] font-medium text-zinc-900 sm:px-8">
                    {schedule.name}
                    <p className="text-xs font-normal text-muted-foreground mt-0.5">
                      {schedule.report_kind === "fixed"
                        ? schedule.fixed_report_type?.replace(/-/g, " ")
                        : "Custom report"}
                    </p>
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-zinc-600 sm:px-8">
                    {formatScheduleTiming(schedule)}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-zinc-600 sm:px-8">
                    {DATE_RANGE_MODE_LABELS[schedule.date_range_mode]}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-zinc-600 sm:px-8">
                    {schedule.recipients.join(", ")}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-zinc-600 sm:px-8">
                    {formatNextRun(schedule)}
                  </td>
                  <td className="px-6 py-3.5 sm:px-8">
                    {permissions.canEnable ? (
                      <ZohoToggle
                        checked={schedule.is_active}
                        onChange={() => void handleToggleActive(schedule)}
                        label={`Toggle ${schedule.name}`}
                      />
                    ) : (
                      <span className="text-[13px] text-zinc-600">
                        {schedule.is_active ? "Yes" : "No"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 sm:px-8">
                    <div className="flex items-center gap-1">
                      {permissions.canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleRunNow(schedule)}
                          disabled={runningId === schedule.id}
                          aria-label={`Run now ${schedule.name}`}
                          title="Run now"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {permissions.canEdit && (
                        <EditScheduleDialog
                          schedule={schedule}
                          recipientOptions={recipientOptions}
                        />
                      )}
                      {permissions.canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(schedule.id)}
                          aria-label={`Delete ${schedule.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the scheduled report. Future deliveries will stop.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
