"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createScheduledReportAction } from "@/lib/actions/scheduled-reports";
import {
  defaultDateRangeModeForReport,
  type ScheduleDateRangeMode,
  type ScheduleReportKind,
} from "@/lib/reports/schedule-types";
import type { CustomReportConfig, ReportFilters, ReportType } from "@/lib/reports/types";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RecipientEmailMultiSelect,
  type RecipientOption,
} from "@/components/reports/recipient-email-multi-select";
import {
  DEFAULT_SCHEDULE_TIMING,
  ScheduleTimingFields,
} from "@/components/reports/schedule-timing-fields";
import { ScheduleDateRangeSelect } from "@/components/reports/schedule-date-range-select";
import { CalendarClock } from "lucide-react";

interface ScheduleReportDialogProps {
  reportName: string;
  reportKind: ScheduleReportKind;
  fixedReportType?: ReportType;
  customConfig?: CustomReportConfig;
  filters?: ReportFilters;
  usesDateRange?: boolean;
  recipientOptions: RecipientOption[];
}

export function ScheduleReportDialog({
  reportName,
  reportKind,
  fixedReportType,
  customConfig,
  filters,
  usesDateRange = true,
  recipientOptions,
}: ScheduleReportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(reportName);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [timing, setTiming] = useState(DEFAULT_SCHEDULE_TIMING);
  const [dateRangeMode, setDateRangeMode] = useState<ScheduleDateRangeMode>(
    fixedReportType
      ? defaultDateRangeModeForReport(fixedReportType, usesDateRange)
      : usesDateRange
        ? "rolling_30d"
        : "none"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (recipients.length === 0) {
      toast({ title: "Select at least one recipient", variant: "error" });
      return;
    }

    setLoading(true);
    const result = await createScheduledReportAction({
      name: name.trim() || reportName,
      reportKind,
      fixedReportType,
      customConfig,
      filters,
      dateRangeMode,
      timing,
      recipients,
    });
    setLoading(false);

    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }

    toast({ title: "Report schedule created", variant: "success" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarClock className="h-4 w-4 mr-2" />
        Schedule
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={reportName}
              />
            </div>

            <div className="space-y-2">
              <Label>Recipients</Label>
              <RecipientEmailMultiSelect
                id="schedule-recipients"
                options={recipientOptions}
                value={recipients}
                onChange={setRecipients}
              />
            </div>

            <ScheduleTimingFields value={timing} onChange={setTiming} />

            {usesDateRange && (
              <ScheduleDateRangeSelect
                value={dateRangeMode}
                onChange={setDateRangeMode}
                showHelperText
              />
            )}

            {!usesDateRange && (
              <p className="text-sm text-muted-foreground">
                This report uses a current snapshot and does not apply a date range.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
