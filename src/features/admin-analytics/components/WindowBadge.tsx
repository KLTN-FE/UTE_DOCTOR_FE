import { CalendarRange } from "lucide-react";

import { AnalyticsWindow } from "@/features/admin-analytics/types/admin-analytics.types";

const formatRange = (from: number, to: number): string => {
  const fmt = (ts: number) => new Date(ts).toLocaleDateString("vi-VN");
  return `${fmt(from)} – ${fmt(to)}`;
};

/**
 * Renders a metric's time window derived from that metric's OWN response.
 * `presetLabel` is an optional friendly name (e.g. "3 tháng gần nhất") — the raw
 * range is always kept as the tooltip so no card's window can be mistaken for another's.
 */
export function WindowBadge({
  window,
  presetLabel,
}: {
  window: AnalyticsWindow;
  presetLabel?: string;
}) {
  const range = window ? formatRange(window.from, window.to) : null;
  const text = presetLabel ?? range ?? "Toàn thời gian";

  return (
    <span
      title={range ?? undefined}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
    >
      <CalendarRange className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}
