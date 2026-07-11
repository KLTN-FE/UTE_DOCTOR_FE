import axiosClient from "@/lib/axiosClient";
import axios from "axios";
import { DataResponse } from "@/types/apiDTO";
import { Notification, NotificationMap, NotificationType } from "@/types/notification.dto";
import { PaginationQueryDto } from "@/types/pagination/pagination-query.dto";
import { PaginationResult } from "@/types/pagination/pagination-result.dto";

const notificationTypeAliasMap: Record<string, NotificationType> = {
  coin_expiry_reminder: "COIN_EXPIRY_REMINDER",
  wallet_expired: "COIN_EXPIRY_REMINDER",
  coin_expired: "COIN_EXPIRY_REMINDER",
  appointment_success: "APPOINTMENT_SUCCESS",
  appointment_booking_success: "APPOINTMENT_SUCCESS",
  appointment_cancelled: "APPOINTMENT_CANCELLED",
  appointment_no_show: "APPOINTMENT_NO_SHOW",
  appointment_rescheduled: "APPOINTMENT_RESCHEDULED",
  payment_success: "PAYMENT_SUCCESS",
  payment_update: "PAYMENT_SUCCESS",
  assignment_task_created: "ASSIGNMENT_TASK_CREATED",
  assignment_task_reminder: "ASSIGNMENT_TASK_REMINDER",
  assignment_task_expired: "ASSIGNMENT_TASK_EXPIRED",
  appointment_doctor_assigned: "APPOINTMENT_DOCTOR_ASSIGNED",
};

const knownNotificationTypes = new Set<NotificationType>([
  "COIN_EXPIRY_REMINDER",
  "APPOINTMENT_SUCCESS",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_NO_SHOW",
  "APPOINTMENT_RESCHEDULED",
  "PAYMENT_SUCCESS",
  "ASSIGNMENT_TASK_CREATED",
  "ASSIGNMENT_TASK_REMINDER",
  "ASSIGNMENT_TASK_EXPIRED",
  "APPOINTMENT_DOCTOR_ASSIGNED",
]);

const isKnownNotificationType = (value: unknown): value is NotificationType => {
  return typeof value === "string" && knownNotificationTypes.has(value as NotificationType);
};

const normalizeNotificationType = (notification: Notification): NotificationType | undefined => {
  const dataType =
    notification.data && typeof notification.data === "object"
      ? (notification.data as { type?: unknown }).type
      : undefined;
  const detailsType =
    notification.details && typeof notification.details === "object"
      ? (notification.details as { type?: unknown }).type
      : undefined;
  const templateType = notification.messageKey ?? notification.titleKey ?? notification.templateKey;

  const rawType = notification.type ?? dataType ?? detailsType ?? templateType;
  if (isKnownNotificationType(rawType)) {
    return rawType;
  }

  const normalizedKey = String(rawType ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return notificationTypeAliasMap[normalizedKey];
};

type NotificationDataNormalizerMap = {
  [K in NotificationType]: (data: NotificationMap[K]) => NotificationMap[K];
};

const normalizeDataDateValue = <T extends string | number | Date | null | undefined>(
  value: T
): T => {
  return value;
};

const notificationDataNormalizers: NotificationDataNormalizerMap = {
  COIN_EXPIRY_REMINDER: (data) => ({
    ...data,
    expiresAt: normalizeDataDateValue(data.expiresAt),
  }),
  APPOINTMENT_SUCCESS: (data) => ({
    ...data,
    date: normalizeDataDateValue(data.date),
  }),
  APPOINTMENT_CANCELLED: (data) => ({
    ...data,
    date: normalizeDataDateValue(data.date),
  }),
  APPOINTMENT_NO_SHOW: (data) => ({
    ...data,
    date: normalizeDataDateValue(data.date),
    noShowAt: normalizeDataDateValue(data.noShowAt),
  }),
  APPOINTMENT_RESCHEDULED: (data) => ({
    ...data,
    date: normalizeDataDateValue(data.date),
  }),
  PAYMENT_SUCCESS: (data) => data,
  // Assignment DTOs carry epoch-ms timestamps (deadlineAt / scheduledAt) consumed as numbers,
  // so they pass through unchanged — no string-date normalization.
  ASSIGNMENT_TASK_CREATED: (data) => data,
  ASSIGNMENT_TASK_REMINDER: (data) => data,
  ASSIGNMENT_TASK_EXPIRED: (data) => data,
  APPOINTMENT_DOCTOR_ASSIGNED: (data) => data,
};

const normalizeNotificationData = (
  type: NotificationType | undefined,
  data: Notification["data"]
): Notification["data"] => {
  if (!type || !data) {
    return data;
  }

  // Direct lookup keeps every NotificationType handled (the map is exhaustive over the union),
  // so new notification types are normalized without extending an if-chain.
  const normalizer = notificationDataNormalizers[type] as
    | ((value: Notification["data"]) => Notification["data"])
    | undefined;

  return normalizer ? normalizer(data) : data;
};

const normalizeNotificationDate = (notification: Notification): Notification => {
  const normalizedType = normalizeNotificationType(notification);
  const structuredData = notification.data ?? notification.details;

  return {
    ...notification,
    type: normalizedType ?? notification.type,
    data: normalizeNotificationData(normalizedType, structuredData as Notification["data"]),
  };
};

const isCanceledRequest = (error: unknown) => axios.isCancel(error);

/**
 * Lấy notification của user hiện tại (identity từ JWT) với phân trang.
 */
export const getNotificationsByEmail = async (
  pagination: PaginationQueryDto,
  options?: { signal?: AbortSignal }
): Promise<DataResponse<PaginationResult<Notification>> | undefined> => {
  try {
    const res = await axiosClient.get<DataResponse<PaginationResult<Notification>>>(
      "/notifications/by-email",
      {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
        signal: options?.signal,
      }
    );

    if (res.data?.data?.data) {
      res.data.data.data = res.data.data.data.map(normalizeNotificationDate);
    }

    console.log("[Axios] Get notifications by email:", res.data);
    return res.data;
  } catch (e) {
    if (isCanceledRequest(e)) {
      return;
    }

    console.error("Failed to fetch notifications by email:", e);
  }
};

export const getUnreadNotificationCount = async (
  options?: { signal?: AbortSignal }
): Promise<DataResponse<number> | undefined> => {
  try {
    const res = await axiosClient.get<DataResponse<number>>("/notifications/count", {
      params: {},
      signal: options?.signal,
    });
    console.log("[Axios] Get unread notification count:", res.data);
    return res.data;
  } catch (e) {
    if (isCanceledRequest(e)) {
      return;
    }

    console.error("Failed to fetch unread notification count:", e);
  }
};

export const markNotificationAsRead = async (id: string) => {
  try {
    const res = await axiosClient.patch<DataResponse<Notification>>(`/notifications/${id}/read`);

    if (res.data?.data) {
      res.data.data = normalizeNotificationDate(res.data.data);
    }

    return res.data;
  } catch (e) {
    console.error("Failed to mark notification as read:", e);
  }
};
