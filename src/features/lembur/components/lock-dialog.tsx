"use client";

import { Dialog } from "@base-ui/react/dialog";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";
import { lockDialogActions } from "../lock";
import { lockErrorMessage } from "./detail-states";

export function LockConfirmationContent({ pending, error, onCancel, onConfirm }: { pending: boolean; error: ApiError | null; onCancel: () => void; onConfirm: () => void }) {
  const actions = lockDialogActions(onCancel, onConfirm);
  return <><div className="flex items-start gap-3"><span className="rounded-full bg-amber-100 p-2 text-amber-700"><LockKeyhole aria-hidden="true" className="size-5" /></span><div><Dialog.Title className="text-lg font-semibold">Kunci data lembur?</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">Data akan diubah menjadi Locked dan tidak dapat dikembalikan melalui CMS. Pastikan seluruh informasi sudah benar.</Dialog.Description></div></div>{error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{lockErrorMessage(error)}</p>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={actions.cancel}>Batal</Button><Button type="button" className="min-h-11" disabled={pending} onClick={actions.confirm}>{pending ? "Mengunci…" : "Konfirmasi Lock"}</Button></div></>;
}

export function LockDialog({ open, pending, error, onOpenChange, onConfirm }: { open: boolean; pending: boolean; error: ApiError | null; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Trigger render={<Button className="min-h-11" />}><LockKeyhole aria-hidden="true" /> Lock lembur</Dialog.Trigger><Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 transition-opacity" /><Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-2xl outline-none"><LockConfirmationContent pending={pending} error={error} onCancel={() => onOpenChange(false)} onConfirm={onConfirm} /></Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
