"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { authView } from "@/lib/auth/access";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { hasActivePegawaiFilters, parsePegawaiSearchParams, pegawaiUrl } from "../filters";
import { pegawaiListOptions } from "../query";
import { PegawaiListFilters } from "./list-filters";
import { PegawaiPagination, PegawaiTable } from "./list";
import { PegawaiError, PegawaiLoading } from "./states";

export function PegawaiPage() {
  const auth = useAuth(); const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const filters = useMemo(() => parsePegawaiSearchParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const query = useQuery(pegawaiListOptions(auth, filters));
  if (authView(auth, "admin") !== "admin") return null;
  const currentUrl = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const navigate = (href: string) => { if (href !== currentUrl) router.push(href, { scroll: false }); };
  const error = query.error ? normalizeApiError(query.error) : null;
  const retry = () => error?.kind === "unauthorized" || error?.kind === "csrf" ? void auth.refresh().catch(() => {}) : void query.refetch();
  const list = query.data;
  const applied = !query.isPlaceholderData && list ? list.filters : filters;
  return <div className="space-y-6">
    <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Administrasi pegawai</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Pegawai outsourcing</h1><p className="mt-2 text-sm text-muted-foreground">Cari berdasarkan nama, NIP, jabatan, atau kode biro.</p></div>
    <PegawaiListFilters key={`${applied.search}-${applied.status}`} initial={{ search: applied.search || undefined, status: applied.status || undefined }} disabled={query.isFetching && !query.isPlaceholderData} onApply={(values) => navigate(pegawaiUrl(filters, values))} onReset={() => navigate("/admin/pegawai")} />
    {error ? <PegawaiError error={error} retry={retry} busy={query.isFetching} /> : query.isPending ? <PegawaiLoading /> : list && (list.rows.length === 0 ? <section className="rounded-xl border bg-card p-8 text-center"><h2 className="font-semibold">Belum ada data pegawai</h2><p className="mt-2 text-sm text-muted-foreground">Tidak ada pegawai untuk filter yang dipilih.</p>{hasActivePegawaiFilters(filters) && <ButtonReset onReset={() => navigate("/admin/pegawai")} />}</section> : <><PegawaiTable list={list} updating={query.isFetching} returnTo={currentUrl} /><PegawaiPagination pagination={list.pagination} disabled={query.isFetching} onPage={(page) => navigate(pegawaiUrl(filters, { page }))} /></>)}
  </div>;
}

function ButtonReset({ onReset }: { onReset: () => void }) {
  return <Button type="button" variant="outline" className="mt-5 min-h-11" onClick={onReset}>Reset filter</Button>;
}
