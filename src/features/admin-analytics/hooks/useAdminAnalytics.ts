"use client";

import { useCallback, useEffect, useState } from "react";

import { adminAnalyticsService } from "@/features/admin-analytics/services/adminAnalyticsService";
import {
  DoctorReviewDetail,
  FrequentPatientsResult,
  TopDoctorsResult,
  TopRatedDoctorsResult,
  TopRatedDoctorItem,
  TopSpecialtiesResult,
} from "@/features/admin-analytics/types/admin-analytics.types";

export interface MetricState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface VolumeRange {
  from?: number;
  to?: number;
}

const INITIAL = <T>(): MetricState<T> => ({ data: null, loading: true, error: null });

export const getErrorMessage = (error: unknown): string => {
  const apiError = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };
  if (apiError?.response?.status === 403) {
    return apiError.response.data?.message || "Only admins can view analytics.";
  }
  return apiError?.response?.data?.message || apiError?.message || "Unable to load metric.";
};

export const useAdminAnalytics = () => {
  const [limit, setLimit] = useState(5);
  // Optional override applied ONLY to the scheduledAt-windowed metrics
  // (top-specialties, top-doctors, frequent-patients) — never to top-rated-doctors.
  const [volumeRange, setVolumeRange] = useState<VolumeRange>({});

  const [topSpecialties, setTopSpecialties] = useState<MetricState<TopSpecialtiesResult>>(INITIAL);
  const [topDoctors, setTopDoctors] = useState<MetricState<TopDoctorsResult>>(INITIAL);
  const [topRatedDoctors, setTopRatedDoctors] = useState<MetricState<TopRatedDoctorsResult>>(INITIAL);
  const [frequentPatients, setFrequentPatients] = useState<MetricState<FrequentPatientsResult>>(INITIAL);
  const [selectedRatedDoctor, setSelectedRatedDoctor] = useState<TopRatedDoctorItem | null>(null);
  const [doctorReviews, setDoctorReviews] = useState<MetricState<DoctorReviewDetail[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const load = useCallback(() => {
    let active = true;

    const run = async <T>(
      fetcher: () => Promise<T>,
      setState: React.Dispatch<React.SetStateAction<MetricState<T>>>
    ) => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const data = await fetcher();
        if (active) setState({ data, loading: false, error: null });
      } catch (error) {
        if (active) setState({ data: null, loading: false, error: getErrorMessage(error) });
      }
    };

    const volumeQuery = { from: volumeRange.from, to: volumeRange.to, limit };
    const ratedQuery = { limit };

    // Fetched independently — one failing metric must not blank the others.
    void run(() => adminAnalyticsService.getTopSpecialties(volumeQuery), setTopSpecialties);
    void run(() => adminAnalyticsService.getTopDoctors(volumeQuery), setTopDoctors);
    void run(() => adminAnalyticsService.getTopRatedDoctors(ratedQuery), setTopRatedDoctors);
    void run(() => adminAnalyticsService.getFrequentPatients(volumeQuery), setFrequentPatients);

    return () => {
      active = false;
    };
  }, [limit, volumeRange.from, volumeRange.to]);

  useEffect(() => load(), [load]);

  const hasVolumeOverride = volumeRange.from !== undefined || volumeRange.to !== undefined;

  const openDoctorReviews = useCallback(async (doctor: TopRatedDoctorItem) => {
    setSelectedRatedDoctor(doctor);
    setDoctorReviews({ data: [], loading: true, error: null });

    try {
      const reviews = await adminAnalyticsService.getDoctorReviews(doctor.doctorId);
      setDoctorReviews({ data: reviews, loading: false, error: null });
    } catch (error) {
      setDoctorReviews({
        data: [],
        loading: false,
        error: getErrorMessage(error),
      });
    }
  }, []);

  const closeDoctorReviews = useCallback(() => {
    setSelectedRatedDoctor(null);
    setDoctorReviews({ data: [], loading: false, error: null });
  }, []);

  return {
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
  };
};
