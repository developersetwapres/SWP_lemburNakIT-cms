import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { authView } from "@/lib/auth/access";
import type { AuthState } from "@/lib/auth/store";
import { getLemburDetail, getLemburList } from "./api";
import type { LemburRequest } from "./filters";

export const lemburListQueryPrefix = (userId: string | null) => ["admin", "lembur", "list", userId] as const;
export const lemburListQueryKey = (userId: string | null, filters: LemburRequest) => [...lemburListQueryPrefix(userId), filters] as const;
export const lemburDetailQueryKey = (userId: string | null, uuid: string) => ["admin", "lembur", "detail", userId, uuid] as const;

export function lemburQueryOptions(auth: AuthState, filters: LemburRequest) {
  return queryOptions({
    queryKey: lemburListQueryKey(auth.user?.id ?? null, filters),
    queryFn: ({ signal }) => getLemburList(filters, signal),
    enabled: authView(auth, "admin") === "admin",
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function lemburDetailQueryOptions(auth: AuthState, uuid: string) {
  return queryOptions({
    queryKey: lemburDetailQueryKey(auth.user?.id ?? null, uuid),
    queryFn: ({ signal }) => getLemburDetail(uuid, signal),
    enabled: Boolean(uuid) && authView(auth, "admin") === "admin",
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export async function invalidateLemburAfterLock(queryClient: QueryClient, userId: string | null, uuid: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: lemburDetailQueryKey(userId, uuid), exact: true }),
    queryClient.invalidateQueries({ queryKey: lemburListQueryPrefix(userId) }),
  ]);
}
