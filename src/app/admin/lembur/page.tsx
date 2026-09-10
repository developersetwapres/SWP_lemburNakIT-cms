import type { Metadata } from "next";
import { Suspense } from "react";
import { LemburPage } from "@/features/lembur/components/lembur-page";
import { LemburLoading } from "@/features/lembur/components/states";

export const metadata: Metadata = { title: "Lembur | SWP Lembur CMS" };

export default function AdminLemburPage() {
  return <Suspense fallback={<LemburLoading />}><LemburPage /></Suspense>;
}
