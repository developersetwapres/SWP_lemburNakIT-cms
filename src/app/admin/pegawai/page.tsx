import { Suspense } from "react";
import { PegawaiPage } from "@/features/pegawai/components/pegawai-page";

export default function Page() {
  return <Suspense fallback={<div role="status" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Memuat pegawai…</div>}><PegawaiPage /></Suspense>;
}
