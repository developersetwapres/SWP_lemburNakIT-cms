"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { runOnce } from "@/features/lembur/lock";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { confirmPassword } from "../api";
import { passwordConfirmationKey, passwordConfirmationOptions, securityOptions } from "../query";
import { SettingsError, SettingsLoading, settingsErrorMessage } from "./feedback";

function PasswordConfirmation({ onConfirmed }: { onConfirmed: () => Promise<void> }) {
  const auth = useAuth(); const queryClient = useQueryClient(); const busy = useRef(false); const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: confirmPassword, retry: false });
  const error = mutation.error ? normalizeApiError(mutation.error) : null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); if (!password || mutation.isPending) return;
    void runOnce(busy, async () => {
      mutation.reset();
      try {
        await mutation.mutateAsync(password); setPassword("");
        queryClient.setQueryData(passwordConfirmationKey(auth.user?.id ?? null), true); await onConfirmed();
      } catch (cause) { const failure = normalizeApiError(cause); if (failure.kind === "unauthorized" || failure.kind === "csrf") void auth.refresh().catch(() => {}); }
    });
  };
  return <form onSubmit={submit} className="space-y-4"><p className="text-sm text-muted-foreground">Konfirmasikan password akun untuk membuka informasi keamanan. Konfirmasi ini menggunakan sesi Fortify yang sudah ada.</p><label className="grid max-w-md gap-2 text-sm font-medium">Password saat ini<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={mutation.isPending} className="h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{settingsErrorMessage(error)}</p>}<Button type="submit" className="min-h-11" disabled={!password || mutation.isPending}>{mutation.isPending ? "Mengonfirmasi…" : "Konfirmasi password"}</Button></form>;
}

export function SecuritySection() {
  const auth = useAuth();
  const confirmation = useQuery(passwordConfirmationOptions(auth));
  const confirmed = confirmation.data === true;
  const security = useQuery(securityOptions(auth, confirmed));
  const confirmationError = confirmation.error ? normalizeApiError(confirmation.error) : null;
  const securityError = security.error ? normalizeApiError(security.error) : null;
  const checkSession = () => void auth.refresh().catch(() => {});
  const retryConfirmation = () => confirmationError?.kind === "unauthorized" || confirmationError?.kind === "csrf" ? checkSession() : void confirmation.refetch();
  const refetchSecurity = async () => { await security.refetch(); };
  return <section id="security" aria-labelledby="security-title" className="rounded-xl border bg-card p-5 shadow-sm"><h2 id="security-title" className="font-semibold">Security</h2><p className="mt-1 text-sm text-muted-foreground">Informasi keamanan diambil sekali setelah password dikonfirmasi dan tidak dipolling otomatis.</p><div className="mt-5">
    {confirmationError ? <SettingsError error={confirmationError} retry={retryConfirmation} busy={confirmation.isFetching} /> : confirmation.isPending ? <SettingsLoading label="Memeriksa status konfirmasi password" /> : !confirmed || securityError?.kind === "password_confirmation" ? <PasswordConfirmation onConfirmed={refetchSecurity} /> : securityError ? <SettingsError error={securityError} retry={securityError.kind === "unauthorized" || securityError.kind === "csrf" ? checkSession : refetchSecurity} busy={security.isFetching} /> : security.isPending || !security.data ? <SettingsLoading label="Memuat informasi keamanan" /> : <div className="space-y-5"><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Two-factor authentication</dt><dd className="mt-1 font-medium">{security.data.canManageTwoFactor ? security.data.twoFactorEnabled ? "Aktif" : "Tidak aktif" : "Tidak tersedia"}</dd></div><div><dt className="text-sm text-muted-foreground">Passkey</dt><dd className="mt-1 font-medium">{security.data.canManagePasskeys ? `${security.data.passkeys.length} terdaftar` : "Tidak tersedia"}</dd></div><div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Aturan password</dt><dd className="mt-1 text-sm font-medium">{security.data.passwordRules}</dd></div></dl>{security.data.canManagePasskeys && <div><h3 className="text-sm font-semibold">Passkey terdaftar</h3>{security.data.passkeys.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Belum ada passkey.</p> : <ul className="mt-3 divide-y rounded-lg border">{security.data.passkeys.map((passkey) => <li key={String(passkey.id)} className="p-3 text-sm"><p className="font-medium">{passkey.name}</p><p className="mt-1 text-muted-foreground">{passkey.authenticator} · dibuat {passkey.created_at_diff}{passkey.last_used_at_diff ? ` · terakhir digunakan ${passkey.last_used_at_diff}` : ""}</p></li>)}</ul>}</div>}</div>}
  </div></section>;
}
