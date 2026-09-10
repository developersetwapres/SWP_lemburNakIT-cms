import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { apiClient } from "../src/lib/api/client.ts";
import { ApiError, normalizeApiError } from "../src/lib/api/errors.ts";
import { parseJsonApi, indexIncluded, resolveRelationship } from "../src/lib/jsonapi/index.ts";
import { bootstrapCsrf, login, challengeTwoFactor, getFrontendContext, getPasswordConfirmationStatus, confirmPassword } from "../src/lib/auth/service.ts";
import { createAuthStore } from "../src/lib/auth/store.ts";

const credentials = { email: "test@example.invalid", password: "test-fixture-only", remember: true };
const context = (user = null, allowed = false) => ({
  data: { type: "frontend-contexts", id: "current", attributes: { auth: { user }, name: "Test CMS" } },
  meta: { canAccessAdminPanel: allowed },
});
const user = { type: "users", id: "17", attributes: { name: "Fixture", role: ["administrator"] } };
let requests;
function respond(handler) {
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    const result = await handler(config);
    return { data: result?.data ?? "", status: result?.status ?? 200, statusText: "", headers: {}, config };
  };
}
function fail(status, data = { message: "Rejected" }) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, { status, data, headers: {} });
}
beforeEach(() => {
  // Adapter tests simulate the browser entry point; they do not simulate browser cookies.
  globalThis.window = {};
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  requests = [];
  respond(() => ({}));
});

test("client centralizes environment, JSON and credential/XSRF configuration", async () => {
  await bootstrapCsrf();
  const request = requests[0];
  assert.equal(request.url, "/sanctum/csrf-cookie");
  assert.equal(request.method, "get");
  assert.equal(request.baseURL, process.env.NEXT_PUBLIC_API_URL);
  assert.equal(request.withCredentials, true);
  assert.equal(request.withXSRFToken, true);
  assert.equal(request.xsrfCookieName, "XSRF-TOKEN");
  assert.equal(request.xsrfHeaderName, "X-XSRF-TOKEN");
  assert.equal(request.headers.Accept, "application/json");
});
test("missing environment, invalid origin, absolute URL and server use fail before transport", async () => {
  delete process.env.NEXT_PUBLIC_API_URL;
  await assert.rejects(bootstrapCsrf(), { kind: "configuration" });
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid/api";
  await assert.rejects(bootstrapCsrf(), { kind: "configuration" });
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  await assert.rejects(apiClient.get("https://other.example.invalid"), { kind: "configuration" });
  delete globalThis.window;
  await assert.rejects(bootstrapCsrf(), { kind: "configuration" });
  assert.equal(requests.length, 0);
});
test("concurrent CSRF requests share one bootstrap; failed bootstrap prevents login", async () => {
  await Promise.all([bootstrapCsrf(), bootstrapCsrf()]);
  assert.equal(requests.length, 1);
  respond(() => { throw fail(419); });
  await assert.rejects(login(credentials), { kind: "csrf" });
  assert.equal(requests.some((r) => r.url === "/login"), false);
});
for (const two_factor of [false, true]) {
  test(`Fortify login handles two_factor=${two_factor} after CSRF`, async () => {
    respond((r) => ({ data: r.url === "/login" ? { two_factor } : "", status: r.url === "/login" ? 200 : 204 }));
    assert.deepEqual(await login(credentials), { two_factor });
    assert.deepEqual(requests.map((r) => r.url), ["/sanctum/csrf-cookie", "/login"]);
    assert.deepEqual(JSON.parse(requests[1].data), credentials);
  });
}
test("malformed login and context cannot grant access", async () => {
  respond(() => ({ data: {} }));
  await assert.rejects(login(credentials), { kind: "contract" });
  await assert.rejects(getFrontendContext(), { kind: "contract" });
  respond(() => ({ data: { ...context(user), meta: {} } }));
  await assert.rejects(getFrontendContext(), { kind: "contract" });
});
test("guest context and authenticated non-admin are distinct, gate is authoritative", async () => {
  respond(() => ({ data: context(null, true) }));
  assert.equal((await getFrontendContext()).canAccessAdminPanel, false);
  respond(() => ({ data: context(user, false) }));
  const result = await getFrontendContext();
  assert.equal(result.auth.user.id, "17");
  assert.equal(result.canAccessAdminPanel, false);
});
test("initial context is deduplicated and auth mutations are blocked while loading", async () => {
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  respond(async () => { await blocked; return { data: context() }; });
  const store = createAuthStore();
  const first = store.initialize();
  assert.equal(store.initialize(), first);
  assert.equal(store.getSnapshot().status, "loading");
  await assert.rejects(store.login(credentials));
  release();
  await first;
  await store.initialize();
  assert.equal(requests.length, 1);
  assert.equal(store.getSnapshot().status, "guest");
});
for (const payload of [{ code: "123456" }, { recovery_code: "fixture-recovery" }]) {
  test(`pending 2FA continues with ${Object.keys(payload)[0]} and context after success`, async () => {
    let authenticated = false;
    respond((r) => {
      if (r.url === "/login") return { data: { two_factor: true } };
      if (r.url === "/two-factor-challenge") { authenticated = true; return { status: 204 }; }
      return { data: context(authenticated ? user : null, authenticated) };
    });
    const store = createAuthStore();
    await store.initialize();
    await store.login(credentials);
    assert.equal(store.getSnapshot().status, "requires_2fa");
    assert.equal(store.getSnapshot().user, null);
    assert.equal(store.getSnapshot().canAccessAdminPanel, false);
    const count = requests.length;
    await store.refresh();
    assert.equal(requests.length, count);
    await store.challenge(payload);
    assert.equal(store.getSnapshot().status, "authenticated");
    assert.equal(store.getSnapshot().canAccessAdminPanel, true);
    assert.deepEqual(JSON.parse(requests.find((r) => r.url === "/two-factor-challenge").data), payload);
    assert.equal(requests.at(-1).url, "/api/frontend-context");
    assert.ok(requests.every((r) => r.withCredentials));
  });
}
test("invalid OTP preserves challenge, expired session becomes guest without automatic retry", async () => {
  let errorStatus = 422;
  respond((r) => {
    if (r.url === "/login") return { data: { two_factor: true } };
    if (r.url === "/two-factor-challenge") throw fail(errorStatus, { errors: { code: ["Invalid code"] } });
    return { data: context() };
  });
  const store = createAuthStore();
  await store.initialize(); await store.login(credentials);
  await assert.rejects(store.challenge({ code: "123456" }), { kind: "validation" });
  assert.equal(store.getSnapshot().status, "requires_2fa");
  errorStatus = 419;
  await assert.rejects(store.challenge({ code: "123456" }), { kind: "csrf" });
  assert.equal(store.getSnapshot().status, "guest");
  assert.equal(requests.filter((r) => r.url === "/two-factor-challenge").length, 2);
});
test("mutually exclusive OTP/recovery input and absent challenge do not call transport", async () => {
  await assert.rejects(challengeTwoFactor({ code: "123456", recovery_code: "fixture" }), { kind: "validation" });
  const store = createAuthStore();
  await assert.rejects(store.challenge({ code: "123456" }));
  assert.equal(requests.length, 0);
});
test("successful login does not grant admin access until authoritative context; logout clears state/cache", async () => {
  let authenticated = false;
  let clears = 0;
  respond((r) => {
    if (r.url === "/login") { authenticated = true; return { data: { two_factor: false } }; }
    if (r.url === "/logout") return { status: 204 };
    return { data: context(authenticated ? user : null, false) };
  });
  const store = createAuthStore(() => { clears++; });
  await store.initialize(); await store.login(credentials);
  assert.equal(store.getSnapshot().status, "authenticated");
  assert.equal(store.getSnapshot().canAccessAdminPanel, false);
  await store.logout();
  assert.equal(requests.at(-1).url, "/logout");
  assert.equal(requests.at(-1).method, "post");
  assert.equal(store.getSnapshot().user, null);
  assert.equal(store.getSnapshot().status, "guest");
  assert.equal(clears, 2);
});
test("context failure after successful challenge fails closed and can recover without replaying OTP", async () => {
  let phase = "guest";
  respond((r) => {
    if (r.url === "/login") return { data: { two_factor: true } };
    if (r.url === "/two-factor-challenge") { phase = "failed-context"; return { status: 204 }; }
    if (phase === "failed-context") throw fail(503);
    return { data: context(phase === "recovered" ? user : null, true) };
  });
  const store = createAuthStore();
  await store.initialize(); await store.login(credentials);
  await assert.rejects(store.challenge({ code: "123456" }), { kind: "server" });
  assert.equal(store.getSnapshot().status, "error");
  assert.equal(store.getSnapshot().canAccessAdminPanel, false);
  phase = "recovered";
  await store.refresh();
  assert.equal(store.getSnapshot().status, "authenticated");
});
test("password confirmation supports status and 201 response without parsing empty body", async () => {
  respond((r) => ({ data: r.url.endsWith("-status") ? { confirmed: false } : "", status: r.method === "post" ? 201 : 200 }));
  assert.equal(await getPasswordConfirmationStatus(), false);
  await confirmPassword("fixture-password");
  assert.deepEqual(requests.map((r) => r.url), ["/user/confirmed-password-status", "/sanctum/csrf-cookie", "/user/confirm-password"]);
});
test("error normalization covers Laravel, trait, JSON:API, network and all required statuses", () => {
  const cases = { 401: "unauthorized", 403: "forbidden", 404: "not_found", 419: "csrf", 422: "validation", 423: "password_confirmation", 429: "rate_limited", 500: "server", 503: "server" };
  for (const [status, kind] of Object.entries(cases)) assert.equal(normalizeApiError(fail(Number(status))).kind, kind);
  const error = normalizeApiError(fail(422, { message: "Invalid", errors: { "ids.0": ["Unknown"] }, status_code: 422 }));
  assert.deepEqual(error.fields["ids.0"], ["Unknown"]);
  assert.equal(normalizeApiError(error), error);
  assert.equal("config" in error, false);
  assert.equal(normalizeApiError(new AxiosError("network")).kind, "network");
  assert.equal(normalizeApiError(fail(403, { errors: [{ detail: "Denied" }] })).message, "Denied");
});
test("JSON:API joins reordered resources by type AND id, preserving missing/null/to-many and pagination", () => {
  const document = parseJsonApi({
    data: { type: "records", id: "1", attributes: {}, relationships: {
      owner: { data: { type: "users", id: "2" } },
      empty: { data: null },
      missing: { data: { type: "users", id: "99" } },
      many: { data: [{ type: "users", id: "2" }, { type: "users", id: "99" }] },
    } },
    included: [{ type: "other", id: "2", attributes: { name: "Wrong" } }, { type: "users", id: "2", attributes: { name: "Correct" } }],
    links: { next: null }, meta: { current_page: 1, total: 1, filters: { search: "" } },
  });
  const index = indexIncluded(document);
  assert.equal(resolveRelationship(document.data, "owner", index).attributes.name, "Correct");
  assert.equal(resolveRelationship(document.data, "empty", index), null);
  assert.equal(resolveRelationship(document.data, "missing", index), undefined);
  assert.equal(resolveRelationship(document.data, "absent", index), undefined);
  assert.equal(resolveRelationship(document.data, "many", index)[1], undefined);
  assert.equal(document.links.next, null);
  assert.equal(document.meta.total, 1);
  assert.deepEqual(parseJsonApi({ data: [] }).data, []);
  assert.equal(parseJsonApi({ data: null }).data, null);
  assert.equal(indexIncluded(parseJsonApi({ data: [] })).size, 0);
  assert.throws(() => parseJsonApi({ data: { id: 2, type: "users" } }), ApiError);
});
