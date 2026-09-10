"use client";

import { useQuery } from "@tanstack/react-query";
import { authView } from "@/lib/auth/access";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { profileOptions } from "../query";
import { SettingsError, SettingsLoading } from "./feedback";
import { PasswordSection } from "./password-section";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";

export function SettingsPage() {
  const auth = useAuth(); const profile = useQuery(profileOptions(auth));
  if (authView(auth, "admin") !== "admin") return null;
  const error = profile.error ? normalizeApiError(profile.error) : null;
  const retry = () => error?.kind === "unauthorized" || error?.kind === "csrf" ? void auth.refresh().catch(() => {}) : void profile.refetch();
  return <div className="space-y-6"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Akun admin</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-muted-foreground">Kelola profile, tinjau keamanan, dan perbarui password.</p></div>
    {error ? <section className="rounded-xl border bg-card p-5"><SettingsError error={error} retry={retry} busy={profile.isFetching} /></section> : profile.isPending || !profile.data ? <SettingsLoading label="Memuat profile" /> : <ProfileSection key={`${profile.data.name}-${profile.data.email}`} profile={profile.data} />}
    <SecuritySection />
    <PasswordSection />
  </div>;
}
