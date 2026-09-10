"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { createRunOnce } from "@/features/lembur/lock";
import { updatePegawai, type Pegawai } from "../api";
import { invalidatePegawaiAfterUpdate, pegawaiDetailKey } from "../query";
import { pegawaiErrorMessage } from "./states";

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi.").max(255, "Nama maksimal 255 karakter."),
  jabatan: z.string().trim().max(255, "Jabatan maksimal 255 karakter."),
  nip: z.string().trim().max(50, "NIP maksimal 50 karakter."),
  is_active: z.boolean(),
  password: z.string().max(255, "Password maksimal 255 karakter.").refine((value) => value.length === 0 || value.length >= 8, "Password minimal 8 karakter."),
});
type Values = z.infer<typeof schema>;

export function PegawaiEditForm({ pegawai }: { pegawai: Pegawai }) {
  const auth = useAuth(); const queryClient = useQueryClient(); const [runOnce] = useState(() => createRunOnce());
  const [feedback, setFeedback] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: (values: Values) => updatePegawai(pegawai.uuid, {
    name: values.name.trim(), jabatan: values.jabatan.trim() || null, nip: values.nip.trim() || null,
    is_active: values.is_active, ...(values.password ? { password: values.password } : {}),
  }), retry: false });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: pegawai.name, jabatan: pegawai.jabatan ?? "", nip: pegawai.nip ?? "", is_active: pegawai.is_active, password: "" } });
  const apiError = mutation.error ? normalizeApiError(mutation.error) : null;
  function submitValues(values: Values) { void runOnce(async () => {
    setFeedback(null); mutation.reset();
    try {
      const updated = await mutation.mutateAsync(values);
      const userId = auth.user?.id ?? null;
      queryClient.setQueryData(pegawaiDetailKey(userId, pegawai.uuid), updated);
      form.reset({ name: updated.name, jabatan: updated.jabatan ?? "", nip: updated.nip ?? "", is_active: updated.is_active, password: "" });
      setFeedback("Data pegawai berhasil diperbarui.");
      await invalidatePegawaiAfterUpdate(queryClient, userId, pegawai.uuid);
    } catch (cause) {
      const error = normalizeApiError(cause);
      for (const field of ["name", "jabatan", "nip", "is_active", "password"] as const) {
        if (error.fields[field]?.[0]) form.setError(field, { type: "server", message: error.fields[field][0] });
      }
      if (error.kind === "unauthorized" || error.kind === "csrf") void auth.refresh().catch(() => {});
    }
  }); }
  const submit = form.handleSubmit(submitValues);
  const fieldClass = "h-11 rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
  return <section aria-labelledby="edit-title" className="rounded-xl border bg-card p-5 shadow-sm"><h2 id="edit-title" className="font-semibold">Edit pegawai</h2><p className="mt-1 text-sm text-muted-foreground">Email, kode biro, peran, dan foto dikelola oleh sistem dan tidak dapat diubah di sini.</p>
    <form onSubmit={submit} aria-busy={mutation.isPending} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
      <label className="grid gap-2 text-sm font-medium">Nama<input {...form.register("name")} autoComplete="name" disabled={mutation.isPending} className={fieldClass} />{form.formState.errors.name && <span role="alert" className="text-xs text-destructive">{form.formState.errors.name.message}</span>}</label>
      <label className="grid gap-2 text-sm font-medium">Jabatan<input {...form.register("jabatan")} disabled={mutation.isPending} className={fieldClass} />{form.formState.errors.jabatan && <span role="alert" className="text-xs text-destructive">{form.formState.errors.jabatan.message}</span>}</label>
      <label className="grid gap-2 text-sm font-medium">NIP<input {...form.register("nip")} disabled={mutation.isPending} className={fieldClass} />{form.formState.errors.nip && <span role="alert" className="text-xs text-destructive">{form.formState.errors.nip.message}</span>}</label>
      <label className="grid gap-2 text-sm font-medium">Status<select {...form.register("is_active", { setValueAs: (value) => value === "true" })} disabled={mutation.isPending} className={fieldClass}><option value="true">Aktif</option><option value="false">Tidak aktif</option></select>{form.formState.errors.is_active && <span role="alert" className="text-xs text-destructive">{form.formState.errors.is_active.message}</span>}</label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">Password baru <span className="font-normal text-muted-foreground">(opsional)</span><input {...form.register("password")} type="password" autoComplete="new-password" disabled={mutation.isPending} className={fieldClass} />{form.formState.errors.password && <span role="alert" className="text-xs text-destructive">{form.formState.errors.password.message}</span>}</label>
      <div className="space-y-3 sm:col-span-2">{feedback && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{feedback}</p>}{apiError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{pegawaiErrorMessage(apiError)}</p>}<Button type="submit" className="min-h-11" disabled={mutation.isPending}>{mutation.isPending ? "Menyimpan…" : "Simpan perubahan"}</Button></div>
    </form>
  </section>;
}
