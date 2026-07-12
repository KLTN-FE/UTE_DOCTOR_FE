"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, CalendarClock, Layers, Pill, Stethoscope } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardCard } from "@/features/admin-analytics/components/LeaderboardCard";
import { MedicationRow } from "@/features/admin-analytics/components/MedicationRow";
import { RankedBarChart } from "@/features/admin-analytics/components/RankedBarChart";
import { RevenueSummary } from "@/features/admin-analytics/components/RevenueSummary";
import { TopNSelect } from "@/features/admin-analytics/components/TopNSelect";
import { VolumeDateRange } from "@/features/admin-analytics/components/VolumeDateRange";
import { useAdminRevenue } from "@/features/admin-analytics/hooks/useAdminRevenue";
import {
  RevenueByDoctorItem,
  RevenueBySpecialtyItem,
} from "@/features/admin-analytics/types/admin-analytics.types";
import { formatCurrency } from "@/utils/money.util";

const REVENUE_PRESET = "3 tháng gần nhất (theo ngày hóa đơn)";

const EMPTY_REVENUE = {
  window: null,
  totalConsultationRevenue: 0,
  totalMedicationRevenue: 0,
  totalRevenue: 0,
  paidBillingCount: 0,
  doctorsWithRevenueCount: 0,
  specialtiesWithRevenueCount: 0,
  byDoctor: [],
  bySpecialty: [],
  topDispensedMedications: [],
  topExternalMedications: [],
};

const sortByRevenueDesc = <T extends { revenue: number }>(items: T[]) =>
  [...items].sort((a, b) => b.revenue - a.revenue);

const revenueFootnote = (totalCount: number, visibleCount: number, label: string) => {
  const base = `${totalCount} ${label} có doanh thu`;
  if (totalCount > visibleCount) return `${base} · đang hiển thị top ${visibleCount}`;
  return base;
};

const toDoctorChartData = (items: RevenueByDoctorItem[]) =>
  sortByRevenueDesc(items).map((item) => ({
    label: item.doctorName ?? "—",
    value: item.revenue,
  }));

const toSpecialtyChartData = (items: RevenueBySpecialtyItem[]) =>
  sortByRevenueDesc(items).map((item) => ({
    label: item.name ?? "—",
    value: item.revenue,
  }));

export default function AdminRevenueScreen() {
  const router = useRouter();
  const {
    limit,
    setLimit,
    billingRange,
    setBillingRange,
    hasBillingOverride,
    revenue,
    reload,
  } = useAdminRevenue();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = (localStorage.getItem("role") || "").toUpperCase();
    if (role && role !== "ADMIN") {
      toast.error("Only admins can view analytics.");
      router.replace("/");
    }
  }, [router]);

  const data = revenue.data;
  const revenuePreset = hasBillingOverride ? undefined : REVENUE_PRESET;
  const doctorData = useMemo(() => toDoctorChartData(data?.byDoctor ?? []), [data?.byDoctor]);
  const specialtyData = useMemo(
    () => toSpecialtyChartData(data?.bySpecialty ?? []),
    [data?.bySpecialty]
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-sky-200/70 shadow-sm dark:border-sky-900/40">
        <CardHeader className="border-b border-sky-100/80 bg-gradient-to-r from-sky-50 via-white to-emerald-50 dark:border-sky-900/40 dark:from-sky-950/40 dark:via-gray-950 dark:to-emerald-950/30">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Banknote className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                Doanh thu phòng khám
              </CardTitle>
              <CardDescription className="max-w-3xl">
                Doanh thu chỉ tính từ <strong>hóa đơn PAID (Billing)</strong>, theo{" "}
                <strong>ngày tạo hóa đơn (Billing.createdAt)</strong>. Đây là thước đo khác với
                lượt khám, nên bác sĩ có nhiều lượt khám chưa chắc đứng đầu về doanh thu.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <TopNSelect value={limit} onChange={setLimit} />
              <VolumeDateRange
                value={billingRange}
                onChange={setBillingRange}
                fromLabel="Từ ngày hóa đơn"
                toLabel="Đến ngày hóa đơn"
                resetLabel="Mặc định 3 tháng"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border bg-background p-4 shadow-sm">
          <Banknote className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tổng quan doanh thu</h2>
            <p className="text-xs text-muted-foreground">
              Tính theo hóa đơn đã thanh toán trong cửa sổ hiện tại.
            </p>
          </div>
        </div>
        {revenue.error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            {revenue.error}
          </div>
        ) : (
          <RevenueSummary data={data ?? EMPTY_REVENUE} />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border bg-background p-4 shadow-sm">
          <CalendarClock className="h-5 w-5 text-sky-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Phân tích doanh thu · {revenuePreset ?? "khoảng thời gian tùy chọn"}
            </h2>
            <p className="text-xs text-muted-foreground">Tính theo ngày tạo hóa đơn (Billing.createdAt).</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <LeaderboardCard
            title="Doanh thu theo bác sĩ"
            icon={<Stethoscope className="h-5 w-5 text-emerald-600" />}
            window={data?.window}
            windowPresetLabel={revenuePreset}
            loading={revenue.loading}
            error={revenue.error}
            isEmpty={doctorData.length === 0}
            onRetry={reload}
            footnote={
              data
                ? revenueFootnote(data.doctorsWithRevenueCount, data.byDoctor.length, "bác sĩ")
                : null
            }
          >
            <RankedBarChart
              data={doctorData}
              valueFormatter={formatCurrency}
              valueName="Doanh thu"
              color="#10b981"
            />
          </LeaderboardCard>

          <LeaderboardCard
            title="Doanh thu theo chuyên khoa"
            icon={<Layers className="h-5 w-5 text-sky-600" />}
            window={data?.window}
            windowPresetLabel={revenuePreset}
            loading={revenue.loading}
            error={revenue.error}
            isEmpty={specialtyData.length === 0}
            onRetry={reload}
            footnote={
              data
                ? revenueFootnote(data.specialtiesWithRevenueCount, data.bySpecialty.length, "chuyên khoa")
                : null
            }
          >
            <RankedBarChart
              data={specialtyData}
              valueFormatter={formatCurrency}
              valueName="Doanh thu"
              color="#0ea5e9"
            />
          </LeaderboardCard>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border bg-background p-4 shadow-sm">
          <Pill className="h-5 w-5 text-violet-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Xếp hạng thuốc</h2>
            <p className="text-xs text-muted-foreground">Sắp xếp theo số lượng kê, rồi số lượt kê.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <LeaderboardCard
            title="Thuốc kê tại phòng khám nhiều nhất"
            icon={<Pill className="h-5 w-5 text-emerald-600" />}
            window={data?.window}
            windowPresetLabel={revenuePreset}
            loading={revenue.loading}
            error={revenue.error}
            isEmpty={(data?.topDispensedMedications.length ?? 0) === 0}
            onRetry={reload}
          >
            <div className="space-y-2">
              {(data?.topDispensedMedications ?? []).map((item, index) => (
                <MedicationRow
                  key={item.medicineId ?? item.medicineName ?? index}
                  rank={index + 1}
                  name={item.medicineName}
                  totalQty={item.totalQty}
                  lineCount={item.lineCount}
                  revenue={item.revenue}
                />
              ))}
            </div>
          </LeaderboardCard>

          <LeaderboardCard
            title="Thuốc mua ngoài nhiều nhất"
            icon={<Pill className="h-5 w-5 text-violet-600" />}
            window={data?.window}
            windowPresetLabel={revenuePreset}
            loading={revenue.loading}
            error={revenue.error}
            isEmpty={(data?.topExternalMedications.length ?? 0) === 0}
            onRetry={reload}
          >
            <div className="space-y-2">
              {(data?.topExternalMedications ?? []).map((item, index) => (
                <MedicationRow
                  key={item.medicineId ?? item.medicineName ?? index}
                  rank={index + 1}
                  name={item.medicineName}
                  totalQty={item.totalQty}
                  lineCount={item.lineCount}
                />
              ))}
            </div>
          </LeaderboardCard>
        </div>
      </section>
    </div>
  );
}
