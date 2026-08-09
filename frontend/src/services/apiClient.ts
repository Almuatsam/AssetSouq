import axios, { isAxiosError } from "axios";

import { clearStoredSession, getStoredSession } from "@/utils/authStorage";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
});

apiClient.interceptors.request.use((config) => {
  const session = getStoredSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

// The login endpoints' own 401s ("invalid staff ID"/"invalid credentials")
// are expected and handled inline by the login forms — only a 401 from an
// *authenticated* request means the stored session itself is invalid/
// expired, in which case there's no in-page way to recover, so clear it
// and send the user back to choose a login again.
const LOGIN_PATHS = ["/auth/employee/login", "/auth/admin/login"];

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isExpiredSession =
      isAxiosError(error) &&
      error.response?.status === 401 &&
      !LOGIN_PATHS.some((path) => error.config?.url?.includes(path));

    if (isExpiredSession) {
      clearStoredSession();
      window.location.assign("/");
    }

    return Promise.reject(error);
  },
);
