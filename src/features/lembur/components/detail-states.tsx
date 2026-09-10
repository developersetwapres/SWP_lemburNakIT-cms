import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError, ApiErrorKind } from "@/lib/api/errors";
import { lemburReturnLabel } from "../navigation";

const detailErrorMessages: Record<ApiErrorKind, string> = {
  unauthorized: "Sesi Anda tidak aktif. Periksa kembali sesi untuk melanjutkan.",
  forbidden: "Akses ke detail lembur ditolak oleh server.",
  not_found: "Data lembur yang diminta tidak ditemukan.",
  csrf: "Sesi atau token CSRF bermasalah. Periksa kembali sesi sebelum melanjutkan.",
  validation: "Permintaan detail lembur tidak dapat diproses oleh server.",
  password_confirmation: "Server meminta konfirmasi password.",
  rate_limited: "Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba kembali.",
  server: "Server belum dapat memuat detail lembur.",
  network: "Tidak dapat terhubung ke API.",
  configuration: "Konfigurasi koneksi API belum siap.",
  contract: "Respons detail lembur tidak sesuai kontrak.",
  cancelled: "Permintaan detail dibatalkan.",
  unknown: "Detail lembur belum dapat dimuat.",
};

export function LemburDetailLoading() {
  return <div role="status" aria-label="Memuat detail lembur" className="space-y-6"><span className="sr-only">Memuat detail lembur…</span><div aria-hidden="true" className="h-24 rounded-xl border bg-card motion-safe:animate-pulse" /><div aria-hidden="true" className="grid gap-6 lg:grid-cols-2"><div className="h-72 rounded-xl border bg-card motion-safe:animate-pulse" /><div className="h-72 rounded-xl border bg-card motion-safe:animate-pulse" /></div><div aria-hidden="true" className="h-96 rounded-xl border bg-card motion-safe:animate-pulse" /></div>;
}

export function LemburDetailNotFound({ returnTo }: { returnTo: string }) {
  return <section className="rounded-xl border bg-card p-8 text-center shadow-sm"><AlertTriangle aria-hidden="true" className="mx-auto size-10 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Lembur tidak ditemukan</h1><p className="mt-2 text-sm text-muted-foreground">Data mungkin telah dihapus atau alamat detail tidak lagi berlaku.</p><Button render={<Link href={returnTo} />} variant="outline" className="mt-6 min-h-11"><ArrowLeft aria-hidden="true" /> {lemburReturnLabel(returnTo)}</Button></section>;
}

export function LemburDetailError({ error, returnTo, retry, busy }: { error: ApiError; returnTo: string; retry: () => void; busy: boolean }) {
  const session = error.kind === "unauthorized" || error.kind === "csrf";
  return <section className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"><h1 className="text-xl font-semibold">{error.kind === "forbidden" ? "Akses ditolak" : "Detail lembur gagal dimuat"}</h1><p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{detailErrorMessages[error.kind]}</p><div className="flex flex-wrap gap-3"><Button variant="outline" className="min-h-11" disabled={busy} onClick={retry}>{session ? "Periksa kembali sesi" : "Coba lagi"}</Button><Button render={<Link href={returnTo} />} variant="ghost" className="min-h-11"><ArrowLeft aria-hidden="true" /> {lemburReturnLabel(returnTo)}</Button></div></section>;
}

export function lockErrorMessage(error: ApiError) {
  const messages: Partial<Record<ApiErrorKind, string>> = {
    unauthorized: "Sesi Anda tidak aktif. Silakan masuk kembali.",
    forbidden: "Server menolak izin untuk mengunci lembur ini.",
    not_found: "Data lembur tidak ditemukan.",
    csrf: "Sesi atau token CSRF bermasalah. Periksa kembali sesi sebelum mencoba lagi.",
    validation: "Lembur tidak dapat dikunci. Statusnya mungkin sudah berubah.",
    rate_limited: "Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba lagi.",
    server: "Server belum dapat mengunci lembur.",
    network: "Tidak dapat terhubung ke API.",
    configuration: "Konfigurasi koneksi API belum siap.",
    contract: "Respons lock tidak sesuai kontrak.",
  };
  return messages[error.kind] ?? "Lembur belum dapat dikunci.";
}
