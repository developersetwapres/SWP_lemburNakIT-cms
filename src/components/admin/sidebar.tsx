import Link from "next/link";
import { Clock3, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export const adminNavigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/lembur", label: "Lembur", icon: Clock3 },
] as const;

export function isAdminNavigationActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ pathname = "/admin", onNavigate }: { pathname?: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-8 p-5">
      <div className="space-y-1 px-2 pt-2">
        <p className="font-semibold tracking-tight">SWP Lembur</p>
        <p className="text-xs text-muted-foreground">Administrasi</p>
      </div>
      <nav aria-label="Navigasi admin" className="space-y-1">
        {adminNavigation.map(({ href, label, icon: Icon }) => {
          const active = isAdminNavigationActive(pathname, href);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={onNavigate} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
            <Icon aria-hidden="true" className="size-4" /> {label}
          </Link>;
        })}
      </nav>
    </div>
  );
}
