"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authView } from "@/lib/auth/access";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { hasActiveHistoryFilters, parseHistorySearchParams, pegawaiDetailUrl } from "../filters";
import { pegawaiDetailOptions, pegawaiHistoryOptions } from "../query";
import { PegawaiEditForm } from "./edit-form";
import { HistoryFilters, PegawaiHistoryTable } from "./history";
import { PegawaiError, PegawaiLoading, PegawaiNotFound } from "./states";

function Value({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value === null || value === undefined || value === "" ? "Tidak tersedia" : value}</dd></div>;
}

export function PegawaiDetailPage({ uuid, returnTo }: { uuid: string; returnTo: string }) {
  const auth = useAuth(); const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const filters = useMemo(() => parseHistorySearchParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const detail = useQuery(pegawaiDetailOptions(auth, uuid)); const history = useQuery(pegawaiHistoryOptions(auth, uuid, filters));
  if (authView(auth, "admin") !== "admin") return null;
  const detailError = detail.error ? normalizeApiError(detail.error) : null;
  if (detailError?.kind === "not_found") return <PegawaiNotFound returnTo={returnTo} />;
  if (detailError) return <PegawaiError error={detailError} busy={detail.isFetching} retry={() => detailError.kind === "unauthorized" || detailError.kind === "csrf" ? void auth.refresh().catch(() => {}) : void detail.refetch()} title="Detail pegawai gagal dimuat" />;
  if (detail.isPending || !detail.data) return <PegawaiLoading label="Memuat detail pegawai" />;
  const currentHistoryUrl = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const historyError = history.error ? normalizeApiError(history.error) : null;
  const navigate = (href: string) => router.push(href, { scroll: false });
  return <div className="space-y-6">
    <Button render={<Link href={returnTo} />} variant="ghost" className="min-h-11"><ArrowLeft aria-hidden="true" /> Kembali ke Pegawai</Button>
    {searchParams.get("notice") === "deleted" && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">Data lembur berhasil dihapus.</p>}
    <section className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detail pegawai</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{detail.data.name}</h1></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${detail.data.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700"}`}>{detail.data.is_active ? "Aktif" : "Tidak aktif"}</span></div><dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Value label="Email" value={detail.data.email} /><Value label="NIP" value={detail.data.nip} /><Value label="Jabatan" value={detail.data.jabatan} /><Value label="Kode biro" value={detail.data.kode_biro} /></dl></section>
    <PegawaiEditForm key={`${detail.data.uuid}-${detail.data.name}-${detail.data.is_active}`} pegawai={detail.data} />
    <section aria-labelledby="history-title" className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="px-5 py-4"><h2 id="history-title" className="font-semibold">Riwayat lembur</h2><p className="mt-1 text-sm text-muted-foreground">Riwayat ini mengikuti filter dan pagination dari API pegawai.</p></div><HistoryFilters key={JSON.stringify(filters)} initial={filters} disabled={history.isFetching} onApply={(changes) => navigate(pegawaiDetailUrl(uuid, filters, changes))} onReset={() => navigate(`/admin/pegawai/${encodeURIComponent(uuid)}`)} />
      {historyError ? <div className="p-5"><PegawaiError error={historyError} busy={history.isFetching} retry={() => historyError.kind === "unauthorized" || historyError.kind === "csrf" ? void auth.refresh().catch(() => {}) : void history.refetch()} title="Riwayat lembur gagal dimuat" /></div> : history.isPending ? <div className="p-5"><PegawaiLoading label="Memuat riwayat lembur" /></div> : history.data && (history.data.rows.length === 0 ? <div className="p-8 text-center"><h3 className="font-semibold">Belum ada riwayat lembur</h3><p className="mt-2 text-sm text-muted-foreground">Tidak ada data untuk filter yang dipilih.</p>{hasActiveHistoryFilters(filters) && <Button type="button" variant="outline" className="mt-5 min-h-11" onClick={() => navigate(`/admin/pegawai/${encodeURIComponent(uuid)}`)}>Reset filter</Button>}</div> : <PegawaiHistoryTable history={history.data} updating={history.isFetching} returnTo={currentHistoryUrl} onPage={(page) => navigate(pegawaiDetailUrl(uuid, filters, { page }))} />)}
    </section>
  </div>;
}
