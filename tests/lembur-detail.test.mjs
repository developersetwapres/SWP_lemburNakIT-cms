import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { apiClient } from "../src/lib/api/client.ts";
import { getLemburDetail, lockLembur, parseLemburDetail } from "../src/features/lembur/api.ts";
import { runOnce, lockDialogActions } from "../src/features/lembur/lock.ts";
import { defaultLemburReturnTo, lemburDetailHref, safeLemburReturnTo } from "../src/features/lembur/navigation.ts";
import { invalidateLemburAfterLock, lemburDetailQueryKey, lemburDetailQueryOptions, lemburListQueryPrefix } from "../src/features/lembur/query.ts";

const UUID = "11111111-1111-4111-8111-111111111111";
const userResource = (id, name) => ({ type: "users", id, attributes: { uuid: `user-${id}`, name, nip: id === "7" ? "197001" : null, jabatan: id === "7" ? "Staf" : "Administrator" } });
const detailFixture = (overrides = {}, relationshipOverrides = {}) => ({
  data: {
    type: "lemburs", id: "11",
    attributes: {
      uuid: UUID, tanggal: "2026-09-04", nama_kegiatan: "Rapat evaluasi", lokasi_kegiatan: "Ruang rapat",
      foto_kegiatan_url: "https://media.example.invalid/kegiatan.jpg", foto_kegiatan_at: "2026-09-04 18:10:00",
      foto_pulang_url: "https://media.example.invalid/pulang.jpg", foto_pulang_at: "2026-09-04 20:15:00",
      waktu_pulang: "20:15", jenis_hari: "hari_kerja", upah: 75000, status: "locked", can_lock: false,
      can_delete: true, locked_at: "2026-09-05 08:00:00", ...overrides,
    },
    relationships: {
      user: { data: { type: "users", id: "7" } },
      lockedBy: { data: { type: "users", id: "9" } },
      ...relationshipOverrides,
    },
  },
  included: [
    { type: "teams", id: "7", attributes: { uuid: "wrong", name: "Wrong type", nip: null, jabatan: null } },
    userResource("9", "Admin Satu"), userResource("7", "Ayu"),
  ],
});
const authState = (status, permission, user = status === "authenticated" ? { type: "users", id: "5", attributes: {} } : null) => ({ status, user, canAccessAdminPanel: permission, error: null, context: null });

beforeEach(() => { globalThis.window = {}; process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid"; });

test("detail JSON:API maps complete fields and both user relationships by type plus id", () => {
  const detail = parseLemburDetail(detailFixture());
  assert.equal(detail.uuid, UUID); assert.equal(detail.pegawai.name, "Ayu"); assert.equal(detail.lockedBy.name, "Admin Satu");
  assert.equal(detail.foto_kegiatan_url, "https://media.example.invalid/kegiatan.jpg"); assert.equal(detail.foto_pulang_at, "2026-09-04 20:15:00");
  assert.equal(detail.status, "locked"); assert.equal(detail.can_lock, false); assert.equal(detail.upah, 75000);
});

test("missing relationships and nullable detail fields have explicit fallbacks", () => {
  const body = detailFixture({ foto_kegiatan_url: null, foto_kegiatan_at: null, foto_pulang_url: null, foto_pulang_at: null, waktu_pulang: null, locked_at: null }, {
    user: { data: { type: "users", id: "404" } }, lockedBy: { data: null },
  });
  const detail = parseLemburDetail(body);
  assert.equal(detail.pegawai, null); assert.equal(detail.lockedBy, null); assert.equal(detail.foto_kegiatan_url, null); assert.equal(detail.waktu_pulang, null);
});

test("malformed detail documents fail as contract errors", () => {
  for (const mutate of [
    (body) => { body.data = [body.data]; },
    (body) => { body.data.type = "users"; },
    (body) => { body.data.attributes.status = "unknown"; },
    (body) => { delete body.data.attributes.can_lock; },
    (body) => { body.data.relationships.user.data.type = "teams"; },
  ]) {
    const body = detailFixture(); mutate(body); assert.throws(() => parseLemburDetail(body), { kind: "contract" });
  }
});

test("detail route and API use UUID while return navigation accepts only the lembur list", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { status: 200, headers: {}, config, data: detailFixture() }; };
  await getLemburDetail(UUID);
  assert.equal(requests[0].url, `/api/admin/lemburs/${UUID}`);
  const href = lemburDetailHref(UUID, "/admin/lembur?bulan=2026-09&page=2");
  assert.match(href, new RegExp(`/admin/lembur/${UUID}`)); assert.match(href, /returnTo=%2Fadmin%2Flembur%3Fbulan%3D2026-09%26page%3D2/);
  assert.equal(safeLemburReturnTo("https://evil.example.invalid"), defaultLemburReturnTo);
});

for (const [status, permission, allowed] of [["guest", false, false], ["requires_2fa", true, false], ["loading", true, false], ["authenticated", false, false], ["authenticated", true, true]]) {
  test(`detail query: ${status} permission=${permission}, enabled=${allowed}`, async () => {
    let calls = 0; apiClient.defaults.adapter = async (config) => { calls++; return { status: 200, headers: {}, config, data: detailFixture() }; };
    const client = new QueryClient(); const observer = new QueryObserver(client, lemburDetailQueryOptions(authState(status, permission), UUID));
    assert.equal(observer.options.enabled, allowed); const unsubscribe = observer.subscribe(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20)); assert.equal(calls, allowed ? 1 : 0);
    unsubscribe(); client.clear();
  });
}

test("single lock sends one POST, maps 200, and accepts an empty 204 response", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); return requests.length === 1 ? { status: 200, headers: {}, config, data: detailFixture() } : { status: 204, headers: {}, config, data: "" }; };
  assert.equal((await lockLembur(UUID)).status, "locked"); assert.equal(await lockLembur(UUID), null);
  assert.deepEqual(requests.map(({ method, url }) => [method, url]), [["post", `/api/admin/lemburs/${UUID}/lock`], ["post", `/api/admin/lemburs/${UUID}/lock`]]);
});

test("single-flight protection prevents a duplicate lock submit", async () => {
  const busy = { current: false }; let calls = 0; let release;
  const operation = () => { calls++; return new Promise((resolve) => { release = resolve; }); };
  const first = runOnce(busy, operation); const second = runOnce(busy, operation);
  assert.equal(calls, 1); assert.equal(await second, undefined); release("done"); assert.equal(await first, "done"); assert.equal(busy.current, false);
});

test("cancel action closes without locking and confirm invokes lock once", () => {
  let closes = 0; let locks = 0; const actions = lockDialogActions(() => closes++, () => locks++);
  actions.cancel(); assert.equal(closes, 1); assert.equal(locks, 0); actions.confirm(); assert.equal(locks, 1);
});

test("lock success invalidates exact detail and all cached list filters for the same user", async () => {
  const calls = [];
  const client = { invalidateQueries: async (options) => { calls.push(options); } };
  await invalidateLemburAfterLock(client, "5", UUID);
  assert.deepEqual(calls[0], { queryKey: lemburDetailQueryKey("5", UUID), exact: true });
  assert.deepEqual(calls[1], { queryKey: lemburListQueryPrefix("5") });
});
