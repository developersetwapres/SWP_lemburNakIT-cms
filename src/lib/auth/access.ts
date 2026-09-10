import type { AuthState } from "./store";

export type AuthOperation = "login" | "challenge" | "logout" | "refresh" | null;
export type AuthView = "loading" | "login" | "challenge" | "denied" | "error" | "admin" | "redirect_admin" | "redirect_login";

/** Presentation decision only. Backend authorization remains authoritative. */
export function authView(state: AuthState, entry: "login" | "admin", operation: AuthOperation = null): AuthView {
  if (state.status === "loading") {
    if (entry === "login" && operation === "login") return "login";
    if (entry === "login" && operation === "challenge") return "challenge";
    return "loading";
  }
  if (state.error?.kind === "forbidden") return "denied";
  if (state.status === "error") return "error";
  if (state.status === "authenticated") {
    if (!state.user || state.canAccessAdminPanel !== true) return "denied";
    return entry === "admin" ? "admin" : "redirect_admin";
  }
  if (entry === "admin") return "redirect_login";
  return state.status === "requires_2fa" ? "challenge" : "login";
}
