import { formatCurrency } from "@/utils/money.util";
import { RevenueResult } from "@/features/admin-analytics/types/admin-analytics.types";

interface StatTileProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function StatTile({ label, value, emphasis }: StatTileProps) {
  return (
    <div
      className={
        emphasis
          ? "rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/30"
          : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
      }
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={
          emphasis
            ? "mt-2 text-2xl font-bold text-sky-700 dark:text-sky-300"
            : "mt-2 text-xl font-semibold text-slate-900 dark:text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function RevenueSummary({ data }: { data: RevenueResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Tổng doanh thu" value={formatCurrency(data.totalRevenue)} emphasis />
      <StatTile label="Doanh thu khám" value={formatCurrency(data.totalConsultationRevenue)} />
      <StatTile label="Doanh thu thuốc" value={formatCurrency(data.totalMedicationRevenue)} />
      <StatTile label="Số hóa đơn đã thanh toán" value={String(data.paidBillingCount)} />
    </div>
  );
}
