"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { bulkLockLemburs, type LemburList } from "../api";
import { runOnce } from "../lock";
import { invalidateLemburAfterBulkLock, lemburAdminActionsEnabled } from "../query";
import { clearLemburSelection, selectedLemburRows, selectedNumericIds, toggleAllEligibleLemburs, toggleLemburSelection } from "../selection";
import { BulkLockDialog } from "./bulk-lock-dialog";
import { LemburTable } from "./list";

export function BulkLockPanel({ list, updating, returnTo, onSuccess }: { list: LemburList; updating: boolean; returnTo: string; onSuccess: (message: string) => void }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const busy = useRef(false);
  const mutation = useMutation({ mutationFn: bulkLockLemburs, retry: false });
  const selectedRows = selectedLemburRows(list.rows, selectedIds);
  const mutationError = mutation.error ? normalizeApiError(mutation.error) : null;

  const changeDialog = (open: boolean) => {
    if (mutation.isPending) return;
    mutation.reset();
    setDialogOpen(open);
  };
  const confirm = () => {
    if (!lemburAdminActionsEnabled(auth) || updating || selectedRows.length === 0) return;
    const numericIds = selectedNumericIds(list.rows, selectedIds);
    const uuids = selectedRows.map((row) => row.uuid);
    const userId = auth.user?.id ?? null;
    void runOnce(busy, async () => {
      try {
        const result = await mutation.mutateAsync(numericIds);
        setSelectedIds(clearLemburSelection());
        setDialogOpen(false);
        onSuccess(`${result.lockedCount} data lembur berhasil dikunci.`);
        await invalidateLemburAfterBulkLock(queryClient, userId, uuids);
      } catch (cause) {
        const error = normalizeApiError(cause);
        if (error.kind === "unauthorized" || error.kind === "csrf") void auth.refresh().catch(() => {});
        else if (error.kind === "forbidden" || error.kind === "not_found" || error.kind === "validation") {
          await queryClient.invalidateQueries({ queryKey: ["admin", "lembur", "list", userId] });
        }
      }
    });
  };

  return <div className="space-y-3"><div className="flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"><p aria-live="polite" className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{selectedRows.length}</span> data dipilih</p>{selectedRows.length > 0 && <BulkLockDialog count={selectedRows.length} open={dialogOpen} pending={mutation.isPending} disabled={updating} error={mutationError} onOpenChange={changeDialog} onConfirm={confirm} />}</div><LemburTable list={list} updating={updating} returnTo={returnTo} selection={{ selectedIds, disabled: updating, onToggle: (row) => setSelectedIds((current) => toggleLemburSelection(current, row)), onToggleAll: () => setSelectedIds((current) => toggleAllEligibleLemburs(list.rows, current)) }} /></div>;
}
