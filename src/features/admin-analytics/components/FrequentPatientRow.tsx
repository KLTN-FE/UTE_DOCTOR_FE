import { AccountStatusBadge } from "@/components/admin/AccountStatusBadge";
import { FrequentPatientItem } from "@/features/admin-analytics/types/admin-analytics.types";

export function FrequentPatientRow({ rank, item }: { rank: number; item: FrequentPatientItem }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {rank}
        </span>
        <span className="truncate font-medium text-slate-900 dark:text-white">
          {item.name || "—"}
        </span>
        <AccountStatusBadge status={item.status} />
      </div>
      <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
        {item.examCount} lượt khám
      </span>
    </div>
  );
}
