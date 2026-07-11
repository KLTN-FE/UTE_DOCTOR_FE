import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VolumeRange } from "@/features/admin-analytics/hooks/useAdminAnalytics";

const toEpoch = (dateValue: string, endOfDay = false): number | undefined => {
  if (!dateValue) return undefined;
  const date = new Date(`${dateValue}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  const time = date.getTime();
  return Number.isFinite(time) ? time : undefined;
};

const toInputValue = (epoch?: number): string => {
  if (epoch === undefined) return "";
  const date = new Date(epoch);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Optional date-range override scoped to one metric family. Defaults preserve
 * the shipped scheduledAt dashboard labels; callers may rename the axis.
 */
export function VolumeDateRange({
  value,
  onChange,
  fromLabel = "Từ ngày khám",
  toLabel = "Đến ngày khám",
  resetLabel = "Mặc định 3 tháng",
}: {
  value: VolumeRange;
  onChange: (value: VolumeRange) => void;
  fromLabel?: string;
  toLabel?: string;
  resetLabel?: string;
}) {
  const hasOverride = value.from !== undefined || value.to !== undefined;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{fromLabel}</span>
        <Input
          type="date"
          value={toInputValue(value.from)}
          onChange={(event) => onChange({ ...value, from: toEpoch(event.target.value) })}
          className="h-9"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{toLabel}</span>
        <Input
          type="date"
          value={toInputValue(value.to)}
          onChange={(event) => onChange({ ...value, to: toEpoch(event.target.value, true) })}
          className="h-9"
        />
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => onChange({})}
        disabled={!hasOverride}
      >
        <RotateCcw className="h-4 w-4" />
        {resetLabel}
      </Button>
    </div>
  );
}
