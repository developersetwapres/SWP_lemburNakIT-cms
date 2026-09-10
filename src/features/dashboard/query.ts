import { queryOptions } from "@tanstack/react-query";
import { authView } from "@/lib/auth/access";
import type { AuthState } from "@/lib/auth/store";
import { getDashboard } from "./api";

export function dashboardQueryOptions(auth: AuthState, bulan?: string) {
  return queryOptions({
    queryKey: ["admin", "dashboard", auth.user?.id ?? null, bulan ?? null],
    queryFn: ({ signal }) => getDashboard(bulan, signal),
    enabled: authView(auth, "admin") === "admin",
    retry: false,
    refetchOnWindowFocus: false,
  });
}
