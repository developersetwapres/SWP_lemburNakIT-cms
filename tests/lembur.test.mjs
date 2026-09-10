import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { apiClient } from "../src/lib/api/client.ts";
import { getLemburList, parseLemburList } from "../src/features/lembur/api.ts";
import { hasActiveLemburFilters, lemburUrl, parseLemburSearchParams, resetLemburUrl, toLemburApiParams } from "../src/features/lembur/filters.ts";
import { lemburQueryOptions } from "../src/features/lembur/query.ts";

const userResource = (id, name) => ({ type: "users", id, attributes: { uuid: `user-${id}`, name, nip: id === "7" ? "197001" : null, jabatan: "Staf" } });
const rowResource = (id, userId, overrides = {}) => ({
  type: "lemburs", id, attributes: { uuid: `lembur-${id}`, tanggal: "2026-09-04", nama_kegiatan: "Rapat evaluasi", lokasi_kegiatan: "Ruang rapat", jenis_hari: "hari_kerja", upah: 50000, status: "complete", waktu_pulang: "18:00", can_lock: true, can_delete: true, ...overrides },
  relationships: { user: { data: { type: "users", id: userId } } },
});
const fixture = (rows = [rowResource("11", "7")]) => ({
  data: rows,
  included: [{ type: "teams", id: "7", attributes: { name: "Wrong type" } }, userResource("8", "Budi"), userResource("7", "Ayu")],
  links: { first: "https://example.invalid?page=1", last: "https://example.invalid?page=3", prev: null, next: "https://example.invalid?page=2" },
  meta: { current_page: 1, from: rows.length ? 1 : null, last_page: 3, links: [], path: "https://example.invalid/api/admin/lemburs", per_page: 15, to: rows.length, total: 31,
    filters: { bulan: "2026-09", pegawai: null, status: "complete", jenis_hari: "semua", search: "" },
    pegawaiOptions: [{ uuid: "user-7", name: "Ayu", nip: "197001" }],
  },
});
const authState = (status, permission, user = status === "authenticated" ? { type: "users", id: "5", attributes: {} } : null) => ({ status, user, canAccessAdminPanel: permission, error: null, context: null });
const defaults = { page: 1, per_page: 15 };
beforeEach(() => { globalThis.window = {}; process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid"; });

test("URL state reads supported API parameters and safe pagination defaults", () => {
  const filters = parseLemburSearchParams(new URLSearchParams("bulan=9&pegawai=user-7&status=draft&jenis_hari=libur&search=Merdeka&page=4&per_page=50"));
  assert.deepEqual(filters, { bulan: "9", pegawai: "user-7", status: "draft", jenis_hari: "libur", search: "Merdeka", page: 4, per_page: 50 });
  assert.deepEqual(parseLemburSearchParams(new URLSearchParams("page=0&per_page=101")), { bulan: undefined, pegawai: undefined, status: undefined, jenis_hari: undefined, search: undefined, ...defaults });
});

test("filter changes reset page while pagination preserves every active filter", () => {
  const current = { bulan: "2026-09", pegawai: "user-7", status: "complete", jenis_hari: "libur", search: "Rapat", page: 4, per_page: 15 };
  const filtered = lemburUrl(current, { status: "locked" });
  assert.match(filtered, /bulan=2026-09/); assert.match(filtered, /pegawai=user-7/); assert.match(filtered, /status=locked/); assert.doesNotMatch(filtered, /page=4/);
  const nextPage = lemburUrl(current, { page: 5 });
  assert.match(nextPage, /page=5/); assert.match(nextPage, /search=Rapat/); assert.match(nextPage, /jenis_hari=libur/);
  assert.equal(resetLemburUrl(), "/admin/lembur"); assert.equal(hasActiveLemburFilters(defaults), false); assert.equal(hasActiveLemburFilters(current), true);
  assert.equal(hasActiveLemburFilters({ ...defaults, page: 4 }), true);
});

test("API params omit empty/default values but retain all response-affecting filters", () => {
  assert.deepEqual(toLemburApiParams(defaults), {});
  assert.deepEqual(toLemburApiParams({ bulan: "2026-09", pegawai: "u", status: "draft", jenis_hari: "semua", search: "Rapat", page: 2, per_page: 50 }), { bulan: "2026-09", pegawai: "u", status: "draft", jenis_hari: "semua", search: "Rapat", page: 2, per_page: 50 });
  const unknown = parseLemburSearchParams(new URLSearchParams("bulan=invalid&status=all&jenis_hari=invalid"));
  assert.deepEqual(toLemburApiParams(unknown), { bulan: "invalid", status: "all", jenis_hari: "invalid" });
});

test("JSON:API collection maps rows, metadata, and user relationship by type plus id", () => {
  const result = parseLemburList(fixture([rowResource("11", "7"), rowResource("12", "8", { status: "locked", jenis_hari: "hari_libur" })]));
  assert.equal(result.rows[0].pegawai.name, "Ayu"); assert.equal(result.rows[1].pegawai.name, "Budi");
  assert.equal(result.rows[1].status, "locked"); assert.equal(result.rows[1].jenis_hari, "hari_libur");
  assert.deepEqual(result.pagination, { current_page: 1, from: 1, last_page: 3, per_page: 15, to: 2, total: 31 });
  assert.deepEqual(result.filters, { bulan: "2026-09", pegawai: null, status: "complete", jenis_hari: "semua", search: "" });
  assert.deepEqual(result.pegawaiOptions, [{ uuid: "user-7", name: "Ayu", nip: "197001" }]);
});

test("unresolved relationship is explicit null, malformed collection/meta/resource fail contract", () => {
  const unresolved = fixture([rowResource("11", "404")]);
  assert.equal(parseLemburList(unresolved).rows[0].pegawai, null);
  for (const mutate of [
    (body) => { body.data = {}; }, (body) => { delete body.meta.current_page; },
    (body) => { body.data[0].type = "users"; }, (body) => { body.data[0].attributes.status = "unknown"; },
    (body) => { body.data[0].relationships.user.data.type = "teams"; },
  ]) { const body = fixture(); mutate(body); assert.throws(() => parseLemburList(body), { kind: "contract" }); }
});

test("client calls only list endpoint with mapped filters and shared credentials", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { status: 200, headers: {}, config, data: fixture() }; };
  const controller = new AbortController();
  await getLemburList({ bulan: "2026-09", status: "complete", jenis_hari: "semua", page: 2, per_page: 15 }, controller.signal);
  assert.equal(requests[0].url, "/api/admin/lemburs");
  assert.deepEqual(requests[0].params, { bulan: "2026-09", status: "complete", jenis_hari: "semua", page: 2 });
  assert.equal(requests[0].withCredentials, true); assert.equal(requests[0].signal, controller.signal);
});

for (const [status, permission, allowed] of [["guest", false, false], ["requires_2fa", true, false], ["loading", true, false], ["authenticated", false, false], ["authenticated", true, true]]) {
  test(`lembur query: ${status} permission=${permission}, enabled=${allowed}`, async () => {
    let calls = 0; apiClient.defaults.adapter = async (config) => { calls++; return { status: 200, headers: {}, config, data: fixture() }; };
    const client = new QueryClient(); const observer = new QueryObserver(client, lemburQueryOptions(authState(status, permission), defaults));
    assert.equal(observer.options.enabled, allowed); const unsubscribe = observer.subscribe(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20)); assert.equal(calls, allowed ? 1 : 0);
    unsubscribe(); client.clear();
  });
}

test("query key separates every filter, page, size, and user", () => {
  const first = lemburQueryOptions(authState("authenticated", true), defaults).queryKey;
  for (const changed of [{ bulan: "9" }, { pegawai: "u" }, { status: "draft" }, { jenis_hari: "libur" }, { search: "x" }, { page: 2 }, { per_page: 50 }]) {
    assert.notDeepEqual(first, lemburQueryOptions(authState("authenticated", true), { ...defaults, ...changed }).queryKey);
  }
  assert.notDeepEqual(first, lemburQueryOptions(authState("authenticated", true, { type: "users", id: "6", attributes: {} }), defaults).queryKey);
});
