"use client";

import { useSearchParams } from "next/navigation";
import { safePegawaiReturnTo } from "../navigation";
import { PegawaiDetailPage } from "./detail-page";
import { PegawaiNotFound } from "./states";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function PegawaiDetailRoute() {
  const searchParams = useSearchParams();
  const uuid = searchParams.get("uuid")?.trim() ?? "";
  const returnTo = safePegawaiReturnTo(searchParams.get("returnTo") ?? undefined);

  if (!uuidPattern.test(uuid)) return <PegawaiNotFound returnTo={returnTo} />;
  return <PegawaiDetailPage uuid={uuid} returnTo={returnTo} />;
}
