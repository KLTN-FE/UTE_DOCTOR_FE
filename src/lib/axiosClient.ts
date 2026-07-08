import { refreshAccessToken } from "@/lib/authRefresh";
import {
  clearAuthTokens,
  emitAuthLogout,
  getAccessToken,
} from "@/lib/authTokenStore";
import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag để tránh retry nhiều request cùng lúc trong khi refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token || "");
    }
  });

  failedQueue = [];
};

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Khi có response từ server
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        const originalRequest = error.config;

        // Tránh refresh token cho chính request refresh token
        // originalRequest.url may be full or relative; check includes to be robust
        if (originalRequest.url && originalRequest.url.includes("/auth/refresh")) {
          console.error("Refresh token expired or invalid, redirecting to login");
          if (typeof window !== "undefined") {
            clearAuthTokens();
            emitAuthLogout();
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }

        // Nếu đang refresh, thêm request vào queue
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        // Bắt đầu refresh
        isRefreshing = true;

        try {
          if (typeof window !== "undefined") {
            const newAccessToken = await refreshAccessToken();

            axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            processQueue(null, newAccessToken);
            return axiosClient(originalRequest);
          }
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError);
          processQueue(refreshError, null);

          if (typeof window !== "undefined") {
            clearAuthTokens();
            emitAuthLogout();
            alert("Session hết hạn, vui lòng đăng nhập lại.");
            window.location.replace("/login");
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else if (status === 403) {
        console.warn("Forbidden:", data?.message || "No permission");
      } else if (status >= 500) {
        console.error("Server error:", status, data?.message);
      }
    } else if (error.request) {
      // Khi không có phản hồi từ server (mạng lỗi)
      console.error("Network error: No response from server");
    } else {
      // Lỗi khác (config, timeout,...)
      console.error("Axios setup error:", error.message);
    }

    return Promise.reject(error); // luôn reject để nơi gọi có thể xử lý
  }
);

export default axiosClient;

