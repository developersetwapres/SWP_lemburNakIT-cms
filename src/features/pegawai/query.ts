import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { authView } from "@/lib/auth/access";
import type { AuthState } from "@/lib/auth/store";
import { getPegawaiDetail, getPegawaiHistory, getPegawaiList } from "./api";
import type { PegawaiHistoryRequest, PegawaiListRequest } from "./filters";

export const pegawaiListPrefix = (userId: string | null) => ["admin", "pegawai", "list", userId] as const;
export const pegawaiListKey = (userId: string | null, filters: PegawaiListRequest) => [...pegawaiListPrefix(userId), filters] as const;
export const pegawaiDetailKey = (userId: string | null, uuid: string) => ["admin", "pegawai", "detail", userId, uuid] as const;
export const pegawaiHistoryPrefix = (userId: string | null, uuid: string) => ["admin", "pegawai", "lembur", userId, uuid] as const;
export const pegawaiHistoryKey = (userId: string | null, uuid: string, filters: PegawaiHistoryRequest) => [...pegawaiHistoryPrefix(userId, uuid), filters] as const;
export const pegawaiQueryEnabled = (auth: AuthState) => authView(auth, "admin") === "admin";

export function pegawaiListOptions(auth: AuthState, filters: PegawaiListRequest) {
  return queryOptions({ queryKey: pegawaiListKey(auth.user?.id ?? null, filters), queryFn: ({ signal }) => getPegawaiList(filters, signal), enabled: pegawaiQueryEnabled(auth), placeholderData: keepPreviousData, retry: false, refetchOnWindowFocus: false });
}
export function pegawaiDetailOptions(auth: AuthState, uuid: string) {
  return queryOptions({ queryKey: pegawaiDetailKey(auth.user?.id ?? null, uuid), queryFn: ({ signal }) => getPegawaiDetail(uuid, signal), enabled: Boolean(uuid) && pegawaiQueryEnabled(auth), retry: false, refetchOnWindowFocus: false });
}
export function pegawaiHistoryOptions(auth: AuthState, uuid: string, filters: PegawaiHistoryRequest) {
  return queryOptions({ queryKey: pegawaiHistoryKey(auth.user?.id ?? null, uuid, filters), queryFn: ({ signal }) => getPegawaiHistory(uuid, filters, signal), enabled: Boolean(uuid) && pegawaiQueryEnabled(auth), placeholderData: keepPreviousData, retry: false, refetchOnWindowFocus: false });
}
export async function invalidatePegawaiAfterUpdate(queryClient: QueryClient, userId: string | null, uuid: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: pegawaiListPrefix(userId) }),
    queryClient.invalidateQueries({ queryKey: pegawaiDetailKey(userId, uuid), exact: true }),
    queryClient.invalidateQueries({ queryKey: pegawaiHistoryPrefix(userId, uuid) }),
  ]);
}
