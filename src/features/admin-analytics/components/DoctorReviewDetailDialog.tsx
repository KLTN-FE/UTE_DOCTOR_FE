import { AlertTriangle, Star } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DoctorReviewDetail,
  TopRatedDoctorItem,
} from "@/features/admin-analytics/types/admin-analytics.types";

interface DoctorReviewDetailDialogProps {
  doctor: TopRatedDoctorItem | null;
  open: boolean;
  loading: boolean;
  error: string | null;
  reviews: DoctorReviewDetail[];
  onOpenChange: (open: boolean) => void;
}

const formatDateTime = (value?: string | number | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN");
};

const getPatientName = (review: DoctorReviewDetail) => {
  if (!review.patientId || typeof review.patientId === "string") return "Bệnh nhân";
  return review.patientId.profileId?.name || "Bệnh nhân";
};

const getAppointmentId = (review: DoctorReviewDetail) => {
  if (!review.appointmentId) return null;
  if (typeof review.appointmentId === "string") return review.appointmentId;
  return review.appointmentId._id ?? null;
};

export function DoctorReviewDetailDialog({
  doctor,
  open,
  loading,
  error,
  reviews,
  onOpenChange,
}: DoctorReviewDetailDialogProps) {
  const avgRating = Number(doctor?.avgRating ?? 0).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(720px,calc(100vw-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            Chi tiết đánh giá
          </DialogTitle>
          <DialogDescription>
            {doctor?.doctorName || "-"} · {avgRating}/10 · {doctor?.reviewCount ?? 0} đánh giá
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Chưa có đánh giá chi tiết cho bác sĩ này.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review, index) => {
              const appointmentId = getAppointmentId(review);
              return (
                <article
                  key={review._id || `${doctor?.doctorId}-${index}`}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {getPatientName(review)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(review.createdAt)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {Number(review.rating ?? 0).toFixed(1)} / 10
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
                    {review.comment || "Không có bình luận."}
                  </p>

                  {appointmentId ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Lịch hẹn: {appointmentId}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
