import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { apiClient } from "../src/lib/api/client.ts";
import { getPegawaiDetail, getPegawaiHistory, getPegawaiList, parsePegawaiDetail, parsePegawaiList, updatePegawai } from "../src/features/pegawai/api.ts";
import { hasActiveHistoryFilters, hasActivePegawaiFilters, parseHistorySearchParams, parsePegawaiSearchParams, pegawaiDetailUrl, pegawaiUrl, toHistoryApiParams, toPegawaiApiParams } from "../src/features/pegawai/filters.ts";
import { invalidatePegawaiAfterUpdate, pegawaiDetailKey, pegawaiHistoryOptions, pegawaiHistoryPrefix, pegawaiListOptions, pegawaiListPrefix } from "../src/features/pegawai/query.ts";
import { createRunOnce } from "../src/features/lembur/lock.ts";

const UUID = "11111111-1111-4111-8111-111111111111";
const employeeResource = (overrides = {}) => ({ type: "users", id: "7", attributes: { uuid: UUID, name: "Ayu", email: "ayu@example.test", image: null, jabatan: "Staf", nip: "197001", kode_biro: "UMUM", is_active: true, lemburs_count: 4, ...overrides } });
const pagination = { current_page: 1, last_page: 2, per_page: 15, total: 16, from: 1, to: 15 };
const listFixture = (rows = [employeeResource()]) => ({ data: rows, meta: { ...pagination, filters: { search: "", status: null } } });
const lemburFixture = { data: [{ type: "lemburs", id: "11", attributes: { uuid: "22222222-2222-4222-8222-222222222222", tanggal: "2026-09-04", nama_kegiatan: "Rapat", lokasi_kegiatan: "Kantor", foto_kegiatan_url: null, foto_kegiatan_at: null, foto_pulang_url: null, foto_pulang_at: null, jenis_hari: "hari_kerja", upah: 50000, status: "complete", waktu_pulang: "18:00", can_lock: true, can_delete: true, locked_at: null }, relationships: { user: { data: { type: "users", id: "7" } } } }], included: [employeeResource()], meta: { current_page: 1, last_page: 1, per_page: 10, total: 1, from: 1, to: 1, filters: { bulan: "2026-09", pegawai: UUID, status: "complete", jenis_hari: "semua", search: "" } } };
const auth = (status, allowed) => ({ status, user: status === "authenticated" ? { type: "users", id: "5", attributes: {} } : null, canAccessAdminPanel: allowed, context: null, error: null });

beforeEach(() => { globalThis.window = {}; process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid"; });

test("pegawai list parses JSON:API pagination and exact optional fields", () => {
  const result = parsePegawaiList(listFixture());
  assert.equal(result.rows[0].uuid, UUID); assert.equal(result.rows[0].lemburs_count, 4); assert.equal(result.pagination.total, 16);
  assert.deepEqual(result.filters, { search: "", status: null });
  const detail = parsePegawaiDetail({ data: employeeResource({ lemburs_count: undefined }) });
  assert.equal(detail.name, "Ayu"); assert.equal(detail.lemburs_count, undefined);
});

test("pegawai malformed collections, types, UUIDs, and metadata fail as contract errors", () => {
  for (const body of [
    { data: employeeResource(), meta: listFixture().meta },
    listFixture([{ ...employeeResource(), type: "lemburs" }]),
    listFixture([{ ...employeeResource(), attributes: { ...employeeResource().attributes, uuid: "bad" } }]),
    { data: [employeeResource()], meta: { filters: { search: "", status: null } } },
  ]) assert.throws(() => parsePegawaiList(body), { kind: "contract" });
});

test("pegawai URL filters and pagination preserve supported parameters and reset page", () => {
  const parsed = parsePegawaiSearchParams(new URLSearchParams("search=Ayu&status=inactive&page=3&per_page=50"));
  assert.deepEqual(parsed, { search: "Ayu", status: "inactive", page: 3, per_page: 50 });
  assert.deepEqual(toPegawaiApiParams(parsed), { search: "Ayu", status: "inactive", page: 3, per_page: 50 });
  assert.doesNotMatch(pegawaiUrl(parsed, { status: "active" }), /page=3/); assert.match(pegawaiUrl(parsed, { page: 4 }), /page=4/);
  assert.equal(hasActivePegawaiFilters({ page: 1, per_page: 15 }), false);
});

test("history uses its backend default size, supported filters, and employee route UUID", () => {
  const filters = parseHistorySearchParams(new URLSearchParams("bulan=2026-09&status=locked&jenis_hari=libur&search=rapat&page=2"));
  assert.deepEqual(toHistoryApiParams(filters), { bulan: "2026-09", status: "locked", jenis_hari: "libur", search: "rapat", page: 2 });
  const next = pegawaiDetailUrl(UUID, filters, { status: "complete" }); assert.match(next, new RegExp(`/admin/pegawai/${UUID}`)); assert.doesNotMatch(next, /page=2/);
  assert.equal(hasActiveHistoryFilters({ page: 1, per_page: 10 }), false);
});

test("list, detail, history and update call exact backend endpoints and whitelist payload", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { status: 200, headers: {}, config, data: config.url.endsWith("/lemburs") ? lemburFixture : config.method === "get" && config.url === "/api/admin/pegawai" ? listFixture() : { data: employeeResource() } }; };
  await getPegawaiList({ search: "Ayu", status: "active", page: 1, per_page: 15 }); await getPegawaiDetail(UUID); await getPegawaiHistory(UUID, { page: 1, per_page: 10 });
  const payload = { name: "Ayu Baru", jabatan: null, nip: "197002", is_active: false, password: "new-password" }; await updatePegawai(UUID, payload);
  assert.deepEqual(requests.map((item) => [item.method, item.url]), [["get", "/api/admin/pegawai"], ["get", `/api/admin/pegawai/${UUID}`], ["get", `/api/admin/pegawai/${UUID}/lemburs`], ["put", `/api/admin/pegawai/${UUID}`]]);
  assert.deepEqual(JSON.parse(requests[3].data), payload); assert.equal("email" in JSON.parse(requests[3].data), false); assert.equal("role" in JSON.parse(requests[3].data), false);
});

for (const [status, permission, enabled] of [["guest", false, false], ["requires_2fa", true, false], ["authenticated", false, false], ["authenticated", true, true]]) {
  test(`pegawai queries gate ${status}/${permission}`, () => {
    assert.equal(pegawaiListOptions(auth(status, permission), { page: 1, per_page: 15 }).enabled, enabled);
    assert.equal(pegawaiHistoryOptions(auth(status, permission), UUID, { page: 1, per_page: 10 }).enabled, enabled);
  });
}

test("employee update invalidates list, exact detail, and history prefixes", async () => {
  const calls = []; const client = { invalidateQueries: async (options) => calls.push(options) };
  await invalidatePegawaiAfterUpdate(client, "5", UUID);
  assert.deepEqual(calls, [{ queryKey: pegawaiListPrefix("5") }, { queryKey: pegawaiDetailKey("5", UUID), exact: true }, { queryKey: pegawaiHistoryPrefix("5", UUID) }]);
});

test("single-flight guard prevents duplicate employee update submits", async () => {
  const once = createRunOnce(); let calls = 0; let release;
  const operation = () => { calls++; return new Promise((resolve) => { release = resolve; }); };
  const first = once(operation); const duplicate = once(operation); assert.equal(calls, 1); assert.equal(await duplicate, undefined); release(); await first;
});

test("edit form exposes only backend-whitelisted editable fields", () => {
  const source = readFileSync(new URL("../src/features/pegawai/components/edit-form.tsx", import.meta.url), "utf8");
  for (const field of ["name", "jabatan", "nip", "is_active", "password"]) assert.match(source, new RegExp(`register\\(\"${field}\"`));
  for (const field of ["email", "kode_biro", "role", "image"]) assert.doesNotMatch(source, new RegExp(`register\\(\"${field}\"`));
});
