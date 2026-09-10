import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/components/dashboard";

export const metadata: Metadata = { title: "Dashboard | SWP Lembur CMS" };
export default function AdminEntryPage() {
  return <Dashboard />;
}
