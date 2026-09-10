"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/provider";
import { authView, type AuthOperation } from "@/lib/auth/access";
import { AuthError, AuthLoading } from "./feedback";
import { ChallengeForm, LoginForm } from "./forms";

export function AuthScreen({ entry, children }: { entry: "login" | "admin"; children?: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const [operation, setOperation] = useState<AuthOperation>(null);
  const submitting = useRef(false);
  const view = authView(auth, entry, operation);

  useEffect(() => {
    if (view === "redirect_admin") router.replace("/admin");
    if (view === "redirect_login") router.replace("/login");
  }, [view, router]);

  async function perform(action: Exclude<AuthOperation, null>, task: () => Promise<void>) {
    if (submitting.current || auth.status === "loading") return;
    submitting.current = true;
    setOperation(action);
    try { await task(); } catch { /* AuthProvider exposes the normalized error. */ }
    finally { submitting.current = false; setOperation(null); }
  }

  const busy = operation !== null || auth.status === "loading";
  if (view === "admin" && children) return children;
  const title = view === "challenge" ? "Verifikasi dua langkah"
    : view === "denied" ? "Akses ditolak"
    : view === "admin" ? "Akses admin terkonfirmasi"
    : view === "error" ? "Sesi belum dapat diperiksa"
    : "SWP Lembur CMS";

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <section aria-labelledby="auth-title" className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 id="auth-title" className="text-xl font-semibold">{title}</h1>
        <AuthError error={auth.error} />
        {view === "loading" && <AuthLoading label={operation === "logout" ? "Mengakhiri sesi…" : undefined} />}
        {(view === "redirect_admin" || view === "redirect_login") && <AuthLoading label="Mengalihkan halaman…" />}
        {view === "login" && <LoginForm busy={busy} error={auth.error} onSubmit={(payload) => perform("login", () => auth.login(payload))} />}
        {view === "challenge" && <ChallengeForm busy={busy} error={auth.error} onSubmit={(payload) => perform("challenge", () => auth.challenge(payload))} />}
        {view === "denied" && <p className="text-sm text-muted-foreground">Akun ini belum mendapat izin untuk mengakses admin.</p>}
        {(view === "admin" || view === "denied") && <Button type="button" disabled={busy} onClick={() => void perform("logout", auth.logout)}>Keluar</Button>}
        {(view === "error" || auth.error?.kind === "csrf") && <Button type="button" variant="outline" disabled={busy} onClick={() => void perform("refresh", auth.refresh)}>Periksa kembali sesi</Button>}
      </section>
    </main>
  );
}
