"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createRunOnce } from "@/features/lembur/lock";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { updateProfile, type Profile } from "../api";
import { invalidateProfile, profileKey } from "../query";
import { settingsErrorMessage } from "./feedback";

const schema = z.object({ name: z.string().trim().min(1, "Nama wajib diisi.").max(255, "Nama maksimal 255 karakter."), email: z.string().trim().min(1, "Email wajib diisi.").email("Format email tidak valid.").max(255) });
type Values = z.infer<typeof schema>;

export function ProfileSection({ profile }: { profile: Profile }) {
  const auth = useAuth(); const queryClient = useQueryClient(); const [runOnce] = useState(() => createRunOnce()); const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: profile.name, email: profile.email } });
  const mutation = useMutation({ mutationFn: updateProfile, retry: false });
  const error = mutation.error ? normalizeApiError(mutation.error) : null;
  function submitValues(values: Values) { void runOnce(async () => {
    setSuccess(null); mutation.reset();
    try {
      const updated = await mutation.mutateAsync({ name: values.name.trim(), email: values.email.trim() });
      const userId = auth.user?.id ?? null; queryClient.setQueryData(profileKey(userId), updated);
      form.reset({ name: updated.name, email: updated.email }); setSuccess(updated.message || "Profil berhasil diperbarui.");
      await invalidateProfile(queryClient, userId);
    } catch (cause) {
      const apiError = normalizeApiError(cause);
      for (const field of ["name", "email"] as const) if (apiError.fields[field]?.[0]) form.setError(field, { type: "server", message: apiError.fields[field][0] });
      if (apiError.kind === "unauthorized" || apiError.kind === "csrf") void auth.refresh().catch(() => {});
    }
  }); }
  const submit = form.handleSubmit(submitValues);
  const field = "h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
  return <section id="profile" aria-labelledby="profile-title" className="rounded-xl border bg-card p-5 shadow-sm"><h2 id="profile-title" className="font-semibold">Profile</h2><p className="mt-1 text-sm text-muted-foreground">Perbarui nama dan email akun admin.</p><form onSubmit={submit} aria-busy={mutation.isPending} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate><label className="grid gap-2 text-sm font-medium">Nama<input {...form.register("name")} autoComplete="name" disabled={mutation.isPending} className={field} />{form.formState.errors.name && <span role="alert" className="text-xs text-destructive">{form.formState.errors.name.message}</span>}</label><label className="grid gap-2 text-sm font-medium">Email<input {...form.register("email")} type="email" autoComplete="email" disabled={mutation.isPending} className={field} />{form.formState.errors.email && <span role="alert" className="text-xs text-destructive">{form.formState.errors.email.message}</span>}</label><dl className="grid gap-3 text-sm sm:col-span-2 sm:grid-cols-3"><div><dt className="text-muted-foreground">Peran</dt><dd className="font-medium">{profile.role.join(", ") || "Tidak tersedia"}</dd></div><div><dt className="text-muted-foreground">Kode biro</dt><dd className="font-medium">{profile.kode_biro || "Tidak tersedia"}</dd></div><div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{profile.is_active ? "Aktif" : "Tidak aktif"}</dd></div></dl><div className="space-y-3 sm:col-span-2">{success && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{settingsErrorMessage(error)}</p>}<Button type="submit" className="min-h-11" disabled={mutation.isPending}>{mutation.isPending ? "Menyimpan…" : "Simpan profile"}</Button></div></form></section>;
}
