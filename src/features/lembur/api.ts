import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { indexIncluded, parseJsonApi, resolveRelationship } from "@/lib/jsonapi";
import { toLemburApiParams, type LemburRequest } from "./filters";

const attributesSchema = z.object({
  uuid: z.string(), tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nama_kegiatan: z.string(), lokasi_kegiatan: z.string(),
  jenis_hari: z.enum(["hari_kerja", "hari_libur"]),
  upah: z.number().int().nonnegative(), status: z.enum(["draft", "complete", "locked"]),
  waktu_pulang: z.string().nullable(), can_lock: z.boolean(), can_delete: z.boolean(),
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

export type LemburRow = z.infer<typeof attributesSchema> & {
  id: string; pegawai: z.infer<typeof employeeSchema> | null;
};
export type LemburList = {
  rows: LemburRow[]; filters: z.infer<typeof filtersSchema>;
  pegawaiOptions: z.infer<typeof employeeOptionSchema>[]; pagination: z.infer<typeof paginationSchema>;
};

export function parseLemburList(input: unknown): LemburList {
  const document = parseJsonApi(input);
  if (!Array.isArray(document.data)) throw new ApiError("Invalid lembur collection.", "contract");
  const filters = filtersSchema.safeParse(document.meta?.filters);
  const options = z.array(employeeOptionSchema).safeParse(document.meta?.pegawaiOptions);
  const pagination = paginationSchema.safeParse(document.meta);
  if (!filters.success || !options.success || !pagination.success) throw new ApiError("Invalid lembur list metadata.", "contract");
  const included = indexIncluded(document);
  const rows = document.data.map((resource): LemburRow => {
    if (resource.type !== "lemburs") throw new ApiError("Invalid lembur resource.", "contract");
    const attributes = attributesSchema.safeParse(resource.attributes);
    if (!attributes.success) throw new ApiError("Invalid lembur attributes.", "contract");
    const related = resolveRelationship(resource, "user", included);
    if (Array.isArray(related)) throw new ApiError("Invalid lembur user relationship.", "contract");
    if (related && related.type !== "users") throw new ApiError("Invalid lembur user resource type.", "contract");
    const employee = related ? employeeSchema.safeParse(related.attributes) : null;
    if (employee && !employee.success) throw new ApiError("Invalid lembur employee resource.", "contract");
    return { id: resource.id, ...attributes.data, pegawai: employee?.data ?? null };
  });
  return { rows, filters: filters.data, pegawaiOptions: options.data, pagination: pagination.data };
}

export async function getLemburList(filters: LemburRequest, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/api/admin/lemburs", { params: toLemburApiParams(filters), signal });
  return parseLemburList(response.data);
}
