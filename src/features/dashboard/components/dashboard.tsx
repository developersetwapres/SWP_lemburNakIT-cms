"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/provider";
import { normalizeApiError } from "@/lib/api/errors";
import { authView } from "@/lib/auth/access";
import { periodPattern } from "../api";
import { dashboardQueryOptions } from "../query";
import { DashboardSummaryContent, periodLabel } from "./summary";
import { DashboardError, DashboardLoading } from "./states";

export function Dashboard() {
  const auth = useAuth();
  const [bulan, setBulan] = useState<string>();
  const query = useQuery(dashboardQueryOptions(auth, bulan));
  if (authView(auth, "admin") !== "admin") return null;
  const error = query.error ? normalizeApiError(query.error) : null;
  const summary = query.data;
  const period = summary?.bulan ?? bulan;
  const retry = () => {
    if (error?.kind === "unauthorized" || error?.kind === "csrf") {
      // Refresh clears the cache and lets the existing access gate decide the next screen.
      void auth.refresh().catch(() => { /* AuthScreen shows provider errors. */ });
    } else { void query.refetch(); }
  };
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ringkasan operasional</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Dashboard lembur</h1><p className="mt-2 text-sm text-muted-foreground">{period ? `Periode ${periodLabel(period)}. ` : ""}Hanya record berstatus complete; record locked tidak termasuk.</p></div>
      {period && <label className="flex shrink-0 items-center gap-3 text-sm"><span>Periode</span><input aria-label="Periode statistik" type="month" value={bulan ?? period} onChange={(event) => { if (periodPattern.test(event.target.value)) setBulan(event.target.value); }} className="h-11 min-w-0 rounded-lg border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>}
    </div>
    {error ? <DashboardError error={error} retry={retry} busy={query.isFetching} /> : query.isPending ? <DashboardLoading /> : summary && <DashboardSummaryContent summary={summary} />}
  </div>;
}
