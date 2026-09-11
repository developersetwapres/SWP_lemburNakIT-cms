import { Suspense } from "react";
import { PegawaiDetailRoute } from "@/features/pegawai/components/pegawai-detail-route";
import { PegawaiLoading } from "@/features/pegawai/components/states";

export default function Page() {
  return <Suspense fallback={<PegawaiLoading label="Memuat detail pegawai" />}><PegawaiDetailRoute /></Suspense>;
}
