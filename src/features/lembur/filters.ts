export const DEFAULT_PER_PAGE = 15;
export const statusValues = ["complete", "draft", "locked"] as const;
export const dayTypeValues = ["semua", "kerja", "libur"] as const;
export type LemburRequest = {
  bulan?: string; pegawai?: string; status?: string; jenis_hari?: string; search?: string;
  page: number; per_page: number;
};
export type LemburFilterInput = Pick<LemburRequest, "bulan" | "pegawai" | "status" | "jenis_hari" | "search">;

function positiveInt(value: string | null, fallback: number, maximum?: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed >= 1 && (!maximum || parsed <= maximum) ? parsed : fallback;
}

export function parseLemburSearchParams(params: URLSearchParams): LemburRequest {
  const read = (name: string) => params.get(name)?.trim() || undefined;
  return {
    bulan: read("bulan"), pegawai: read("pegawai"), status: read("status"),
    jenis_hari: read("jenis_hari"), search: read("search"),
    page: positiveInt(params.get("page"), 1), per_page: positiveInt(params.get("per_page"), DEFAULT_PER_PAGE, 100),
  };
}

export function toLemburApiParams(filters: LemburRequest): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const key of ["bulan", "pegawai", "status", "jenis_hari", "search"] as const) {
    if (filters[key]) params[key] = filters[key];
  }
  if (filters.page !== 1) params.page = filters.page;
  if (filters.per_page !== DEFAULT_PER_PAGE) params.per_page = filters.per_page;
  return params;
}

export function lemburUrl(filters: LemburRequest, changes: Partial<LemburRequest> = {}) {
  const next = { ...filters, ...changes };
  if (Object.keys(changes).some((key) => key !== "page" && key !== "per_page")) next.page = 1;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(toLemburApiParams(next))) params.set(key, String(value));
  const query = params.toString();
  return query ? `/admin/lembur?${query}` : "/admin/lembur";
}

export function resetLemburUrl() { return "/admin/lembur"; }
export function hasActiveLemburFilters(filters: LemburRequest) {
  return Boolean(filters.bulan || filters.pegawai || filters.status || filters.jenis_hari || filters.search || filters.page !== 1 || filters.per_page !== DEFAULT_PER_PAGE);
}
