import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = { title: "Masuk | SWP Lembur CMS" };
export default function LoginPage() {
  return <AuthScreen entry="login" />;
}
