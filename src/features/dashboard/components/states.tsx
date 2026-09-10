import { Button } from "@/components/ui/button";
import { AuthError } from "@/components/auth/feedback";
import type { ApiError } from "@/lib/api/errors";

export function DashboardLoading() {
  return <div role="status" aria-label="Memuat dashboard" className="space-y-6">
    <span className="sr-only">Memuat dashboard…</span>
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-37 rounded-xl border bg-card p-5"><div className="h-4 w-24 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-5 h-8 w-32 rounded bg-muted motion-safe:animate-pulse" /></div>)}</div>
    <div aria-hidden="true" className="h-88 rounded-xl border bg-card p-6"><div className="h-4 w-48 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-8 h-52 rounded bg-muted motion-safe:animate-pulse" /></div>
  </div>;
}

export function DashboardError({ error, retry, busy }: { error: ApiError; retry: () => void; busy: boolean }) {
  const session = error.kind === "unauthorized" || error.kind === "csrf";
  return <section className="space-y-4 rounded-xl border bg-card p-6">
    <h2 className="font-semibold">{error.kind === "forbidden" ? "Akses dashboard ditolak" : "Dashboard gagal dimuat"}</h2>
    <AuthError error={error} />
    <Button variant="outline" className="min-h-11" disabled={busy} onClick={retry}>{session ? "Periksa kembali sesi" : "Coba lagi"}</Button>
  </section>;
}
