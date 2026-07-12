import { Star } from "lucide-react";

import { TopRatedDoctorItem } from "@/features/admin-analytics/types/admin-analytics.types";

/**
 * Always shows BOTH the 1-10 average and the review count, so a high average on
 * a single review is not misread as reliable.
 */
export function TopRatedDoctorRow({
  rank,
  item,
  onSelect,
}: {
  rank: number;
  item: TopRatedDoctorItem;
  onSelect?: (item: TopRatedDoctorItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left transition hover:border-amber-300 hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:hover:border-amber-800 dark:hover:bg-amber-950/20"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {rank}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-900 dark:text-white">
            {item.doctorName || "-"}
          </span>
          <span className="block text-xs text-muted-foreground">Xem chi tiết đánh giá</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          {Number(item.avgRating ?? 0).toFixed(1)} / 10
        </span>
        <span className="text-xs text-muted-foreground">{item.reviewCount} đánh giá</span>
      </div>
    </button>
  );
}
