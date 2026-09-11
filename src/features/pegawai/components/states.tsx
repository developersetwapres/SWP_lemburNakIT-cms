import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ApiError, ApiErrorKind } from "@/lib/api/errors";

const messages: Record<ApiErrorKind, string> = {
  unauthorized: "Sesi Anda tidak aktif. Periksa kembali sesi untuk melanjutkan.", forbidden: "Akses data pegawai ditolak oleh server.",
  not_found: "Data pegawai tidak ditemukan.", csrf: "Sesi atau token CSRF bermasalah.", validation: "Data yang dikirim tidak dapat diproses.",
  password_confirmation: "Server meminta konfirmasi password.", rate_limited: "Terlalu banyak permintaan. Tunggu sebelum mencoba kembali.",
  server: "Server belum dapat memproses data pegawai.", network: "Tidak dapat terhubung ke API.", configuration: "Konfigurasi koneksi API belum siap.",
  contract: "Respons data pegawai tidak sesuai kontrak.", cancelled: "Permintaan dibatalkan.", unknown: "Data pegawai belum dapat dimuat.",
};
export function pegawaiErrorMessage(error: ApiError) { return messages[error.kind]; }

export function PegawaiLoading({ label = "Memuat data pegawai" }: { label?: string }) {
  return <div role="status" aria-label={label} className="space-y-5"><span className="sr-only">{label}…</span><div aria-hidden="true" className="h-36 rounded-xl border bg-card motion-safe:animate-pulse" /><div aria-hidden="true" className="h-80 rounded-xl border bg-card motion-safe:animate-pulse" /></div>;
}
export function PegawaiError({ error, retry, busy, title = "Data pegawai gagal dimuat" }: { error: ApiError; retry: () => void; busy: boolean; title?: string }) {
  return <section className="space-y-4 rounded-xl border bg-card p-6"><h2 className="font-semibold">{error.kind === "forbidden" ? "Akses ditolak" : title}</h2><p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{pegawaiErrorMessage(error)}</p><Button variant="outline" className="min-h-11" disabled={busy} onClick={retry}>{error.kind === "unauthorized" || error.kind === "csrf" ? "Periksa kembali sesi" : "Coba lagi"}</Button></section>;
}
export function PegawaiNotFound({ returnTo }: { returnTo: string }) {
  return <section className="space-y-4 rounded-xl border bg-card p-8 text-center"><h1 className="text-xl font-semibold">Pegawai tidak ditemukan</h1><p className="text-sm text-muted-foreground">Data yang diminta tidak tersedia atau bukan pegawai outsourcing.</p><Button nativeButton={false} render={<Link href={returnTo} />} variant="outline" className="min-h-11">Kembali ke Pegawai</Button></section>;
}
