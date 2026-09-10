import type { ReactNode } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthScreen entry="admin"><AdminShell>{children}</AdminShell></AuthScreen>;
}
