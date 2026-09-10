import { LoaderCircle } from "lucide-react";
import type { ApiError, ApiErrorKind } from "@/lib/api/errors";

const messages: Record<ApiErrorKind, string> = {
  unauthorized: "Sesi Anda tidak aktif. Silakan masuk kembali.",
  forbidden: "Akses ditolak oleh server. Akun ini tidak dapat melanjutkan akses admin.",
  not_found: "Layanan autentikasi tidak ditemukan. Periksa konfigurasi API.",
  csrf: "Sesi atau token CSRF bermasalah. Periksa kembali sesi sebelum melanjutkan. Kode verifikasi tidak dikirim ulang otomatis.",
  validation: "Data belum valid atau kredensial tidak cocok. Periksa isian Anda.",
  password_confirmation: "Server meminta konfirmasi password. Fitur konfirmasi belum tersedia pada halaman ini.",
  rate_limited: "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba kembali.",
  server: "Layanan autentikasi sedang bermasalah. Silakan coba kembali nanti.",
  network: "Tidak dapat terhubung ke API. Periksa koneksi dan coba kembali.",
  configuration: "Konfigurasi koneksi API belum siap. Hubungi pengelola aplikasi.",
  contract: "Respons autentikasi tidak sesuai atau sesi belum dapat dipastikan. Periksa kembali sesi.",
  cancelled: "Permintaan dibatalkan. Anda dapat mencoba kembali.",
  unknown: "Permintaan belum dapat diselesaikan. Silakan coba kembali.",
};

export function AuthError({ error }: { error: ApiError | null }) {
  if (!error) return null;
  return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{messages[error.kind]}</p>;
}

export function AuthLoading({ label = "Memeriksa sesi…" }: { label?: string }) {
  return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{label}</p>;
}
