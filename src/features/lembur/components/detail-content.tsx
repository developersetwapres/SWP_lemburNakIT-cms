/* eslint-disable @next/next/no-img-element -- Media origins are returned dynamically by the Laravel API. */
import type { ReactNode } from "react";
import { CalendarDays, Clock3, LockKeyhole, MapPin, UserRound } from "lucide-react";
import type { LemburDetail } from "../api";
import { dayTypeLabels, employeeName, formatLemburDate, formatLemburTime, formatLemburTimestamp, formatRupiah, statusLabels } from "../format";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "complete" ? "bg-green-50 text-green-700" : status === "locked" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{statusLabels[status] ?? status}</span>;
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value?.trim() || "Tidak tersedia"}</dd></div>;
}

function Photo({ src, alt, timestamp }: { src: string | null | undefined; alt: string; timestamp: string | null | undefined }) {
  return <figure className="overflow-hidden rounded-xl border bg-muted/20"><div className="flex min-h-56 items-center justify-center bg-muted/40 p-3">{src ? <a href={src} target="_blank" rel="noreferrer" className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{/* The API owns the remote media host, so next/image cannot use a static host allowlist here. */}<img src={src} alt={alt} loading="lazy" decoding="async" className="max-h-[32rem] w-full rounded-lg object-contain" /></a> : <p className="text-sm text-muted-foreground">Foto tidak tersedia</p>}</div><figcaption className="border-t px-4 py-3 text-sm text-muted-foreground"><Clock3 aria-hidden="true" className="mr-2 inline size-4" />{formatLemburTimestamp(timestamp) ?? "Timestamp tidak tersedia"}</figcaption></figure>;
}

export function LemburDetailContent({ detail, action }: { detail: LemburDetail; action?: ReactNode }) {
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detail lembur</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{detail.nama_kegiatan}</h1><div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-4" />{formatLemburDate(detail.tanggal)}</span><span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-4" />{detail.lokasi_kegiatan}</span></div></div><div className="flex shrink-0 flex-col items-start gap-3 sm:items-end"><StatusBadge status={detail.status} />{detail.can_lock ? action : null}</div></section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="employee-title" className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><UserRound aria-hidden="true" className="size-5 text-muted-foreground" /><h2 id="employee-title" className="font-semibold">Informasi pegawai</h2></div><dl className="mt-5 grid gap-5 sm:grid-cols-2"><DetailItem label="Nama" value={employeeName(detail.pegawai)} /><DetailItem label="NIP" value={detail.pegawai?.nip} /><DetailItem label="Jabatan" value={detail.pegawai?.jabatan} /></dl></section>
      <section aria-labelledby="overtime-title" className="rounded-xl border bg-card p-5 shadow-sm"><h2 id="overtime-title" className="font-semibold">Informasi lembur</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2"><DetailItem label="Tanggal" value={formatLemburDate(detail.tanggal)} /><DetailItem label="Jenis hari" value={dayTypeLabels[detail.jenis_hari] ?? detail.jenis_hari} /><DetailItem label="Upah" value={formatRupiah(detail.upah)} /><DetailItem label="Waktu pulang" value={formatLemburTime(detail.waktu_pulang)} /><DetailItem label="Lokasi" value={detail.lokasi_kegiatan} /><DetailItem label="Status" value={statusLabels[detail.status] ?? detail.status} /></dl><div className="mt-5 border-t pt-5"><DetailItem label="Kegiatan" value={detail.nama_kegiatan} /></div>{detail.locked_at && <div className="mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2"><DetailItem label="Dikunci pada" value={formatLemburTimestamp(detail.locked_at)} /><DetailItem label="Dikunci oleh" value={detail.lockedBy?.name} /></div>}</section>
    </div>

    <section aria-labelledby="documentation-title" className="rounded-xl border bg-card p-5 shadow-sm"><h2 id="documentation-title" className="font-semibold">Dokumentasi</h2><p className="mt-1 text-sm text-muted-foreground">Pilih foto untuk melihat ukuran aslinya.</p><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><h3 className="mb-3 text-sm font-medium">Foto kegiatan</h3><Photo src={detail.foto_kegiatan_url} alt={`Foto kegiatan ${detail.nama_kegiatan}`} timestamp={detail.foto_kegiatan_at} /></div><div><h3 className="mb-3 text-sm font-medium">Foto pulang</h3><Photo src={detail.foto_pulang_url} alt={`Foto pulang ${employeeName(detail.pegawai)}`} timestamp={detail.foto_pulang_at} /></div></div></section>

    {!detail.can_lock && <section className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground"><LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>{detail.status === "locked" ? "Data lembur ini sudah dikunci." : "Data lembur ini belum dapat dikunci."}</p></section>}
  </div>;
}
