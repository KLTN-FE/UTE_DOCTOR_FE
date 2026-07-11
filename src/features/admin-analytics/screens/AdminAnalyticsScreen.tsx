"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarClock,
  Layers,
  Star,
  Stethoscope,
  Users,
} from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAnalytics } from "@/features/admin-analytics/hooks/useAdminAnalytics";
import { LeaderboardCard } from "@/features/admin-analytics/components/LeaderboardCard";
import { RankedBarChart } from "@/features/admin-analytics/components/RankedBarChart";
import { TopRatedDoctorRow } from "@/features/admin-analytics/components/TopRatedDoctorRow";
import { FrequentPatientRow } from "@/features/admin-analytics/components/FrequentPatientRow";
import { TopNSelect } from "@/features/admin-analytics/components/TopNSelect";
import { VolumeDateRange } from "@/features/admin-analytics/components/VolumeDateRange";
import { DoctorReviewDetailDialog } from "@/features/admin-analytics/components/DoctorReviewDetailDialog";

const VOLUME_PRESET = "3 tháng gần nhất";
const RATED_PRESET = "Toàn thời gian (theo ngày đánh giá)";

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const {
    limit,
    setLimit,
    volumeRange,
    setVolumeRange,
    hasVolumeOverride,
    topSpecialties,
    topDoctors,
    topRatedDoctors,
    frequentPatients,
    selectedRatedDoctor,
    doctorReviews,
    openDoctorReviews,
    closeDoctorReviews,
  } = useAdminAnalytics();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = (localStorage.getItem("role") || "").toUpperCase();
    if (role && role !== "ADMIN") {
      toast.error("Only admins can view analytics.");
      router.replace("/");
    }
  }, [router]);

  const volumePreset = hasVolumeOverride ? undefined : VOLUME_PRESET;

  return (
    <div className="space-y-6">
      {/* Page header + global Top-N control */}
      <Card className="overflow-hidden border-sky-200/70 shadow-sm dark:border-sky-900/40">
        <CardHeader className="border-b border-sky-100/80 bg-gradient-to-r from-sky-50 via-white to-emerald-50 dark:border-sky-900/40 dark:from-sky-950/40 dark:via-gray-950 dark:to-emerald-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                Thống kê phòng khám
              </CardTitle>
              <CardDescription className="max-w-2xl">
                Bảng xếp hạng chỉ đọc. Đơn vị đếm là <strong>lượt khám đã hoàn thành</strong>.
                Ba thẻ đầu tính theo <strong>ngày hẹn khám</strong> (mặc định 3 tháng gần nhất);
                thẻ &ldquo;Bác sĩ được đánh giá cao&rdquo; tính theo <strong>ngày đánh giá</strong>{" "}
                và mặc định <strong>toàn thời gian</strong> — hai mốc thời gian này không so sánh được với nhau.
              </CardDescription>
            </div>
            <TopNSelect value={limit} onChange={setLimit} />
          </div>
        </CardHeader>
      </Card>

      {/* Section A — scheduledAt volume group (shared, scoped date override) */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border bg-background p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-sky-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Thống kê khám bệnh · {volumePreset ?? "khoảng thời gian tùy chọn"}
              </h2>
              <p className="text-xs text-muted-foreground">Tính theo ngày hẹn khám (scheduledAt).</p>
            </div>
          </div>
          <VolumeDateRange value={volumeRange} onChange={setVolumeRange} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <LeaderboardCard
            title="Chuyên khoa được khám nhiều nhất"
            icon={<Layers className="h-5 w-5 text-sky-600" />}
            window={topSpecialties.data?.window}
            windowPresetLabel={volumePreset}
            loading={topSpecialties.loading}
            error={topSpecialties.error}
            isEmpty={(topSpecialties.data?.items.length ?? 0) === 0}
            footnote={
              topSpecialties.data && topSpecialties.data.unattributedCount > 0
                ? `${topSpecialties.data.unattributedCount} lượt khám chưa gắn chuyên khoa (không tính vào xếp hạng).`
                : null
            }
          >
            <RankedBarChart
              data={(topSpecialties.data?.items ?? []).map((item) => ({
                label: item.name,
                value: item.examCount,
              }))}
              valueName="Lượt khám"
              color="#0ea5e9"
            />
          </LeaderboardCard>

          <LeaderboardCard
            title="Bác sĩ khám nhiều nhất"
            icon={<Stethoscope className="h-5 w-5 text-emerald-600" />}
            window={topDoctors.data?.window}
            windowPresetLabel={volumePreset}
            loading={topDoctors.loading}
            error={topDoctors.error}
            isEmpty={(topDoctors.data?.items.length ?? 0) === 0}
          >
            <RankedBarChart
              data={(topDoctors.data?.items ?? []).map((item) => ({
                label: item.doctorName,
                value: item.examCount,
              }))}
              valueName="Lượt khám"
              color="#10b981"
            />
          </LeaderboardCard>

          <LeaderboardCard
            title="Bệnh nhân khám nhiều nhất"
            icon={<Users className="h-5 w-5 text-violet-600" />}
            window={frequentPatients.data?.window}
            windowPresetLabel={volumePreset}
            loading={frequentPatients.loading}
            error={frequentPatients.error}
            isEmpty={(frequentPatients.data?.items.length ?? 0) === 0}
          >
            <div className="space-y-2">
              {(frequentPatients.data?.items ?? []).map((item, index) => (
                <FrequentPatientRow
                  key={item.accountId ?? `${item.name}-${index}`}
                  rank={index + 1}
                  item={item}
                />
              ))}
            </div>
          </LeaderboardCard>
        </div>
      </section>

      {/* Section B — Review.createdAt, all-time (standalone; no shared date control) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 rounded-2xl border bg-background p-4 shadow-sm">
          <Star className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Bác sĩ được đánh giá cao · Toàn thời gian
            </h2>
            <p className="text-xs text-muted-foreground">
              Tính theo ngày đánh giá (Review.createdAt), thang điểm 1–10. Không dùng bộ lọc thời gian ở trên.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <LeaderboardCard
            title="Bác sĩ được đánh giá cao nhất"
            icon={<Star className="h-5 w-5 text-amber-500" />}
            window={topRatedDoctors.data?.window}
            windowPresetLabel={RATED_PRESET}
            loading={topRatedDoctors.loading}
            error={topRatedDoctors.error}
            isEmpty={(topRatedDoctors.data?.items.length ?? 0) === 0}
          >
            <div className="space-y-2">
              {(topRatedDoctors.data?.items ?? []).map((item, index) => (
                <TopRatedDoctorRow
                  key={item.doctorId ?? index}
                  rank={index + 1}
                  item={item}
                  onSelect={openDoctorReviews}
                />
              ))}
            </div>
          </LeaderboardCard>
        </div>
      </section>

      <DoctorReviewDetailDialog
        doctor={selectedRatedDoctor}
        open={Boolean(selectedRatedDoctor)}
        loading={doctorReviews.loading}
        error={doctorReviews.error}
        reviews={doctorReviews.data ?? []}
        onOpenChange={(open) => {
          if (!open) closeDoctorReviews();
        }}
      />
    </div>
  );
}
