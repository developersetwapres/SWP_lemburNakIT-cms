"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createRunOnce } from "@/features/lembur/lock";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { updatePassword } from "../api";
import { settingsErrorMessage } from "./feedback";

const schema = z.object({ current_password: z.string().min(1, "Password saat ini wajib diisi."), password: z.string().min(1, "Password baru wajib diisi."), password_confirmation: z.string().min(1, "Konfirmasi password wajib diisi.") }).refine((value) => value.password === value.password_confirmation, { path: ["password_confirmation"], message: "Konfirmasi password tidak sama." });
type Values = z.infer<typeof schema>;

export function PasswordSection() {
  const auth = useAuth(); const [runOnce] = useState(() => createRunOnce()); const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { current_password: "", password: "", password_confirmation: "" } });
  const mutation = useMutation({ mutationFn: updatePassword, retry: false });
  const error = mutation.error ? normalizeApiError(mutation.error) : null;
  function submitValues(values: Values) { void runOnce(async () => {
    setSuccess(null); mutation.reset();
    try { await mutation.mutateAsync(values); form.reset(); setSuccess("Password berhasil diperbarui."); }
    catch (cause) {
      const apiError = normalizeApiError(cause);
      for (const field of ["current_password", "password", "password_confirmation"] as const) if (apiError.fields[field]?.[0]) form.setError(field, { type: "server", message: apiError.fields[field][0] });
      if (apiError.kind === "unauthorized" || apiError.kind === "csrf") void auth.refresh().catch(() => {});
    }
  }); }
  const submit = form.handleSubmit(submitValues);
  const field = "h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
  return <section id="password" aria-labelledby="password-title" className="rounded-xl border bg-card p-5 shadow-sm"><h2 id="password-title" className="font-semibold">Ubah password</h2><p className="mt-1 text-sm text-muted-foreground">Aturan lengkap tetap divalidasi oleh Laravel sesuai environment.</p><form onSubmit={submit} aria-busy={mutation.isPending} className="mt-5 grid max-w-2xl gap-4" noValidate><label className="grid gap-2 text-sm font-medium">Password saat ini<input {...form.register("current_password")} type="password" autoComplete="current-password" disabled={mutation.isPending} className={field} />{form.formState.errors.current_password && <span role="alert" className="text-xs text-destructive">{form.formState.errors.current_password.message}</span>}</label><label className="grid gap-2 text-sm font-medium">Password baru<input {...form.register("password")} type="password" autoComplete="new-password" disabled={mutation.isPending} className={field} />{form.formState.errors.password && <span role="alert" className="text-xs text-destructive">{form.formState.errors.password.message}</span>}</label><label className="grid gap-2 text-sm font-medium">Konfirmasi password baru<input {...form.register("password_confirmation")} type="password" autoComplete="new-password" disabled={mutation.isPending} className={field} />{form.formState.errors.password_confirmation && <span role="alert" className="text-xs text-destructive">{form.formState.errors.password_confirmation.message}</span>}</label>{success && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{settingsErrorMessage(error)}</p>}<Button type="submit" className="min-h-11 w-fit" disabled={mutation.isPending}>{mutation.isPending ? "Memperbarui…" : "Ubah password"}</Button></form></section>;
}
