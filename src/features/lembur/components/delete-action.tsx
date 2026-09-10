"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/provider";
import { deleteLembur, type LemburDetail } from "../api";
import { runOnce } from "../lock";
import { withLemburNotice } from "../navigation";
import { invalidateLemburAfterDelete, lemburAdminActionsEnabled, lemburDetailQueryKey } from "../query";
import { DeleteDialog } from "./delete-dialog";

export function DeleteLemburAction({ detail, returnTo }: { detail: LemburDetail; returnTo: string }) {
  const auth = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const busy = useRef(false);
  const mutation = useMutation({ mutationFn: () => deleteLembur(detail.uuid), retry: false });
  if (!detail.can_delete) return null;
  const error = mutation.error ? normalizeApiError(mutation.error) : null;
  const userId = auth.user?.id ?? null;
  const changeOpen = (next: boolean) => {
    if (mutation.isPending) return;
    mutation.reset(); setOpen(next);
  };
  const confirm = () => {
    if (!lemburAdminActionsEnabled(auth)) return;
    void runOnce(busy, async () => {
      try {
        await mutation.mutateAsync();
        setOpen(false);
        await invalidateLemburAfterDelete(queryClient, userId, detail.uuid);
        router.push(withLemburNotice(returnTo, "deleted"));
      } catch (cause) {
        const normalized = normalizeApiError(cause);
        if (normalized.kind === "unauthorized" || normalized.kind === "csrf") void auth.refresh().catch(() => {});
        else if (normalized.kind === "forbidden" || normalized.kind === "not_found" || normalized.kind === "validation") {
          await queryClient.invalidateQueries({ queryKey: lemburDetailQueryKey(userId, detail.uuid), exact: true });
        }
      }
    });
  };
  return <DeleteDialog activity={detail.nama_kegiatan} open={open} pending={mutation.isPending} error={error} onOpenChange={changeOpen} onConfirm={confirm} />;
}
