import { Suspense } from "react";
import { PegawaiDetailPage } from "@/features/pegawai/components/detail-page";
import { safePegawaiReturnTo } from "@/features/pegawai/navigation";

export default async function Page({ params, searchParams }: { params: Promise<{ uuid: string }>; searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const [{ uuid }, query] = await Promise.all([params, searchParams]);
  return <Suspense fallback={<div role="status" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Memuat detail pegawai…</div>}><PegawaiDetailPage uuid={uuid} returnTo={safePegawaiReturnTo(query.returnTo)} /></Suspense>;
}
