import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-8 p-5">
      <div className="space-y-1 px-2 pt-2">
        <p className="font-semibold tracking-tight">SWP Lembur</p>
        <p className="text-xs text-muted-foreground">Administrasi</p>
      </div>
      <nav aria-label="Navigasi admin">
        <Link href="/admin" aria-current="page" onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-lg bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <LayoutDashboard aria-hidden="true" className="size-4" /> Dashboard
        </Link>
      </nav>
    </div>
  );
}
