import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { parseJsonApi, type JsonApiResource } from "@/lib/jsonapi";
import { parseLemburHistory, type LemburHistory } from "@/features/lembur/api";
import { toHistoryApiParams, toPegawaiApiParams, type PegawaiHistoryRequest, type PegawaiListRequest } from "./filters";

const pegawaiAttributesSchema = z.object({
  uuid: z.string().uuid(), name: z.string(), email: z.string().optional(), image: z.string().nullable().optional(),
  jabatan: z.string().nullable(), nip: z.string().nullable(), kode_biro: z.string().nullable(), is_active: z.boolean(),
  lemburs_count: z.number().int().nonnegative().optional(),
}).passthrough();
const filtersSchema = z.object({ search: z.string(), status: z.string().nullable() });
const paginationSchema = z.object({
  current_page: z.number().int().min(1), last_page: z.number().int().min(1), per_page: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(), from: z.number().int().nullable(), to: z.number().int().nullable(),
});

export type Pegawai = z.infer<typeof pegawaiAttributesSchema> & { id: string };
export type PegawaiList = { rows: Pegawai[]; filters: z.infer<typeof filtersSchema>; pagination: z.infer<typeof paginationSchema> };
export type PegawaiUpdate = { name: string; jabatan: string | null; nip: string | null; is_active: boolean; password?: string };

function parsePegawaiResource(resource: JsonApiResource): Pegawai {
  if (resource.type !== "users" || !/^\d+$/.test(resource.id)) throw new ApiError("Invalid pegawai resource.", "contract");
  const attributes = pegawaiAttributesSchema.safeParse(resource.attributes);
  if (!attributes.success) throw new ApiError("Invalid pegawai attributes.", "contract");
  return { id: resource.id, ...attributes.data };
}

export function parsePegawaiList(input: unknown): PegawaiList {
  const document = parseJsonApi(input);
  if (!Array.isArray(document.data)) throw new ApiError("Invalid pegawai collection.", "contract");
  const filters = filtersSchema.safeParse(document.meta?.filters);
  const pagination = paginationSchema.safeParse(document.meta);
  if (!filters.success || !pagination.success) throw new ApiError("Invalid pegawai list metadata.", "contract");
  return { rows: document.data.map(parsePegawaiResource), filters: filters.data, pagination: pagination.data };
}

export function parsePegawaiDetail(input: unknown): Pegawai {
  const document = parseJsonApi(input);
  if (!document.data || Array.isArray(document.data)) throw new ApiError("Invalid pegawai detail resource.", "contract");
  return parsePegawaiResource(document.data);
}

export async function getPegawaiList(filters: PegawaiListRequest, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/api/admin/pegawai", { params: toPegawaiApiParams(filters), signal });
  return parsePegawaiList(response.data);
}

export async function getPegawaiDetail(uuid: string, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>(`/api/admin/pegawai/${encodeURIComponent(uuid)}`, { signal });
  return parsePegawaiDetail(response.data);
}

export async function getPegawaiHistory(uuid: string, filters: PegawaiHistoryRequest, signal?: AbortSignal): Promise<LemburHistory> {
  const response = await apiClient.get<unknown>(`/api/admin/pegawai/${encodeURIComponent(uuid)}/lemburs`, { params: toHistoryApiParams(filters), signal });
  return parseLemburHistory(response.data);
}

export async function updatePegawai(uuid: string, payload: PegawaiUpdate) {
  const response = await apiClient.put<unknown>(`/api/admin/pegawai/${encodeURIComponent(uuid)}`, payload);
  return parsePegawaiDetail(response.data);
}
