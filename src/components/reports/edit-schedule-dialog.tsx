"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateScheduledReportAction } from "@/lib/actions/scheduled-reports";
import {
  scheduleTimingFromReport,
  type ScheduleDateRangeMode,
  type ScheduledReport,
} from "@/lib/reports/schedule-types";
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
import { ScheduleTimingFields } from "@/components/reports/schedule-timing-fields";
import { ScheduleDateRangeSelect } from "@/components/reports/schedule-date-range-select";
import { Pencil } from "lucide-react";

interface EditScheduleDialogProps {
  schedule: ScheduledReport;
  recipientOptions: RecipientOption[];
}

export function EditScheduleDialog({ schedule, recipientOptions }: EditScheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(schedule.name);
  const [recipients, setRecipients] = useState<string[]>(schedule.recipients);
  const [timing, setTiming] = useState(scheduleTimingFromReport(schedule));
  const [dateRangeMode, setDateRangeMode] = useState(schedule.date_range_mode);

  useEffect(() => {
    if (open) {
      setName(schedule.name);
      setRecipients(schedule.recipients);
      setTiming(scheduleTimingFromReport(schedule));
      setDateRangeMode(schedule.date_range_mode);
    }
  }, [open, schedule]);

  const usesDateRange = schedule.date_range_mode !== "none";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (recipients.length === 0) {
      toast({ title: "Select at least one recipient", variant: "error" });
      return;
    }

    setLoading(true);
    const result = await updateScheduledReportAction(schedule.id, {
      name,
      recipients,
      timing,
      dateRangeMode: usesDateRange ? dateRangeMode : undefined,
    });
    setLoading(false);

    if (result.error) {
      toast({ title: result.error, variant: "error" });
      return;
    }

    toast({ title: "Schedule updated", variant: "success" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={`Edit ${schedule.name}`}>
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-schedule-name">Schedule Name</Label>
              <Input
                id="edit-schedule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Recipients</Label>
              <RecipientEmailMultiSelect
                options={recipientOptions}
                value={recipients}
                onChange={setRecipients}
              />
            </div>

            <ScheduleTimingFields value={timing} onChange={setTiming} />

            {usesDateRange && (
              <ScheduleDateRangeSelect value={dateRangeMode} onChange={setDateRangeMode} />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
