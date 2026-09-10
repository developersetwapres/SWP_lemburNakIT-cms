import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { authView } from "@/lib/auth/access";
import type { AuthState } from "@/lib/auth/store";
import { getPasswordConfirmationStatus, getProfile, getSecuritySettings } from "./api";

export const profileKey = (userId: string | null) => ["admin", "settings", "profile", userId] as const;
export const passwordConfirmationKey = (userId: string | null) => ["admin", "settings", "password-confirmation", userId] as const;
export const securityKey = (userId: string | null) => ["admin", "settings", "security", userId] as const;
export const settingsQueryEnabled = (auth: AuthState) => authView(auth, "admin") === "admin";

const passive = { retry: false as const, refetchOnWindowFocus: false as const, refetchOnReconnect: false as const };
export function profileOptions(auth: AuthState) {
  return queryOptions({ queryKey: profileKey(auth.user?.id ?? null), queryFn: ({ signal }) => getProfile(signal), enabled: settingsQueryEnabled(auth), ...passive });
}
export function passwordConfirmationOptions(auth: AuthState) {
  return queryOptions({ queryKey: passwordConfirmationKey(auth.user?.id ?? null), queryFn: getPasswordConfirmationStatus, enabled: settingsQueryEnabled(auth), staleTime: Infinity, ...passive });
}
export function securityOptions(auth: AuthState, confirmed: boolean) {
  return queryOptions({ queryKey: securityKey(auth.user?.id ?? null), queryFn: ({ signal }) => getSecuritySettings(signal), enabled: settingsQueryEnabled(auth) && confirmed, staleTime: Infinity, refetchOnMount: false, ...passive });
}
export async function invalidateProfile(queryClient: QueryClient, userId: string | null) {
  await queryClient.invalidateQueries({ queryKey: profileKey(userId), exact: true });
}
