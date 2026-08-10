import { isAxiosError } from "axios";

import type { ApiEnvelope } from "@/types/auth";

// Normalizes both network failures and the backend's structured
// { success: false, error } responses into a single Error whose message
// is safe to show the user directly. Shared across every API service
// (auth, device, registration, ...) so this logic lives in one place.
export function toUserFacingError(err: unknown): Error {
  if (isAxiosError<ApiEnvelope<unknown>>(err)) {
    const message = err.response?.data?.error;
    if (message) return new Error(message);
    if (err.code === "ERR_NETWORK") {
      return new Error("Unable to reach the server. Please check your connection.");
    }
  }
  return new Error("Something went wrong. Please try again.");
}
