"use client";

import { useRef, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError } from "@/components/auth/feedback";
import { useAuth } from "@/lib/auth/provider";
import { Sidebar } from "./sidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const submitting = useRef(false);
  const name = auth.user?.attributes.name;
  async function logout() {
    if (submitting.current) return;
    submitting.current = true;
    try { await auth.logout(); }
    catch { /* The existing provider exposes the error and preserves failed logout state. */ }
    finally { submitting.current = false; }
  }
  return (
    <div className="min-h-svh bg-muted/30">
      <a href="#admin-content" className="sr-only z-50 rounded bg-background p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Lewati ke konten</a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-sidebar text-sidebar-foreground md:block"><Sidebar /></aside>
      <div className="md:pl-60">
        <header className="flex min-h-18 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Dialog.Trigger render={<Button variant="outline" size="icon" className="size-11 md:hidden" aria-label="Buka navigasi admin" />}><Menu aria-hidden="true" /></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
                <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground shadow-xl outline-none">
                  <Dialog.Title className="sr-only">Navigasi admin</Dialog.Title>
                  <Dialog.Close render={<Button variant="ghost" size="icon" className="absolute right-3 top-3 size-11" aria-label="Tutup navigasi" />}><X aria-hidden="true" /></Dialog.Close>
                  <Sidebar onNavigate={() => setMenuOpen(false)} />
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
            <p className="text-sm font-medium">Dashboard</p>
          </div>
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            {typeof name === "string" && name.trim() && <span title={name} className="max-w-28 truncate text-sm text-muted-foreground sm:max-w-64">{name}</span>}
            <Button variant="outline" className="min-h-11" disabled={auth.status === "loading"} onClick={() => void logout()}><LogOut aria-hidden="true" /> Keluar</Button>
          </div>
        </header>
        <main id="admin-content" tabIndex={-1} className="mx-auto max-w-7xl space-y-6 p-4 outline-none sm:p-6 lg:p-8">
          <AuthError error={auth.error} />
          {children}
        </main>
      </div>
    </div>
  );
}
