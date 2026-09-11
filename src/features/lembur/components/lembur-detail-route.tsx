"use client";

import { useSearchParams } from "next/navigation";
import { safeLemburReturnTo } from "../navigation";
import { LemburDetailPage } from "./lembur-detail-page";
import { LemburDetailNotFound } from "./detail-states";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function LemburDetailRoute() {
  const searchParams = useSearchParams();
  const uuid = searchParams.get("uuid")?.trim() ?? "";
  const returnTo = safeLemburReturnTo(searchParams.get("returnTo") ?? undefined);

  if (!uuidPattern.test(uuid)) return <LemburDetailNotFound returnTo={returnTo} />;
  return <LemburDetailPage uuid={uuid} returnTo={returnTo} />;
}
