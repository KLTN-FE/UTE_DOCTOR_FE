import axiosClient from "@/lib/axiosClient";
import { DataResponse } from "@/types/apiDTO";

export const createDoctorPost = async (postData: {
  title?: string;
  description?: string;
  file: File;
}) => {
  try {
    const formData = new FormData();
    if (postData.title) formData.append("title", postData.title);
    if (postData.description)
      formData.append("description", postData.description);
    formData.append("file", postData.file);

    const res = await axiosClient.post<DataResponse<any>>(
      "/doctor-posts",
      formData
    );

    console.log("[Axios] Create doctor post:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to create doctor post:", error);
    throw error;
  }
};

export const getAllDoctorPosts = async (params?: {
  page?: number;
  limit?: number;
}) => {
  try {
    const res = await axiosClient.get<DataResponse<any>>(
      "/doctor-posts",
      { params }
    );

    console.log("[Axios] Get all doctor posts:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to get doctor posts:", error);
  }
};

export const getDoctorPostsByDoctor = async (
  doctorId: string,
  params?: {
    page?: number;
    limit?: number;
  }
) => {
  try {
    const res = await axiosClient.get<DataResponse<any>>(
      `/doctor-posts/doctor/${doctorId}`,
      { params }
    );

    console.log("[Axios] Get doctor posts by doctor:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to get doctor posts by doctor:", error);
  }
};

export const getDoctorPostById = async (id: string) => {
  try {
    const res = await axiosClient.get<DataResponse<any>>(
      `/doctor-posts/${id}`
    );

    console.log("[Axios] Get doctor post detail:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to get doctor post detail:", error);
  }
};

export const updateDoctorPost = async (
  id: string,
  postData: {
    title?: string;
    description?: string;
    file?: File;
  }
) => {
  try {
    const formData = new FormData();
    if (postData.title) formData.append("title", postData.title);
    if (postData.description)
      formData.append("description", postData.description);
    if (postData.file) formData.append("file", postData.file);

    const res = await axiosClient.put<DataResponse<any>>(
      `/doctor-posts/${id}`,
      formData
    );

    console.log("[Axios] Update doctor post:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to update doctor post:", error);
    throw error;
  }
};

export const deleteDoctorPost = async (id: string) => {
  try {
    const res = await axiosClient.delete<DataResponse<any>>(
      `/doctor-posts/${id}`
    );

    console.log("[Axios] Delete doctor post:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to delete doctor post:", error);
    throw error;
  }
};

export const increaseDoctorPostView = async (id: string) => {
  try {
    const res = await axiosClient.post<DataResponse<any>>(
      `/doctor-posts/${id}/view`
    );

    console.log("[Axios] Increase view:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to increase view:", error);
  }
};

export const updateDoctorPostStatus = async (
  id: string,
  status: "ACTIVE" | "HIDDEN"
) => {
  try {
    const res = await axiosClient.patch<DataResponse<any>>(
      `/doctor-posts/${id}/status`,
      { status }
    );

    console.log("[Axios] Update post status:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to update post status:", error);
    throw error;
  }
};

