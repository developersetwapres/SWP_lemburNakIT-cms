"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiError, type ApiError, type ApiErrorKind } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { exportLemburs } from "../api";
import type { LemburRequest } from "../filters";
import { runOnce } from "../lock";
import { downloadPdf } from "../pdf";
import { lemburAdminActionsEnabled } from "../query";

const exportMessages: Partial<Record<ApiErrorKind, string>> = {
  unauthorized: "Sesi Anda tidak aktif. Silakan masuk kembali.", forbidden: "Server menolak akses export.",
  not_found: "Endpoint export tidak ditemukan.", csrf: "Sesi atau token CSRF bermasalah.",
  validation: "Filter export tidak dapat diproses.", rate_limited: "Terlalu banyak permintaan export. Tunggu sebentar.",
  server: "Server belum dapat membuat PDF.", network: "Tidak dapat terhubung ke API.",
  configuration: "Konfigurasi koneksi API belum siap.", contract: "Respons export bukan PDF yang valid.",
};

export function exportErrorMessage(error: ApiError) {
  return exportMessages[error.kind] ?? "PDF belum dapat diunduh.";
}

export function ExportLemburButton({ filters }: { filters: LemburRequest }) {
  const auth = useAuth();
  const busy = useRef(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: () => exportLemburs(filters), retry: false });
  const start = () => {
    if (!lemburAdminActionsEnabled(auth)) return;
    void runOnce(busy, async () => {
      setError(null); setSuccess(null);
      try {
        const result = await mutation.mutateAsync();
        downloadPdf(result.blob, result.filename);
        setSuccess(`PDF ${result.filename} berhasil disiapkan.`);
      } catch (cause) {
        const normalized = normalizeApiError(cause);
        setError(normalized);
        if (normalized.kind === "unauthorized" || normalized.kind === "csrf") void auth.refresh().catch(() => {});
      }
    });
  };
  return <div className="flex flex-col items-start gap-2 sm:items-end"><Button type="button" variant="outline" className="min-h-11" disabled={mutation.isPending} onClick={start}><Download aria-hidden="true" />{mutation.isPending ? "Menyiapkan PDF…" : "Export PDF"}</Button>{success && <p role="status" className="text-sm text-green-700">{success}</p>}{error && <p role="alert" className="max-w-sm text-sm text-destructive">{exportErrorMessage(error)}</p>}</div>;
}
