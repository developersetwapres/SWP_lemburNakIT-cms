import type { Metadata } from "next";
import { LemburDetailPage } from "@/features/lembur/components/lembur-detail-page";
import { safeLemburReturnTo } from "@/features/lembur/navigation";

export const metadata: Metadata = { title: "Detail Lembur | SWP Lembur CMS" };

export default async function AdminLemburDetailRoute({ params, searchParams }: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [{ uuid }, query] = await Promise.all([params, searchParams]);
  return <LemburDetailPage uuid={uuid} returnTo={safeLemburReturnTo(query.returnTo)} />;
}
