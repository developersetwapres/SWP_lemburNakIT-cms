import { ApiError, normalizeApiError } from "../api/errors";
import { authService, type FrontendContext, type LoginPayload, type TwoFactorPayload } from "./service";

type AuthStatus = "loading" | "guest" | "authenticated" | "requires_2fa" | "error";
export type AuthState = {
  status: AuthStatus;
  context: FrontendContext | null;
  user: FrontendContext["auth"]["user"];
  canAccessAdminPanel: boolean;
  error: ApiError | null;
};
const emptyState = (status: AuthStatus, error: ApiError | null = null): AuthState => ({
  status, context: null, user: null, canAccessAdminPanel: false, error,
});

/** Per-provider store; no authenticated singleton shared between SSR requests. */
export function createAuthStore(onSessionChange: () => void = () => {}) {
  let state = emptyState("loading");
  let initialized = false;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: AuthState) => { state = next; listeners.forEach((listener) => listener()); };
  const readContext = async () => {
    const context = await authService.getFrontendContext();
    publish({ status: context.auth.user ? "authenticated" : "guest", context,
      user: context.auth.user, canAccessAdminPanel: context.canAccessAdminPanel, error: null });
  };
  const run = (operation: () => Promise<void>, failure: () => AuthState) => {
    pending = Promise.resolve().then(operation).catch((cause: unknown) => {
      const error = normalizeApiError(cause);
      if (error.kind === "unauthorized" || error.kind === "csrf") {
        onSessionChange();
        publish(emptyState("guest", error));
      } else publish({ ...failure(), error });
      throw error;
    }).finally(() => { pending = null; });
    publish(emptyState("loading"));
    return pending;
  };
  const requireIdle = () => {
    if (!initialized || pending || state.status === "loading") throw new ApiError("Authentication is loading. Wait before starting another operation.", "unknown");
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    initialize(): Promise<void> {
      if (pending) return pending;
      if (initialized) return Promise.resolve();
      initialized = true;
      return run(readContext, () => emptyState("error"));
    },
    refresh(): Promise<void> {
      if (pending) return pending;
      // A guest context response must not erase a pending Fortify challenge.
      if (state.status === "requires_2fa") return Promise.resolve();
      initialized = true;
      return run(async () => { onSessionChange(); await readContext(); }, () => emptyState("error"));
    },
    async login(payload: LoginPayload): Promise<void> {
      requireIdle();
      if (state.status === "authenticated" || state.status === "requires_2fa") throw new ApiError("Finish the current authentication flow first.", "unknown");
      let completed = false;
      return run(async () => {
        onSessionChange();
        const result = await authService.login(payload);
        if (result.two_factor) publish(emptyState("requires_2fa"));
        else { completed = true; await readContext(); }
      }, () => emptyState(completed ? "error" : "guest"));
    },
    async challenge(payload: TwoFactorPayload): Promise<void> {
      requireIdle();
      if (state.status !== "requires_2fa") throw new ApiError("No pending two-factor challenge.", "unknown");
      let completed = false;
      return run(async () => {
        await authService.challengeTwoFactor(payload);
        completed = true;
        onSessionChange();
        await readContext();
      }, () => emptyState(completed ? "error" : "requires_2fa"));
    },
    async logout(): Promise<void> {
      requireIdle();
      const previous = state;
      return run(async () => {
        try { await authService.logout(); } catch (cause) {
          if (normalizeApiError(cause).kind !== "unauthorized") throw cause;
        }
        onSessionChange();
        publish(emptyState("guest"));
      }, () => previous);
    },
  };
}
export type AuthStore = ReturnType<typeof createAuthStore>;
