import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { apiClient } from "../src/lib/api/client.ts";
import { getDashboard, parseDashboard } from "../src/features/dashboard/api.ts";
import { dashboardQueryOptions } from "../src/features/dashboard/query.ts";

// Contract fixtures are test-only; never imported by application code.
const fixture = () => ({ data: { type: "dashboard-summaries", id: "periode-2025-04", attributes: {
  bulan: "2025-04", total_lembur: 3, total_upah: 150000, hari_kerja: 2, hari_libur: 1,
  chart: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, total: index === 3 ? 3 : 0 })),
} } });
const state = (status, permission, user = status === "authenticated" ? { type: "users", id: "5", attributes: { role: ["administrator"] } } : null) => ({ status, user, canAccessAdminPanel: permission, error: null, context: null });
beforeEach(() => { globalThis.window = {}; process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid"; });

test("dashboard maps the exact JSON:API summary, API period, and twelve chronological months", () => {
  const input = fixture(); input.data.attributes.chart.reverse();
  const summary = parseDashboard(input);
  assert.equal(summary.bulan, "2025-04");
  assert.deepEqual([summary.total_lembur, summary.total_upah, summary.hari_kerja, summary.hari_libur], [3, 150000, 2, 1]);
  assert.deepEqual(summary.chart.map((item) => item.month), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(summary.chart[0].total, 0); assert.equal(summary.chart[3].total, 3);
});

test("missing/duplicate months and malformed fields fail the contract instead of becoming invented zeros", () => {
  const cases = [
    (data) => data.attributes.chart.pop(),
    (data) => { data.attributes.chart[0].month = 2; },
    (data) => { data.attributes.chart[0].total = -1; },
    (data) => { data.attributes.total_upah = "150000"; },
    (data) => { delete data.attributes.hari_kerja; },
    (data) => { data.attributes.bulan = "2025-13"; },
    (data) => { data.type = "users"; },
    (data) => { data.id = "periode-2024-04"; },
  ];
  for (const mutate of cases) { const input = fixture(); mutate(input.data); assert.throws(() => parseDashboard(input), { kind: "contract" }); }
  for (const data of [null, [], {}]) assert.throws(() => parseDashboard({ data }), { kind: "contract" });
});

test("valid all-zero dashboard is successful data", () => {
  const input = fixture(); const attributes = input.data.attributes;
  for (const key of ["total_lembur", "total_upah", "hari_kerja", "hari_libur"]) attributes[key] = 0;
  attributes.chart.forEach((item) => { item.total = 0; });
  assert.equal(parseDashboard(input).chart.length, 12);
});

test("dashboard client sends only dashboard endpoint and selected month with shared credentials and cancellation", async () => {
  const requests = []; const controller = new AbortController();
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { status: 200, headers: {}, config, data: fixture() }; };
  await getDashboard(undefined, controller.signal); await getDashboard("2025-04", controller.signal);
  assert.equal(requests[0].url, "/api/admin/dashboard"); assert.equal(requests[0].params, undefined);
  assert.deepEqual(requests[1].params, { bulan: "2025-04" });
  assert.equal(requests[1].withCredentials, true); assert.equal(requests[1].signal, controller.signal);
});

for (const [status, permission, allowed] of [["guest", false, false], ["requires_2fa", true, false], ["loading", true, false], ["error", true, false], ["authenticated", false, false], ["authenticated", true, true]]) {
  test(`query observer: ${status} permission=${permission}, enabled=${allowed}`, async () => {
    let calls = 0;
    apiClient.defaults.adapter = async (config) => { calls++; return { status: 200, headers: {}, config, data: fixture() }; };
    const client = new QueryClient(); const observer = new QueryObserver(client, dashboardQueryOptions(state(status, permission)));
    assert.equal(observer.options.enabled, allowed);
    const unsubscribe = observer.subscribe(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls, allowed ? 1 : 0);
    if (allowed) assert.equal(observer.getCurrentResult().isSuccess, true);
    unsubscribe(); client.clear();
  });
}

test("missing user cannot enable dashboard; query keys isolate users and periods", () => {
  assert.equal(dashboardQueryOptions(state("authenticated", true, null)).enabled, false);
  assert.notDeepEqual(dashboardQueryOptions(state("authenticated", true), "2025-04").queryKey, dashboardQueryOptions(state("authenticated", true), "2025-05").queryKey);
  assert.notDeepEqual(dashboardQueryOptions(state("authenticated", true)).queryKey, dashboardQueryOptions(state("authenticated", true, { id: "6" })).queryKey);
});

test("query exposes normalized API errors without automatic retry", async () => {
  let calls = 0;
  apiClient.defaults.adapter = async () => { calls++; throw new AxiosError("Unavailable", "ERR_BAD_RESPONSE", undefined, undefined, { status: 503, data: {}, headers: {} }); };
  const client = new QueryClient(); const observer = new QueryObserver(client, dashboardQueryOptions(state("authenticated", true)));
  const unsubscribe = observer.subscribe(() => {});
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(observer.getCurrentResult().error.kind, "server"); assert.equal(calls, 1);
  unsubscribe(); client.clear();
});
