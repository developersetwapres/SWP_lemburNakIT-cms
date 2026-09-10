"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiError } from "@/lib/api/errors";
import { authView } from "@/lib/auth/access";
import { useAuth } from "@/lib/auth/provider";
import { lockLembur } from "../api";
import { runOnce } from "../lock";
import { invalidateLemburAfterLock, lemburDetailQueryKey, lemburDetailQueryOptions } from "../query";
import { LemburDetailContent } from "./detail-content";
import { LemburDetailError, LemburDetailLoading, LemburDetailNotFound } from "./detail-states";
import { LockDialog } from "./lock-dialog";
import { DeleteLemburAction } from "./delete-action";

export function LemburDetailPage({ uuid, returnTo }: { uuid: string; returnTo: string }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery(lemburDetailQueryOptions(auth, uuid));
  const mutation = useMutation({ mutationFn: () => lockLembur(uuid), retry: false });
  const busy = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (authView(auth, "admin") !== "admin") return null;

  const detailError = query.error ? normalizeApiError(query.error) : null;
  if (detailError?.kind === "not_found") return <LemburDetailNotFound returnTo={returnTo} />;
  if (detailError) {
    const retry = () => {
      if (detailError.kind === "unauthorized" || detailError.kind === "csrf") void auth.refresh().catch(() => {});
      else void query.refetch();
    };
    return <LemburDetailError error={detailError} returnTo={returnTo} retry={retry} busy={query.isFetching} />;
  }
  if (query.isPending || !query.data) return <LemburDetailLoading />;

  const detail = query.data;
  const mutationError = mutation.error ? normalizeApiError(mutation.error) : null;
  const userId = auth.user?.id ?? null;
  const confirmLock = () => {
    void runOnce(busy, async () => {
      setSuccess(null);
      try {
        const updated = await mutation.mutateAsync();
        if (updated) queryClient.setQueryData(lemburDetailQueryKey(userId, uuid), updated);
        setDialogOpen(false);
        setSuccess("Data lembur berhasil dikunci.");
        await invalidateLemburAfterLock(queryClient, userId, uuid);
      } catch (cause) {
        const error = normalizeApiError(cause);
        if (error.kind === "unauthorized" || error.kind === "csrf") {
          void auth.refresh().catch(() => {});
        } else if (error.kind === "forbidden" || error.kind === "not_found" || error.kind === "validation") {
          await queryClient.invalidateQueries({ queryKey: lemburDetailQueryKey(userId, uuid), exact: true });
        }
      }
    });
  };
  const changeDialog = (open: boolean) => {
    if (mutation.isPending) return;
    mutation.reset();
    setDialogOpen(open);
  };

  return <div className="space-y-5">
    <Button render={<Link href={returnTo} />} variant="ghost" className="min-h-11"><ArrowLeft aria-hidden="true" /> Kembali ke Lembur</Button>
    {success && <p role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"><CircleCheck aria-hidden="true" className="size-4 shrink-0" />{success}</p>}
    <LemburDetailContent detail={detail} lockAction={<LockDialog open={dialogOpen} pending={mutation.isPending} error={mutationError} onOpenChange={changeDialog} onConfirm={confirmLock} />} deleteAction={<DeleteLemburAction detail={detail} returnTo={returnTo} />} />
  </div>;
}
