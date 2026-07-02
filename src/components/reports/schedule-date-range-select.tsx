"use client";

import {
  DATE_RANGE_MODE_LABELS,
  SELECTABLE_DATE_RANGE_MODES,
  type ScheduleDateRangeMode,
} from "@/lib/reports/schedule-types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScheduleDateRangeSelectProps {
  value: ScheduleDateRangeMode;
  onChange: (value: ScheduleDateRangeMode) => void;
  showHelperText?: boolean;
}

export function ScheduleDateRangeSelect({
  value,
  onChange,
  showHelperText = false,
}: ScheduleDateRangeSelectProps) {
  return (
    <div className="space-y-2">
      <Label>Date Range</Label>
      <Select value={value} onValueChange={(next) => onChange(next as ScheduleDateRangeMode)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SELECTABLE_DATE_RANGE_MODES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {DATE_RANGE_MODE_LABELS[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showHelperText && (
        <p className="text-xs text-muted-foreground">
          The date range is recalculated each time the report runs.
        </p>
      )}
    </div>
  );
}
