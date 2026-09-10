import { Button } from "@/components/ui/button";
import type { ApiError, ApiErrorKind } from "@/lib/api/errors";

const messages: Record<ApiErrorKind, string> = {
  unauthorized: "Sesi Anda tidak aktif. Periksa kembali sesi untuk melanjutkan.", forbidden: "Akses settings ditolak oleh server.", not_found: "Layanan settings tidak ditemukan.", csrf: "Sesi atau token CSRF bermasalah.", validation: "Data belum valid. Periksa kembali isian.", password_confirmation: "Konfirmasikan password untuk melihat informasi keamanan.", rate_limited: "Terlalu banyak permintaan. Tunggu sebelum mencoba kembali.", server: "Server belum dapat memproses settings.", network: "Tidak dapat terhubung ke API.", configuration: "Konfigurasi koneksi API belum siap.", contract: "Respons settings tidak sesuai kontrak.", cancelled: "Permintaan dibatalkan.", unknown: "Settings belum dapat diproses.",
};
export function settingsErrorMessage(error: ApiError) { return messages[error.kind]; }
export function SettingsError({ error, retry, busy }: { error: ApiError; retry: () => void; busy: boolean }) {
  return <div className="space-y-3"><p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{settingsErrorMessage(error)}</p><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={retry}>{error.kind === "unauthorized" || error.kind === "csrf" ? "Periksa kembali sesi" : "Coba lagi"}</Button></div>;
}
export function SettingsLoading({ label }: { label: string }) { return <div role="status" className="h-36 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground motion-safe:animate-pulse"><span className="sr-only">{label}</span></div>; }
