import axiosClient from "@/lib/axiosClient";

/**
 * PII-scoped admin patient row (req-5). The endpoint returns ONLY these fields;
 * `accountId` is a plain string handle used for the status toggle
 * (`PATCH /users/:id/status`). See api-contract/README_ADMIN_PATIENT_LIST.md.
 */
export interface AdminPatientListItem {
  name: string | null;
  status: "ACTIVE" | "INACTIVE" | null;
  accountId: string | null;
}

export interface AdminPatientListResponse {
  code: string | number;
  message: string;
  data: AdminPatientListItem[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export const getPatientsAdmin = async (params: {
  page?: number;
  limit?: number;
  keyword?: string;
}): Promise<AdminPatientListResponse> => {
  try {
    const res = await axiosClient.get<AdminPatientListResponse>("/patients/admin", {
      params,
    });

    console.log("[Axios] Get patients admin:", res.data);
    return res.data;
  } catch (e) {
    try {
      const err: any = e;
      if (err?.response) {
        console.error("Failed to fetch patients admin - response:", err.response.status, err.response.data);
      } else if (err?.request) {
        console.error("Failed to fetch patients admin - no response:", err.request);
      } else {
        console.error("Failed to fetch patients admin - error:", err.message || err);
      }
    } catch (logErr) {
      console.error("Error logging fetch patients admin error", logErr);
    }
    throw e;
  }
};
