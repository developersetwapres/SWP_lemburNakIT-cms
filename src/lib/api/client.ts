import axios from "axios";
import { ApiError, normalizeApiError } from "./errors";

function apiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!value) throw new ApiError("NEXT_PUBLIC_API_URL is required.", "configuration");
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) throw new Error();
    return url.origin;
  } catch {
    throw new ApiError("NEXT_PUBLIC_API_URL must be a Laravel origin without credentials, path or query.", "configuration");
  }
}

/** Browser session client. Server Components must not share this cookie-based client. */
export const apiClient = axios.create({
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 30_000,
  headers: { Accept: "application/json", "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
});
apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") throw new ApiError("The session API client must be called in the browser.", "configuration");
  if (!config.url?.startsWith("/") || config.url.startsWith("//") || config.url.includes("\\")) {
    throw new ApiError("Use a relative API endpoint beginning with a single slash.", "configuration");
  }
  config.baseURL = apiBaseUrl();
  return config;
});
apiClient.interceptors.response.use((response) => response, (error: unknown) => Promise.reject(normalizeApiError(error)));
