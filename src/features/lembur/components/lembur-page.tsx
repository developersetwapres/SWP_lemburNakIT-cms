"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/provider";
import { authView } from "@/lib/auth/access";
import { normalizeApiError } from "@/lib/api/errors";
import { hasActiveLemburFilters, lemburUrl, parseLemburSearchParams, resetLemburUrl, type LemburFilterInput } from "../filters";
import { lemburQueryOptions } from "../query";
import { LemburFilters } from "./filters";
import { LemburPagination } from "./list";
import { BulkLockPanel } from "./bulk-lock-panel";
import { LemburEmpty, LemburError, LemburLoading } from "./states";
import { lemburSelectionScope } from "../selection";
import { lemburReturnTo } from "../navigation";
import { ExportLemburButton } from "./export-button";

export function LemburHeading() {
  return <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Administrasi lembur</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Data lembur</h1><p className="mt-2 text-sm text-muted-foreground">Cari berdasarkan kegiatan atau lokasi, lalu persempit daftar dengan periode dan status.</p></div>;
}

export function LemburActionFeedback({ deleted, bulkSuccess }: { deleted: boolean; bulkSuccess: string | null }) {
  return <>{deleted && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">Data lembur berhasil dihapus.</p>}{bulkSuccess && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{bulkSuccess}</p>}</>;
}

export function LemburPage() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const currentUrl = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const returnTo = lemburReturnTo(pathname, new URLSearchParams(searchParams.toString()));
  const filters = useMemo(() => parseLemburSearchParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const query = useQuery(lemburQueryOptions(auth, filters));
  if (authView(auth, "admin") !== "admin") return null;
  const error = query.error ? normalizeApiError(query.error) : null;
  const list = query.data;
  const applied = !query.isPlaceholderData && list ? list.filters : filters;
  const initial: LemburFilterInput = { bulan: applied.bulan, pegawai: applied.pegawai ?? undefined, status: applied.status, jenis_hari: applied.jenis_hari, search: applied.search };
  const navigate = (href: string) => { setBulkSuccess(null); if (currentUrl !== href) router.push(href, { scroll: false }); };
  const reset = () => navigate(resetLemburUrl());
  const retry = () => {
    if (error?.kind === "unauthorized" || error?.kind === "csrf") void auth.refresh().catch(() => {});
    else void query.refetch();
  };
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><LemburHeading /><ExportLemburButton filters={filters} /></div>
    <LemburActionFeedback deleted={searchParams.get("notice") === "deleted"} bulkSuccess={bulkSuccess} />
    <LemburFilters key={JSON.stringify(initial)} initial={initial} options={list?.pegawaiOptions ?? []} disabled={query.isFetching && !query.isPlaceholderData} onApply={(values) => navigate(lemburUrl(filters, values))} onReset={reset} />
    {error ? <LemburError error={error} retry={retry} busy={query.isFetching} /> : query.isPending ? <LemburLoading /> : list && (list.rows.length === 0 ? <LemburEmpty filtered={hasActiveLemburFilters(filters)} onReset={reset} /> : <><BulkLockPanel key={lemburSelectionScope(list.rows, JSON.stringify(filters))} list={list} updating={query.isFetching} returnTo={returnTo} onSuccess={setBulkSuccess} /><LemburPagination pagination={list.pagination} disabled={query.isFetching} onPage={(page) => navigate(lemburUrl(filters, { page }))} /></>)}
  </div>;
}
