export const PEGAWAI_DEFAULT_PER_PAGE = 15;
export const PEGAWAI_HISTORY_DEFAULT_PER_PAGE = 10;

export type PegawaiListRequest = { search?: string; status?: string; page: number; per_page: number };
export type PegawaiHistoryRequest = {
  bulan?: string; status?: string; jenis_hari?: string; search?: string; page: number; per_page: number;
};

function positiveInt(value: string | null, fallback: number, maximum = 100) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= maximum ? parsed : fallback;
}

function read(params: URLSearchParams, name: string) {
  return params.get(name)?.trim() || undefined;
}

export function parsePegawaiSearchParams(params: URLSearchParams): PegawaiListRequest {
  return {
    search: read(params, "search"), status: read(params, "status"),
    page: positiveInt(params.get("page"), 1), per_page: positiveInt(params.get("per_page"), PEGAWAI_DEFAULT_PER_PAGE),
  };
}

export function toPegawaiApiParams(filters: PegawaiListRequest) {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.page !== 1) params.page = filters.page;
  if (filters.per_page !== PEGAWAI_DEFAULT_PER_PAGE) params.per_page = filters.per_page;
  return params;
}

export function pegawaiUrl(filters: PegawaiListRequest, changes: Partial<PegawaiListRequest> = {}) {
  const next = { ...filters, ...changes };
  if (Object.keys(changes).some((key) => key !== "page" && key !== "per_page")) next.page = 1;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(toPegawaiApiParams(next))) params.set(key, String(value));
  return params.size ? `/admin/pegawai?${params}` : "/admin/pegawai";
}

export function hasActivePegawaiFilters(filters: PegawaiListRequest) {
  return Boolean(filters.search || filters.status || filters.page !== 1 || filters.per_page !== PEGAWAI_DEFAULT_PER_PAGE);
}

export function parseHistorySearchParams(params: URLSearchParams): PegawaiHistoryRequest {
  return {
    bulan: read(params, "bulan"), status: read(params, "status"), jenis_hari: read(params, "jenis_hari"), search: read(params, "search"),
    page: positiveInt(params.get("page"), 1), per_page: positiveInt(params.get("per_page"), PEGAWAI_HISTORY_DEFAULT_PER_PAGE),
  };
}

export function toHistoryApiParams(filters: PegawaiHistoryRequest) {
  const params: Record<string, string | number> = {};
  for (const key of ["bulan", "status", "jenis_hari", "search"] as const) if (filters[key]) params[key] = filters[key];
  if (filters.page !== 1) params.page = filters.page;
  if (filters.per_page !== PEGAWAI_HISTORY_DEFAULT_PER_PAGE) params.per_page = filters.per_page;
  return params;
}

export function pegawaiDetailUrl(uuid: string, filters: PegawaiHistoryRequest, changes: Partial<PegawaiHistoryRequest> = {}) {
  const next = { ...filters, ...changes };
  if (Object.keys(changes).some((key) => key !== "page" && key !== "per_page")) next.page = 1;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(toHistoryApiParams(next))) params.set(key, String(value));
  return params.size ? `/admin/pegawai/${encodeURIComponent(uuid)}?${params}` : `/admin/pegawai/${encodeURIComponent(uuid)}`;
}

export function hasActiveHistoryFilters(filters: PegawaiHistoryRequest) {
  return Boolean(filters.bulan || filters.status || filters.jenis_hari || filters.search || filters.page !== 1 || filters.per_page !== PEGAWAI_HISTORY_DEFAULT_PER_PAGE);
}
