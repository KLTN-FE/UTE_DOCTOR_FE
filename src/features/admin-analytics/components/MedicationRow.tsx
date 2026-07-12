import { formatCurrency } from "@/utils/money.util";

interface MedicationRowProps {
  rank: number;
  name: string | null | undefined;
  totalQty: number;
  lineCount: number;
  revenue?: number;
}

export function MedicationRow({
  rank,
  name,
  totalQty,
  lineCount,
  revenue,
}: MedicationRowProps) {
  const displayName = name?.trim() || "—";

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {rank}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-white">{displayName}</p>
          {revenue !== undefined ? (
            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {formatCurrency(revenue)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-semibold text-slate-900 dark:text-white">SL: {totalQty}</p>
        <p className="text-xs text-muted-foreground">{lineCount} lượt kê</p>
      </div>
    </div>
  );
}
