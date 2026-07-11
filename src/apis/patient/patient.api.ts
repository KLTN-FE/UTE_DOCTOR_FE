import axiosClient from "@/lib/axiosClient";
import { DataResponse } from "@/types/apiDTO";

export interface Patient {
  _id: string;
  profileId: any;
  accountId: string;
  height?: number;
  weight?: number;
  bloodType?: string;
  medicalRecord?: any;
}

export const getPatientByAccount = async (
  accountId: string
): Promise<DataResponse<Patient>> => {
  try {
    const res = await axiosClient.get<DataResponse<Patient>>(
      `/patients/by-account/${accountId}`
    );

    return res.data;
  } catch (error) {
    console.error("Failed to fetch patient by account:", error);
    throw error;
  }
};

export const getPatientProfile = async (
  patientId: string
): Promise<DataResponse<Patient> | null> => {
  // Try the most specific endpoint first; if backend uses a different
  // route we attempt sensible fallbacks and return null on 404 (not found).
  const candidates = [`/patients/profile/${patientId}`, `/patients/${patientId}`];

  for (const path of candidates) {
    try {
      const res = await axiosClient.get<DataResponse<Patient>>(path);
      return res.data;
    } catch (error: any) {
      // If not found, try next candidate. Otherwise rethrow so caller can handle auth/server errors.
      if (error?.response?.status === 404) {
        console.debug(`getPatientProfile: ${path} returned 404, trying next fallback`);
        continue;
      }
      console.error(`Failed to fetch patient profile (${path}):`, error);
      throw error;
    }
  }

  // Final attempt: try `/patients/me` with id as query param (some backends expose this)
  try {
    const res = await axiosClient.get<DataResponse<Patient>>(`/patients/me`, { params: { id: patientId } });
    return res.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.debug('getPatientProfile: no patient profile found for id', patientId);
      return null;
    }
    console.error('Failed to fetch patient profile (/patients/me):', error);
    throw error;
  }
};

// --- New medical record APIs ---

export interface MedicalProfilePayload {
  height?: number;
  weight?: number;
  bloodType?: string;
  createdByRole?: string;
  createdByAccountId?: string;
}

export interface AllergyPayload {
  type: "DRUG" | "FOOD";
  substance: string;
  reaction?: string;
  severity?: string;
  reportedBy?: "PATIENT" | "DOCTOR";
  createdByRole?: string;
  createdByAccountId?: string;
}

export interface MedicalHistoryPayload {
  conditionName: string;
  diagnosisCode?: string;
  diagnosedAt?: string | Date;
  status?: "ONGOING" | "RESOLVED";
  source?: "PATIENT" | "DOCTOR";
  verifiedByDoctor?: boolean;
  createdByRole?: string;
  createdByAccountId?: string;
}

export const upsertMedicalProfile = async (patientId: string, payload: MedicalProfilePayload) => {
  const res = await axiosClient.post(`/patients/${patientId}/medical-profile`, payload);
  return res.data;
};

export const createAllergyRecord = async (patientId: string, payload: AllergyPayload) => {
  const res = await axiosClient.post(`/patients/${patientId}/allergies`, payload);
  return res.data;
};

export const createMedicalHistoryRecord = async (patientId: string, payload: MedicalHistoryPayload) => {
  const res = await axiosClient.post(`/patients/${patientId}/medical-history`, payload);
  return res.data;
};
