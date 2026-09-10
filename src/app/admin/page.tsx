import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = { title: "Akses admin | SWP Lembur CMS" };
export default function AdminEntryPage() {
  return <AuthScreen entry="admin" />;
}
