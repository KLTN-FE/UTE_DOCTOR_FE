import axiosClient from "@/lib/axiosClient";
import { DataResponse } from "@/types/apiDTO";
import {
  AnalyticsQuery,
  FrequentPatientsResult,
  TopDoctorsResult,
  TopRatedDoctorsResult,
  TopSpecialtiesResult,
} from "@/features/admin-analytics/types/admin-analytics.types";

const buildParams = (query: AnalyticsQuery) => ({
  from: query.from ?? undefined,
  to: query.to ?? undefined,
  limit: query.limit ?? undefined,
});

export const getTopSpecialties = async (query: AnalyticsQuery = {}) => {
  const res = await axiosClient.get<DataResponse<TopSpecialtiesResult>>(
    "/admin/analytics/top-specialties",
    { params: buildParams(query) }
  );
  return res.data;
};

export const getTopDoctors = async (query: AnalyticsQuery = {}) => {
  const res = await axiosClient.get<DataResponse<TopDoctorsResult>>(
    "/admin/analytics/top-doctors",
    { params: buildParams(query) }
  );
  return res.data;
};

export const getTopRatedDoctors = async (query: AnalyticsQuery = {}) => {
  const res = await axiosClient.get<DataResponse<TopRatedDoctorsResult>>(
    "/admin/analytics/top-rated-doctors",
    { params: buildParams(query) }
  );
  return res.data;
};

export const getFrequentPatients = async (query: AnalyticsQuery = {}) => {
  const res = await axiosClient.get<DataResponse<FrequentPatientsResult>>(
    "/admin/analytics/frequent-patients",
    { params: buildParams(query) }
  );
  return res.data;
};
