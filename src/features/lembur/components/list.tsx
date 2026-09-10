import { Button } from "@/components/ui/button";
import type { LemburList } from "../api";
import { dayTypeLabels, employeeName, formatLemburDate, statusLabels } from "../format";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "complete" ? "bg-green-50 text-green-700" : status === "locked" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{statusLabels[status] ?? status}</span>;
}

export function LemburTable({ list, updating }: { list: LemburList; updating: boolean }) {
  return <section aria-labelledby="list-title" aria-busy={updating} className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <div className="flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-5"><div><h2 id="list-title" className="font-semibold">Daftar lembur</h2><p className="mt-1 text-sm text-muted-foreground">{list.pagination.total.toLocaleString("id-ID")} data ditemukan</p></div>{updating && <span role="status" className="text-sm text-muted-foreground">Memperbarui…</span>}</div>
    <div className="overflow-x-auto"><table className={`w-full min-w-[900px] text-left text-sm transition-opacity ${updating ? "opacity-50" : ""}`}>
      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Pegawai</th><th className="px-5 py-3 font-medium">Tanggal</th><th className="px-5 py-3 font-medium">Kegiatan</th><th className="px-5 py-3 font-medium">Lokasi</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Jenis hari</th></tr></thead>
      <tbody className="divide-y">{list.rows.map((row) => <tr key={row.id} className="align-top"><td className="px-5 py-4"><p className="font-medium">{employeeName(row.pegawai)}</p>{row.pegawai?.nip && <p className="mt-1 text-xs text-muted-foreground">NIP {row.pegawai.nip}</p>}</td><td className="whitespace-nowrap px-5 py-4">{formatLemburDate(row.tanggal)}</td><td className="max-w-64 px-5 py-4 font-medium">{row.nama_kegiatan}</td><td className="max-w-56 px-5 py-4 text-muted-foreground">{row.lokasi_kegiatan}</td><td className="px-5 py-4"><StatusBadge status={row.status} /></td><td className="whitespace-nowrap px-5 py-4">{dayTypeLabels[row.jenis_hari] ?? row.jenis_hari}</td></tr>)}</tbody>
    </table></div>
  </section>;
}

export function LemburPagination({ pagination, disabled, onPage }: { pagination: LemburList["pagination"]; disabled: boolean; onPage: (page: number) => void }) {
  return <nav aria-label="Pagination lembur" className="flex flex-col items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row">
    <p className="text-sm text-muted-foreground">{pagination.from === null ? "Tidak ada data" : `${pagination.from}–${pagination.to} dari ${pagination.total}`} · Halaman {pagination.current_page} dari {pagination.last_page}</p>
    <div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={disabled || pagination.current_page <= 1} onClick={() => onPage(pagination.current_page - 1)}>Sebelumnya</Button><Button type="button" variant="outline" className="min-h-11" disabled={disabled || pagination.current_page >= pagination.last_page} onClick={() => onPage(pagination.current_page + 1)}>Berikutnya</Button></div>
  </nav>;
}
