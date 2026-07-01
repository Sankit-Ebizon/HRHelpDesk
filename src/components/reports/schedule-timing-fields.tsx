"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FREQUENCY_LABELS,
  SCHEDULE_TIME_LABEL,
  WEEKDAY_LABELS,
  type ScheduleFrequency,
  type ScheduleTimingInput,
} from "@/lib/reports/schedule-types";
import { cn } from "@/lib/utils";

interface ScheduleTimingFieldsProps {
  value: ScheduleTimingInput;
  onChange: (value: ScheduleTimingInput) => void;
}

export function ScheduleTimingFields({ value, onChange }: ScheduleTimingFieldsProps) {
  function toggleWeekday(day: number) {
    const current = value.weeklyDays?.length ? value.weeklyDays : [1];
    const next = current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ ...value, weeklyDays: next.length ? next : [day] });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Frequency</Label>
        <Select
          value={value.frequency}
          onValueChange={(frequency) =>
            onChange({ ...value, frequency: frequency as ScheduleFrequency })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FREQUENCY_LABELS) as ScheduleFrequency[]).map((key) => (
              <SelectItem key={key} value={key}>
                {FREQUENCY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.frequency === "weekly" && (
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => {
              const selected = (value.weeklyDays || [1]).includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    "rounded border px-2.5 py-1 text-xs font-medium",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-foreground"
                  )}
                  onClick={() => toggleWeekday(day)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.frequency === "monthly" && (
        <div className="space-y-2">
          <Label htmlFor="monthly-day">Day of Month</Label>
          <Input
            id="monthly-day"
            type="number"
            min={1}
            max={31}
            value={value.monthlyDay ?? 1}
            onChange={(e) =>
              onChange({ ...value, monthlyDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
            }
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        All scheduled reports run at <span className="font-medium">{SCHEDULE_TIME_LABEL}</span> (India time).
      </p>
    </div>
  );
}

export const DEFAULT_SCHEDULE_TIMING: ScheduleTimingInput = {
  frequency: "daily",
  weeklyDays: [1],
  monthlyDay: 1,
};
