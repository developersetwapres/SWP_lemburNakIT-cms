import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { indexIncluded, parseJsonApi, resolveRelationship } from "@/lib/jsonapi";
import { toLemburApiParams, toLemburExportParams, type LemburRequest } from "./filters";
import { assertPdfBlob, pdfFilenameFromDisposition } from "./pdf";

const attributesSchema = z.object({
  uuid: z.string(), tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nama_kegiatan: z.string(), lokasi_kegiatan: z.string(),
  foto_kegiatan_url: z.string().nullable(),
  foto_kegiatan_at: z.string().nullable(),
  foto_pulang_url: z.string().nullable(),
  foto_pulang_at: z.string().nullable(),
  jenis_hari: z.enum(["hari_kerja", "hari_libur"]),
  upah: z.number().int().nonnegative(), status: z.enum(["draft", "complete", "locked"]),
  waktu_pulang: z.string().nullable(), can_lock: z.boolean(), can_delete: z.boolean(),
  locked_at: z.string().nullable(),
}).passthrough();
const employeeSchema = z.object({
  uuid: z.string(), name: z.string(), nip: z.string().nullable(), jabatan: z.string().nullable(),
}).passthrough();
const filtersSchema = z.object({
  bulan: z.string(), pegawai: z.string().nullable(), status: z.string(), jenis_hari: z.string(), search: z.string(),
});
const employeeOptionSchema = z.object({ uuid: z.string(), name: z.string(), nip: z.string().nullable() });
const paginationSchema = z.object({
  current_page: z.number().int().min(1), last_page: z.number().int().min(1), per_page: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(), from: z.number().int().nullable(), to: z.number().int().nullable(),
});
const bulkLockResultSchema = z.object({ locked_count: z.number().int().nonnegative() });

export type LemburRow = z.infer<typeof attributesSchema> & {
  id: string; pegawai: z.infer<typeof employeeSchema> | null;
};
export type LemburDetail = LemburRow & {
  lockedBy: z.infer<typeof employeeSchema> | null;
};
export type LemburList = {
  rows: LemburRow[]; filters: z.infer<typeof filtersSchema>;
  pegawaiOptions: z.infer<typeof employeeOptionSchema>[]; pagination: z.infer<typeof paginationSchema>;
};
export type LemburHistory = Omit<LemburList, "pegawaiOptions">;
export type BulkLockResult = { id: string; lockedCount: number };

export function numericLemburId(id: string) {
  if (!/^\d+$/.test(id)) throw new ApiError("Invalid lembur database identifier.", "contract");
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value < 1) throw new ApiError("Invalid lembur database identifier.", "contract");
  return value;
}

function parseLemburCollection(input: unknown) {
  const document = parseJsonApi(input);
  if (!Array.isArray(document.data)) throw new ApiError("Invalid lembur collection.", "contract");
  const filters = filtersSchema.safeParse(document.meta?.filters);
  const pagination = paginationSchema.safeParse(document.meta);
  if (!filters.success || !pagination.success) throw new ApiError("Invalid lembur list metadata.", "contract");
  const included = indexIncluded(document);
  const rows = document.data.map((resource): LemburRow => {
    if (resource.type !== "lemburs") throw new ApiError("Invalid lembur resource.", "contract");
    numericLemburId(resource.id);
    const attributes = attributesSchema.safeParse(resource.attributes);
    if (!attributes.success) throw new ApiError("Invalid lembur attributes.", "contract");
    const related = resolveRelationship(resource, "user", included);
    if (Array.isArray(related)) throw new ApiError("Invalid lembur user relationship.", "contract");
    if (related && related.type !== "users") throw new ApiError("Invalid lembur user resource type.", "contract");
    const employee = related ? employeeSchema.safeParse(related.attributes) : null;
    if (employee && !employee.success) throw new ApiError("Invalid lembur employee resource.", "contract");
    return { id: resource.id, ...attributes.data, pegawai: employee?.data ?? null };
  });
  return { rows, filters: filters.data, pagination: pagination.data };
}

export function parseLemburList(input: unknown): LemburList {
  const parsed = parseLemburCollection(input);
  const document = parseJsonApi(input);
  const options = z.array(employeeOptionSchema).safeParse(document.meta?.pegawaiOptions);
  if (!options.success) throw new ApiError("Invalid lembur employee options.", "contract");
  return { ...parsed, pegawaiOptions: options.data };
}

export function parseLemburHistory(input: unknown): LemburHistory {
  return parseLemburCollection(input);
}

function parseEmployeeRelationship(
  resource: Parameters<typeof resolveRelationship>[0],
  name: string,
  included: ReturnType<typeof indexIncluded>,
) {
  const related = resolveRelationship(resource, name, included);
  if (Array.isArray(related)) throw new ApiError(`Invalid lembur ${name} relationship.`, "contract");
  if (related && related.type !== "users") throw new ApiError(`Invalid lembur ${name} resource type.`, "contract");
  if (!related) return null;
  const employee = employeeSchema.safeParse(related.attributes);
  if (!employee.success) throw new ApiError(`Invalid lembur ${name} resource.`, "contract");
  return employee.data;
}

export function parseLemburDetail(input: unknown): LemburDetail {
  const document = parseJsonApi(input);
  if (!document.data || Array.isArray(document.data) || document.data.type !== "lemburs") {
    throw new ApiError("Invalid lembur detail resource.", "contract");
  }
  numericLemburId(document.data.id);
  const attributes = attributesSchema.safeParse(document.data.attributes);
  if (!attributes.success) throw new ApiError("Invalid lembur detail attributes.", "contract");
  const included = indexIncluded(document);
  return {
    id: document.data.id,
    ...attributes.data,
    pegawai: parseEmployeeRelationship(document.data, "user", included),
    lockedBy: parseEmployeeRelationship(document.data, "lockedBy", included),
  };
}

export function parseBulkLockResult(input: unknown): BulkLockResult {
  const document = parseJsonApi(input);
  if (!document.data || Array.isArray(document.data) || document.data.type !== "bulk-lock-results") {
    throw new ApiError("Invalid bulk lock result resource.", "contract");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(document.data.id)) {
    throw new ApiError("Invalid bulk lock result identifier.", "contract");
  }
  const attributes = bulkLockResultSchema.safeParse(document.data.attributes);
  if (!attributes.success) throw new ApiError("Invalid bulk lock result attributes.", "contract");
  return { id: document.data.id, lockedCount: attributes.data.locked_count };
}

export async function getLemburList(filters: LemburRequest, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/api/admin/lemburs", { params: toLemburApiParams(filters), signal });
  return parseLemburList(response.data);
}

export async function getLemburDetail(uuid: string, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>(`/api/admin/lemburs/${encodeURIComponent(uuid)}`, { signal });
  return parseLemburDetail(response.data);
}

export async function lockLembur(uuid: string) {
  const response = await apiClient.post<unknown>(`/api/admin/lemburs/${encodeURIComponent(uuid)}/lock`);
  if (response.status === 204 || response.data === null || response.data === undefined || response.data === "") return null;
  return parseLemburDetail(response.data);
}

export async function bulkLockLemburs(ids: number[]) {
  if (ids.length === 0 || ids.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
    throw new ApiError("Invalid bulk lock identifiers.", "contract");
  }
  const response = await apiClient.post<unknown>("/api/admin/lemburs/bulk-lock", { ids });
  const result = parseBulkLockResult(response.data);
  if (result.lockedCount !== ids.length) throw new ApiError("Bulk lock count does not match the request.", "contract");
  return result;
}

export async function deleteLembur(uuid: string) {
  const response = await apiClient.delete<unknown>(`/api/admin/lemburs/${encodeURIComponent(uuid)}`);
  if (response.status !== 204) throw new ApiError("Invalid delete response status.", "contract");
}

export async function exportLemburs(filters: LemburRequest) {
  const response = await apiClient.get<Blob>("/api/admin/lemburs/export", {
    params: toLemburExportParams(filters), responseType: "blob", headers: { Accept: "application/pdf" },
  });
  const contentType = typeof response.headers["content-type"] === "string" ? response.headers["content-type"] : undefined;
  const disposition = typeof response.headers["content-disposition"] === "string" ? response.headers["content-disposition"] : undefined;
  return { blob: assertPdfBlob(response.data, contentType), filename: pdfFilenameFromDisposition(disposition) };
}
