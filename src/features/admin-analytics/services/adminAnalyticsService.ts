import {
  getFrequentPatients,
  getRevenue as fetchRevenue,
  getTopDoctors,
  getTopRatedDoctors,
  getTopSpecialties,
} from "@/apis/admin/analytics.api";
import { getReviewsByDoctor } from "@/apis/review/review.api";
import {
  AnalyticsQuery,
  DoctorReviewDetail,
  FrequentPatientsResult,
  RevenueResult,
  TopDoctorsResult,
  TopRatedDoctorsResult,
  TopSpecialtiesResult,
} from "@/features/admin-analytics/types/admin-analytics.types";

/**
 * Unwraps the `{ code, message, data }` envelope and returns the metric payload,
 * consistent with adminAppointmentLifecycleService.
 */
export const adminAnalyticsService = {
  async getTopSpecialties(query: AnalyticsQuery = {}): Promise<TopSpecialtiesResult> {
    const res = await getTopSpecialties(query);
    return res.data;
  },

  async getTopDoctors(query: AnalyticsQuery = {}): Promise<TopDoctorsResult> {
    const res = await getTopDoctors(query);
    return res.data;
  },

  async getTopRatedDoctors(query: AnalyticsQuery = {}): Promise<TopRatedDoctorsResult> {
    const res = await getTopRatedDoctors(query);
    return res.data;
  },

  async getFrequentPatients(query: AnalyticsQuery = {}): Promise<FrequentPatientsResult> {
    const res = await getFrequentPatients(query);
    return res.data;
  },

  async getRevenue(query: AnalyticsQuery = {}): Promise<RevenueResult> {
    const res = await fetchRevenue(query);
    return res.data;
  },

  async getDoctorReviews(doctorId: string): Promise<DoctorReviewDetail[]> {
    const res = await getReviewsByDoctor(doctorId, { page: 1, limit: 100 });
    const payload = res?.data;

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;

    return [];
  },
};
