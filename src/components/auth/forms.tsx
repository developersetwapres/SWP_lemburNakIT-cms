"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";
import type { LoginPayload, TwoFactorPayload } from "@/lib/auth/service";

const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const loginSchema = z.object({
  email: z.string().trim().email("Masukkan alamat email yang valid."),
  password: z.string().min(1, "Password wajib diisi."),
  remember: z.boolean(),
});

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="text-sm text-destructive">{message}</p> : null;
}

export function LoginForm({ busy, error, onSubmit }: {
  busy: boolean; error: ApiError | null; onSubmit: (payload: LoginPayload) => Promise<void>;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: false },
  });
  const pending = busy || isSubmitting;
  const emailError = errors.email?.message ?? error?.fields.email?.[0];
  const passwordError = errors.password?.message ?? error?.fields.password?.[0];
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={pending} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input {...register("email")} id="email" type="email" autoComplete="username" autoCapitalize="none" required disabled={pending} aria-invalid={!!emailError} aria-describedby={emailError ? "email-error" : undefined} className={inputClass} />
        <FieldError id="email-error" message={emailError} />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input {...register("password")} id="password" type="password" autoComplete="current-password" required disabled={pending} aria-invalid={!!passwordError} aria-describedby={passwordError ? "password-error" : undefined} className={inputClass} />
        <FieldError id="password-error" message={passwordError} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input {...register("remember")} type="checkbox" disabled={pending} className="size-4 accent-primary" /> Ingat saya
      </label>
      <Button type="submit" disabled={pending} className="h-10 w-full">
        {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}{pending ? "Sedang masuk…" : "Masuk"}
      </Button>
    </form>
  );
}

export function ChallengeForm({ busy, error, onSubmit }: {
  busy: boolean; error: ApiError | null; onSubmit: (payload: TwoFactorPayload) => Promise<void>;
}) {
  const [recovery, setRecovery] = useState(false);
  const schema = z.object({ value: recovery
    ? z.string().trim().min(1, "Recovery code wajib diisi.")
    : z.string().regex(/^\d{6}$/, "Masukkan kode 6 digit."),
  });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema), defaultValues: { value: "" },
  });
  const pending = busy || isSubmitting;
  const field = recovery ? "recovery_code" : "code";
  const message = errors.value?.message ?? error?.fields[field]?.[0];
  return (
    <form noValidate aria-busy={pending} className="space-y-5" onSubmit={handleSubmit(async ({ value }) => {
      await onSubmit(recovery ? { recovery_code: value } : { code: value });
      reset();
    })}>
      <div className="space-y-2">
        <label htmlFor="verification-code" className="text-sm font-medium">{recovery ? "Recovery code" : "Kode autentikator"}</label>
        <input {...register("value")} key={field} id="verification-code" type="text" autoComplete="one-time-code" inputMode={recovery ? "text" : "numeric"} maxLength={recovery ? undefined : 6} spellCheck={false} autoCapitalize="none" required disabled={pending} aria-invalid={!!message} aria-describedby={message ? "code-error" : undefined} className={inputClass} />
        <FieldError id="code-error" message={message} />
      </div>
      <Button type="submit" disabled={pending} className="h-10 w-full">
        {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}{pending ? "Memverifikasi…" : "Verifikasi"}
      </Button>
      <Button type="button" variant="link" disabled={pending} className="h-auto w-full whitespace-normal" onClick={() => { setRecovery(!recovery); reset(); }}>
        {recovery ? "Gunakan kode autentikator" : "Gunakan recovery code"}
      </Button>
    </form>
  );
}
