import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PegawaiList } from "../api";

function detailHref(uuid: string, returnTo: string) {
  return `/admin/pegawai/${encodeURIComponent(uuid)}?${new URLSearchParams({ returnTo })}`;
}

export function PegawaiTable({ list, updating, returnTo }: { list: PegawaiList; updating: boolean; returnTo: string }) {
  return <section aria-labelledby="pegawai-list-title" aria-busy={updating} className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <div className="flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-5"><div><h2 id="pegawai-list-title" className="font-semibold">Daftar pegawai</h2><p className="mt-1 text-sm text-muted-foreground">{list.pagination.total.toLocaleString("id-ID")} pegawai outsourcing</p></div>{updating && <span role="status" className="text-sm text-muted-foreground">Memperbarui…</span>}</div>
    <div className="overflow-x-auto"><table className={`w-full min-w-[760px] text-left text-sm transition-opacity ${updating ? "opacity-50" : ""}`}>
      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Nama</th><th className="px-5 py-3 font-medium">NIP</th><th className="px-5 py-3 font-medium">Jabatan</th><th className="px-5 py-3 font-medium">Kode biro</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Lembur</th></tr></thead>
      <tbody className="divide-y">{list.rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-medium"><Link href={detailHref(row.uuid, returnTo)} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{row.name}<span className="sr-only"> — lihat detail pegawai</span></Link></td><td className="px-5 py-4 text-muted-foreground">{row.nip || "—"}</td><td className="px-5 py-4">{row.jabatan || "—"}</td><td className="px-5 py-4 text-muted-foreground">{row.kode_biro || "—"}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${row.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700"}`}>{row.is_active ? "Aktif" : "Tidak aktif"}</span></td><td className="px-5 py-4 tabular-nums">{row.lemburs_count ?? "—"}</td></tr>)}</tbody>
    </table></div>
  </section>;
}

export function PegawaiPagination({ pagination, disabled, onPage, label = "Pagination pegawai" }: { pagination: PegawaiList["pagination"]; disabled: boolean; onPage: (page: number) => void; label?: string }) {
  return <nav aria-label={label} className="flex flex-col items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row"><p className="text-sm text-muted-foreground">{pagination.from === null ? "Tidak ada data" : `${pagination.from}–${pagination.to} dari ${pagination.total}`} · Halaman {pagination.current_page} dari {pagination.last_page}</p><div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={disabled || pagination.current_page <= 1} onClick={() => onPage(pagination.current_page - 1)}>Sebelumnya</Button><Button type="button" variant="outline" className="min-h-11" disabled={disabled || pagination.current_page >= pagination.last_page} onClick={() => onPage(pagination.current_page + 1)}>Berikutnya</Button></div></nav>;
}
