import axiosClient from "@/lib/axiosClient";
import { DataResponse } from "@/types/apiDTO";

export interface ReviewPayload {
  doctorId: string;
  appointmentId: string;
  rating: number;
  comment?: string;
}

export interface ReviewDto {
  _id: string;
  doctorId?: string | { _id: string; doctorName?: string };
  patientId?: string | { _id: string; profileId?: { _id?: string; name?: string | null } };
  appointmentId?: string | { _id?: string };
  rating?: number;
  comment?: string | null;
  createdAt?: string | number | null;
}

export type ReviewListPayload = ReviewDto[] | { items?: ReviewDto[]; data?: ReviewDto[] };

export interface ReviewListParams {
  page?: number;
  limit?: number;
}

export const createReview = async (reviewData: ReviewPayload) => {
  try {
    const res = await axiosClient.post<DataResponse<ReviewDto>>("/reviews", reviewData);
    console.log("[Axios] Create review:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to create review:", error);
  }
};

export const getReviewByAppointmentAndPatient = async (
  appointmentId: string,
  patientId: string
) => {
  try {
    const res = await axiosClient.get<DataResponse<ReviewDto | null>>(
      "/reviews/by-appointment-patient",
      {
        params: { appointmentId, patientId },
      }
    );
    console.log("[Axios] Get review by appointment & patient:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to get review:", error);
  }
};

export const getAllReviews = async () => {
  try {
    const res = await axiosClient.get<DataResponse<ReviewListPayload>>("/reviews");
    console.log("[Axios] Get all reviews:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to get all reviews:", error);
  }
};

export const getReviewsByDoctor = async (doctorId: string, params: ReviewListParams = {}) => {
  try {
    const res = await axiosClient.get<DataResponse<ReviewListPayload>>(`/reviews/doctor/${doctorId}`, {
      params,
    });
    console.log("[Axios] Get reviews by doctor:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to get reviews by doctor:", error);
    throw error;
  }
};

export const deleteReview = async (id: string) => {
  try {
    const res = await axiosClient.delete<DataResponse<ReviewDto>>(`/reviews/${id}`);
    console.log("[Axios] Delete review:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to delete review:", error);
    throw error;
  }
};



