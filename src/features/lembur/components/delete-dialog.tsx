"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError, ApiErrorKind } from "@/lib/api/errors";
import { lockDialogActions } from "../lock";

const deleteMessages: Partial<Record<ApiErrorKind, string>> = {
  unauthorized: "Sesi Anda tidak aktif. Silakan masuk kembali.",
  forbidden: "Data tidak dapat dihapus karena telah dikunci atau akses ditolak server.",
  not_found: "Data lembur tidak ditemukan.", csrf: "Sesi atau token CSRF bermasalah.",
  validation: "Permintaan hapus tidak dapat diproses.", rate_limited: "Terlalu banyak permintaan. Tunggu sebentar.",
  server: "Server belum dapat menghapus data lembur.", network: "Tidak dapat terhubung ke API.",
  configuration: "Konfigurasi koneksi API belum siap.", contract: "Respons hapus tidak sesuai kontrak.",
};

export function deleteErrorMessage(error: ApiError) {
  return deleteMessages[error.kind] ?? "Data lembur belum dapat dihapus.";
}

export function DeleteConfirmationContent({ activity, pending, error, onCancel, onConfirm }: { activity: string; pending: boolean; error: ApiError | null; onCancel: () => void; onConfirm: () => void }) {
  const actions = lockDialogActions(onCancel, onConfirm);
  return <><div className="flex items-start gap-3"><span className="rounded-full bg-destructive/10 p-2 text-destructive"><Trash2 aria-hidden="true" className="size-5" /></span><div><Dialog.Title className="text-lg font-semibold">Hapus data lembur?</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">{activity}</span> akan dihapus permanen. Dokumentasi dan foto terkait juga dihapus oleh server.</Dialog.Description></div></div>{error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{deleteErrorMessage(error)}</p>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={actions.cancel}>Batal</Button><Button type="button" variant="destructive" className="min-h-11" disabled={pending} onClick={actions.confirm}>{pending ? "Menghapus…" : "Hapus permanen"}</Button></div></>;
}

export function DeleteDialog({ activity, open, pending, error, onOpenChange, onConfirm }: { activity: string; open: boolean; pending: boolean; error: ApiError | null; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Trigger render={<Button variant="destructive" className="min-h-11" />}><Trash2 aria-hidden="true" /> Hapus</Dialog.Trigger><Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 transition-opacity" /><Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-2xl outline-none"><DeleteConfirmationContent activity={activity} pending={pending} error={error} onCancel={() => onOpenChange(false)} onConfirm={onConfirm} /></Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
