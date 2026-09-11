import type { Metadata } from "next";
import { Suspense } from "react";
import { LemburDetailRoute } from "@/features/lembur/components/lembur-detail-route";
import { LemburDetailLoading } from "@/features/lembur/components/detail-states";

export const metadata: Metadata = { title: "Detail Lembur | SWP Lembur CMS" };

export default function AdminLemburDetailRoute() {
  return <Suspense fallback={<LemburDetailLoading />}><LemburDetailRoute /></Suspense>;
}
