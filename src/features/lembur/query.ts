import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { authView } from "@/lib/auth/access";
import type { AuthState } from "@/lib/auth/store";
import { getLemburList } from "./api";
import type { LemburRequest } from "./filters";

export function lemburQueryOptions(auth: AuthState, filters: LemburRequest) {
  return queryOptions({
    queryKey: ["admin", "lembur", auth.user?.id ?? null, filters],
    queryFn: ({ signal }) => getLemburList(filters, signal),
    enabled: authView(auth, "admin") === "admin",
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
