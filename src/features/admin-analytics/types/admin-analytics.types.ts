/**
 * Admin analytics contract types.
 * Source of truth: api-contract/README_ADMIN_ANALYTICS.md.
 *
 * IMPORTANT: reqs 1/2/4 window on `Appointment.scheduledAt` (default: last 3 months);
 * req 3 (top-rated-doctors) windows on `Review.createdAt` and is all-time by default
 * (`window: null`). The two axes are NOT comparable — never share a date filter across them.
 */

/** `{ from, to }` epoch-ms window, or `null` when the metric ran all-time. */
export type AnalyticsWindow = { from: number; to: number } | null;

export type AccountStatus = "ACTIVE" | "INACTIVE" | null;

/** Common query params (all optional). `limit` default 5, clamped to [1, 50] server-side. */
export interface AnalyticsQuery {
  from?: number;
  to?: number;
  limit?: number;
}

export interface TopSpecialtyItem {
  specialtyId: string;
  name: string;
  examCount: number;
}

export interface TopDoctorItem {
  doctorId: string;
  doctorName: string;
  examCount: number;
}

export interface TopRatedDoctorItem {
  doctorId: string;
  doctorName: string;
  /** Average `Review.rating` on a 1–10 scale. */
  avgRating: number;
  reviewCount: number;
}

export interface DoctorReviewDetail {
  _id: string;
  rating?: number;
  comment?: string | null;
  createdAt?: string | number | null;
  appointmentId?: string | { _id?: string } | null;
  patientId?:
    | string
    | {
        _id?: string;
        profileId?: { _id?: string; name?: string | null };
      }
    | null;
}

export interface FrequentPatientItem {
  accountId: string | null;
  name: string | null;
  status: AccountStatus;
  examCount: number;
}

export interface TopSpecialtiesResult {
  window: AnalyticsWindow;
  items: TopSpecialtyItem[];
  /** Completed exams whose specialty could not be attributed (excluded from `items`). */
  unattributedCount: number;
}

export interface TopDoctorsResult {
  window: AnalyticsWindow;
  items: TopDoctorItem[];
}

export interface TopRatedDoctorsResult {
  /** `null` unless a `from`/`to` range was supplied (all-time by default). */
  window: AnalyticsWindow;
  items: TopRatedDoctorItem[];
}

export interface FrequentPatientsResult {
  window: AnalyticsWindow;
  items: FrequentPatientItem[];
}
