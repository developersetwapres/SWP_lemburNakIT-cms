import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dialog } from "@base-ui/react/dialog";
import { apiClient } from "../src/lib/api/client.ts";
import { bulkLockLemburs, parseBulkLockResult } from "../src/features/lembur/api.ts";
import { BulkLockConfirmationContent } from "../src/features/lembur/components/bulk-lock-dialog.tsx";
import { LemburTable } from "../src/features/lembur/components/list.tsx";
import { lockDialogActions, runOnce } from "../src/features/lembur/lock.ts";
import { invalidateLemburAfterBulkLock, lemburAdminActionsEnabled, lemburDetailQueryKey, lemburListQueryPrefix } from "../src/features/lembur/query.ts";
import { clearLemburSelection, eligibleLemburRows, lemburSelectionScope, selectedLemburRows, selectedNumericIds, toggleAllEligibleLemburs, toggleLemburSelection } from "../src/features/lembur/selection.ts";

const row = (id, overrides = {}) => ({ id: String(id), uuid: `11111111-1111-4111-8111-${String(id).padStart(12, "0")}`, tanggal: "2026-09-04", nama_kegiatan: `Kegiatan ${id}`, lokasi_kegiatan: "Kantor", foto_kegiatan_url: null, foto_kegiatan_at: null, foto_pulang_url: null, foto_pulang_at: null, jenis_hari: "hari_kerja", upah: 50000, status: "complete", waktu_pulang: "18:00", can_lock: true, can_delete: true, locked_at: null, pegawai: { uuid: "u7", name: "Ayu", nip: "197001", jabatan: "Staf" }, ...overrides });
const rows = [row(11), row(12), row(13, { status: "locked", can_lock: false, can_delete: false })];
const list = { rows, filters: { bulan: "2026-09", pegawai: null, status: "complete", jenis_hari: "semua", search: "" }, pegawaiOptions: [], pagination: { current_page: 1, last_page: 1, per_page: 15, total: 3, from: 1, to: 3 } };
const authState = (status, permission, user = status === "authenticated" ? { type: "users", id: "5", attributes: {} } : null) => ({ status, user, canAccessAdminPanel: permission, error: null, context: null });
const response = (count = 2) => ({ data: { type: "bulk-lock-results", id: "22222222-2222-4222-8222-222222222222", attributes: { locked_count: count } } });

beforeEach(() => { globalThis.window = {}; process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid"; });

test("selection includes only can_lock rows and uses numeric database IDs", () => {
  assert.deepEqual(eligibleLemburRows(rows).map(({ id }) => id), ["11", "12"]);
  let selected = toggleLemburSelection(new Set(), rows[0]); assert.deepEqual([...selected], ["11"]);
  selected = toggleLemburSelection(selected, rows[2]); assert.deepEqual([...selected], ["11"]);
  assert.deepEqual(selectedNumericIds(rows, new Set(["11", "12"])), [11, 12]);
  assert.deepEqual(selectedLemburRows(rows, new Set(["11", "404"])).map(({ id }) => id), ["11"]);
});

test("select-all toggles all eligible visible rows and then deselects all", () => {
  const selected = toggleAllEligibleLemburs(rows, new Set()); assert.deepEqual([...selected], ["11", "12"]);
  assert.deepEqual([...toggleAllEligibleLemburs(rows, selected)], []);
  assert.equal(clearLemburSelection().size, 0);
});

test("selection scope resets across page, filter, refreshed IDs, or changed eligibility", () => {
  const base = lemburSelectionScope(rows, JSON.stringify({ page: 1, status: "complete" }));
  assert.notEqual(base, lemburSelectionScope(rows, JSON.stringify({ page: 2, status: "complete" })));
  assert.notEqual(base, lemburSelectionScope(rows, JSON.stringify({ page: 1, status: "draft" })));
  assert.notEqual(base, lemburSelectionScope([rows[0]], JSON.stringify({ page: 1, status: "complete" })));
  assert.notEqual(base, lemburSelectionScope(rows.map((item) => item.id === "11" ? { ...item, can_lock: false } : item), JSON.stringify({ page: 1, status: "complete" })));
});

test("table renders individual and select-all checkboxes while disabling ineligible rows", () => {
  const html = renderToStaticMarkup(createElement(LemburTable, { list, updating: false, selection: { selectedIds: new Set(["11"]), onToggle: () => {}, onToggleAll: () => {} } }));
  assert.match(html, /Pilih semua lembur yang dapat dikunci/); assert.match(html, /aria-checked="mixed"/);
  assert.match(html, /Lembur Kegiatan 13 tidak dapat dikunci/); assert.match(html, /disabled=""/);
});

test("bulk confirmation shows selected count, transaction semantics, cancellation, and pending state", () => {
  const render = (props) => renderToStaticMarkup(createElement(Dialog.Root, { open: true }, createElement(BulkLockConfirmationContent, props)));
  const ready = render({ count: 2, pending: false, error: null, onCancel: () => {}, onConfirm: () => {} });
  assert.match(ready, /Kunci 2 data lembur/); assert.match(ready, /satu transaksi/); assert.match(ready, /Batal/); assert.match(ready, /Konfirmasi Lock/);
  const pending = render({ count: 2, pending: true, error: null, onCancel: () => {}, onConfirm: () => {} });
  assert.match(pending, /Mengunci/); assert.equal((pending.match(/ disabled=""/g) ?? []).length, 2);
  let closes = 0; let requests = 0; const actions = lockDialogActions(() => closes++, () => requests++);
  actions.cancel(); assert.equal(closes, 1); assert.equal(requests, 0);
});

test("bulk lock sends exactly one POST with distinct integer IDs and maps transactional response", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { status: 200, headers: {}, config, data: response(2) }; };
  const result = await bulkLockLemburs([11, 12]);
  assert.equal(result.lockedCount, 2); assert.equal(requests.length, 1); assert.equal(requests[0].method, "post"); assert.equal(requests[0].url, "/api/admin/lemburs/bulk-lock");
  assert.deepEqual(typeof requests[0].data === "string" ? JSON.parse(requests[0].data) : requests[0].data, { ids: [11, 12] });
});

test("bulk lock rejects UUID/duplicate/empty IDs and partial or malformed success contracts", async () => {
  for (const ids of [[], [11, 11], ["uuid"]]) await assert.rejects(() => bulkLockLemburs(ids), { kind: "contract" });
  for (const body of [{ data: [] }, { data: { type: "wrong", id: "x", attributes: { locked_count: 2 } } }, response("2")]) assert.throws(() => parseBulkLockResult(body), { kind: "contract" });
  apiClient.defaults.adapter = async (config) => ({ status: 200, headers: {}, config, data: response(1) });
  await assert.rejects(() => bulkLockLemburs([11, 12]), { kind: "contract" });
});

test("single-flight guard prevents duplicate bulk submissions", async () => {
  let calls = 0; let release; const busy = { current: false };
  apiClient.defaults.adapter = (config) => { calls++; return new Promise((resolve) => { release = () => resolve({ status: 200, headers: {}, config, data: response(2) }); }); };
  const first = runOnce(busy, () => bulkLockLemburs([11, 12])); const duplicate = runOnce(busy, () => bulkLockLemburs([11, 12]));
  await new Promise((resolve) => setTimeout(resolve, 0)); assert.equal(calls, 1); assert.equal(await duplicate, undefined); release(); assert.equal((await first).lockedCount, 2);
});

test("bulk lock invalidates list and every selected UUID detail query", async () => {
  const calls = []; const client = { invalidateQueries: async (options) => { calls.push(options); } };
  await invalidateLemburAfterBulkLock(client, "5", [rows[0].uuid, rows[1].uuid]);
  assert.deepEqual(calls[0], { queryKey: lemburListQueryPrefix("5") });
  assert.deepEqual(calls.slice(1), [
    { queryKey: lemburDetailQueryKey("5", rows[0].uuid), exact: true },
    { queryKey: lemburDetailQueryKey("5", rows[1].uuid), exact: true },
  ]);
});

test("bulk admin action gating requires authenticated user and backend admin permission", () => {
  for (const [state, allowed] of [[authState("guest", false), false], [authState("requires_2fa", true), false], [authState("loading", true), false], [authState("authenticated", false), false], [authState("authenticated", true), true]]) assert.equal(lemburAdminActionsEnabled(state), allowed);
});
