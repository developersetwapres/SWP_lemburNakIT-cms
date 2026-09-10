import axios from "axios";

export type ApiErrorKind =
  | "unauthorized" | "forbidden" | "not_found" | "csrf"
  | "validation" | "password_confirmation" | "rate_limited"
  | "server" | "network" | "cancelled" | "configuration" | "contract" | "unknown";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
    public readonly status: number | null = null,
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isCancel(error)) return new ApiError("Request cancelled.", "cancelled");
  if (!axios.isAxiosError(error)) return new ApiError("An unexpected error occurred.", "unknown");
  const status = error.response?.status ?? null;
  const kinds: Record<number, ApiErrorKind> = {
    401: "unauthorized", 403: "forbidden", 404: "not_found", 419: "csrf",
    422: "validation", 423: "password_confirmation", 429: "rate_limited",
  };
  const kind = status === null ? "network" : status >= 500 ? "server" : kinds[status] ?? "unknown";
  const body: unknown = error.response?.data;
  const fields: Record<string, string[]> = Object.create(null);
  let message = status === null ? "Unable to reach the API." : `API request failed (${status}).`;
  if (body && typeof body === "object") {
    const payload = body as Record<string, unknown>;
    if (typeof payload.message === "string") message = payload.message;
    if (payload.errors && typeof payload.errors === "object" && !Array.isArray(payload.errors)) {
      for (const [field, value] of Object.entries(payload.errors)) {
        if (typeof value === "string") fields[field] = [value];
        else if (Array.isArray(value)) fields[field] = value.filter((item): item is string => typeof item === "string");
      }
    } else if (Array.isArray(payload.errors)) {
      const first = payload.errors.find((item) => item && typeof item === "object");
      if (typeof first?.detail === "string") message = first.detail;
      else if (typeof first?.title === "string") message = first.title;
    }
  }
  // Do not retain Axios config: it can contain a submitted password or OTP.
  return new ApiError(message, kind, status, fields);
}
