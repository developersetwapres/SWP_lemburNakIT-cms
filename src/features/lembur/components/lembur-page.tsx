"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/provider";
import { authView } from "@/lib/auth/access";
import { normalizeApiError } from "@/lib/api/errors";
import { hasActiveLemburFilters, lemburUrl, parseLemburSearchParams, resetLemburUrl, type LemburFilterInput } from "../filters";
import { lemburQueryOptions } from "../query";
import { LemburFilters } from "./filters";
import { LemburPagination, LemburTable } from "./list";
import { LemburEmpty, LemburError, LemburLoading } from "./states";

export function LemburHeading() {
  return <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Administrasi lembur</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Data lembur</h1><p className="mt-2 text-sm text-muted-foreground">Cari berdasarkan kegiatan atau lokasi, lalu persempit daftar dengan periode dan status.</p></div>;
}

export function LemburPage() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseLemburSearchParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const query = useQuery(lemburQueryOptions(auth, filters));
  if (authView(auth, "admin") !== "admin") return null;
  const error = query.error ? normalizeApiError(query.error) : null;
  const list = query.data;
  const applied = !query.isPlaceholderData && list ? list.filters : filters;
  const initial: LemburFilterInput = { bulan: applied.bulan, pegawai: applied.pegawai ?? undefined, status: applied.status, jenis_hari: applied.jenis_hari, search: applied.search };
  const navigate = (href: string) => { if (`${pathname}${searchParams.size ? `?${searchParams}` : ""}` !== href) router.push(href, { scroll: false }); };
  const reset = () => navigate(resetLemburUrl());
  const retry = () => {
    if (error?.kind === "unauthorized" || error?.kind === "csrf") void auth.refresh().catch(() => {});
    else void query.refetch();
  };
  return <div className="space-y-6">
    <LemburHeading />
    <LemburFilters key={JSON.stringify(initial)} initial={initial} options={list?.pegawaiOptions ?? []} disabled={query.isFetching && !query.isPlaceholderData} onApply={(values) => navigate(lemburUrl(filters, values))} onReset={reset} />
    {error ? <LemburError error={error} retry={retry} busy={query.isFetching} /> : query.isPending ? <LemburLoading /> : list && (list.rows.length === 0 ? <LemburEmpty filtered={hasActiveLemburFilters(filters)} onReset={reset} /> : <><LemburTable list={list} updating={query.isPlaceholderData && query.isFetching} /><LemburPagination pagination={list.pagination} disabled={query.isFetching} onPage={(page) => navigate(lemburUrl(filters, { page }))} /></>)}
  </div>;
}
