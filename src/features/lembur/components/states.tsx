import { Button } from "@/components/ui/button";
import type { ApiError, ApiErrorKind } from "@/lib/api/errors";

const messages: Record<ApiErrorKind, string> = {
  unauthorized: "Sesi Anda tidak aktif. Periksa kembali sesi untuk melanjutkan.", forbidden: "Akses daftar lembur ditolak oleh server.",
  not_found: "Layanan daftar lembur tidak ditemukan.", csrf: "Sesi atau token CSRF bermasalah. Periksa kembali sesi sebelum melanjutkan.",
  validation: "Filter tidak dapat diproses oleh server. Reset filter atau periksa kembali nilainya.", password_confirmation: "Server meminta konfirmasi password.",
  rate_limited: "Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba kembali.", server: "Server belum dapat memuat daftar lembur.",
  network: "Tidak dapat terhubung ke API.", configuration: "Konfigurasi koneksi API belum siap.", contract: "Respons daftar lembur tidak sesuai kontrak.",
  cancelled: "Permintaan daftar dibatalkan.", unknown: "Daftar lembur belum dapat dimuat.",
};

export function LemburLoading() {
  return <div role="status" aria-label="Memuat daftar lembur" className="space-y-6"><span className="sr-only">Memuat daftar lembur…</span><div aria-hidden="true" className="h-52 rounded-xl border bg-card motion-safe:animate-pulse" /><div aria-hidden="true" className="h-96 rounded-xl border bg-card motion-safe:animate-pulse" /></div>;
}
export function LemburError({ error, retry, busy }: { error: ApiError; retry: () => void; busy: boolean }) {
  const session = error.kind === "unauthorized" || error.kind === "csrf";
  return <section className="space-y-4 rounded-xl border bg-card p-6"><h2 className="font-semibold">{error.kind === "forbidden" ? "Akses ditolak" : "Daftar lembur gagal dimuat"}</h2><p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{messages[error.kind]}</p><Button variant="outline" className="min-h-11" disabled={busy} onClick={retry}>{session ? "Periksa kembali sesi" : "Coba lagi"}</Button></section>;
}
export function LemburEmpty({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return <section className="rounded-xl border bg-card p-8 text-center shadow-sm"><h2 className="font-semibold">Belum ada data lembur</h2><p className="mt-2 text-sm text-muted-foreground">Belum ada data lembur untuk filter yang dipilih.</p>{filtered && <Button type="button" variant="outline" className="mt-5 min-h-11" onClick={onReset}>Reset filter</Button>}</section>;
}
