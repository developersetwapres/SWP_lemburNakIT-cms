"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { LemburHistory } from "@/features/lembur/api";
import { dayTypeLabels, formatLemburDate, statusLabels } from "@/features/lembur/format";
import { lemburDetailHref } from "@/features/lembur/navigation";
import type { PegawaiHistoryRequest } from "../filters";
import { PegawaiPagination } from "./list";

export function HistoryFilters({ initial, disabled, onApply, onReset }: { initial: PegawaiHistoryRequest; disabled: boolean; onApply: (values: Partial<PegawaiHistoryRequest>) => void; onReset: () => void }) {
  const [values, setValues] = useState({ bulan: initial.bulan ?? "", status: initial.status ?? "", jenis_hari: initial.jenis_hari ?? "", search: initial.search ?? "" });
  const submit = (event: FormEvent) => { event.preventDefault(); onApply(values); };
  const field = "h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return <form onSubmit={submit} className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
    <label className="grid gap-2 text-sm font-medium">Bulan<input type="month" value={values.bulan} onChange={(event) => setValues({ ...values, bulan: event.target.value })} className={field} /></label>
    <label className="grid gap-2 text-sm font-medium">Status<select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value })} className={field}><option value="">Default API</option><option value="complete">Complete</option><option value="draft">Draft</option><option value="locked">Locked</option></select></label>
    <label className="grid gap-2 text-sm font-medium">Jenis hari<select value={values.jenis_hari} onChange={(event) => setValues({ ...values, jenis_hari: event.target.value })} className={field}><option value="">Default API</option><option value="semua">Semua</option><option value="kerja">Hari kerja</option><option value="libur">Hari libur</option></select></label>
    <label className="grid gap-2 text-sm font-medium">Cari kegiatan/lokasi<input type="search" value={values.search} onChange={(event) => setValues({ ...values, search: event.target.value })} className={field} /></label>
    <div className="flex gap-2"><Button type="submit" className="min-h-11 flex-1" disabled={disabled}>Terapkan</Button><Button type="button" variant="outline" className="min-h-11 flex-1" disabled={disabled} onClick={onReset}>Reset</Button></div>
  </form>;
}

export function PegawaiHistoryTable({ history, updating, returnTo, onPage }: { history: LemburHistory; updating: boolean; returnTo: string; onPage: (page: number) => void }) {
  return <div className="space-y-4"><div className="overflow-x-auto"><table className={`w-full min-w-[700px] text-left text-sm ${updating ? "opacity-50" : ""}`}><thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Tanggal</th><th className="px-5 py-3 font-medium">Kegiatan</th><th className="px-5 py-3 font-medium">Lokasi</th><th className="px-5 py-3 font-medium">Jenis hari</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y">{history.rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-5 py-4">{formatLemburDate(row.tanggal)}</td><td className="px-5 py-4 font-medium"><Link href={lemburDetailHref(row.uuid, returnTo)} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{row.nama_kegiatan}</Link></td><td className="px-5 py-4 text-muted-foreground">{row.lokasi_kegiatan}</td><td className="px-5 py-4">{dayTypeLabels[row.jenis_hari] ?? row.jenis_hari}</td><td className="px-5 py-4">{statusLabels[row.status] ?? row.status}</td></tr>)}</tbody></table></div><div className="px-4 pb-4"><PegawaiPagination pagination={history.pagination} disabled={updating} onPage={onPage} label="Pagination riwayat lembur" /></div></div>;
}
