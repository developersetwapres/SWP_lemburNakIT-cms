import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { apiClient } from "../src/lib/api/client.ts";
import { createAuthStore } from "../src/lib/auth/store.ts";
import { authView } from "../src/lib/auth/access.ts";

const user = { type: "users", id: "7", attributes: { role: ["administrator"] } };
const context = (authenticated = false, allowed = false) => ({
  data: { type: "frontend-contexts", id: "current", attributes: { auth: { user: authenticated ? user : null } } },
  meta: { canAccessAdminPanel: allowed },
});
const credentials = { email: "fixture@example.invalid", password: "fixture-only" };
let requests;
function respond(handler) {
  apiClient.defaults.adapter = async (config) => {
    requests.push(config.url);
    return { status: 200, statusText: "OK", config, headers: {}, data: await handler(config.url) };
  };
}
function failure(status) {
  return new AxiosError("Rejected", "ERR_BAD_RESPONSE", undefined, undefined, { status, headers: {}, data: { message: "Rejected" } });
}
beforeEach(() => {
  globalThis.window = {};
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  requests = [];
});

for (const [status, allowed, expected] of [
  ["guest", false, "redirect_login"], ["authenticated", true, "admin"],
  ["authenticated", false, "denied"], ["loading", true, "loading"],
  ["requires_2fa", true, "redirect_login"], ["error", false, "error"],
]) {
  test(`admin entry: ${status}, permission=${allowed} => ${expected}`, () => {
    assert.equal(authView({ status, user: status === "authenticated" ? user : null, canAccessAdminPanel: allowed, error: null }, "admin"), expected);
  });
}
test("login page never redirects on loading, pending MFA, or a role without gate permission", () => {
  assert.equal(authView({ status: "loading" }, "login"), "loading");
  assert.equal(authView({ status: "loading" }, "login", "login"), "login");
  assert.equal(authView({ status: "loading" }, "login", "challenge"), "challenge");
  assert.equal(authView({ status: "requires_2fa" }, "login"), "challenge");
  assert.equal(authView({ status: "authenticated", user, canAccessAdminPanel: false }, "login"), "denied");
});
for (const mfa of [false, true]) {
  test(`${mfa ? "2FA" : "login"} redirects only after delayed context confirms admin; duplicate submit blocked`, async () => {
    let release;
    let completed = false;
    let posts = 0;
    const wait = new Promise((resolve) => { release = resolve; });
    respond(async (url) => {
      if (url === "/login") { posts++; if (!mfa) completed = true; return { two_factor: mfa }; }
      if (url === "/two-factor-challenge") { posts++; completed = true; return ""; }
      if (url === "/api/frontend-context") {
        if (completed) await wait;
        return context(completed, completed);
      }
      return "";
    });
    const store = createAuthStore();
    await store.initialize();
    if (mfa) await store.login(credentials);
    const pending = mfa ? store.challenge({ code: "123456" }) : store.login(credentials);
    assert.equal(authView(store.getSnapshot(), "admin"), "loading");
    await assert.rejects(mfa ? store.challenge({ code: "123456" }) : store.login(credentials));
    release(); await pending;
    assert.equal(posts, mfa ? 2 : 1);
    assert.equal(authView(store.getSnapshot(), "login"), "redirect_admin");
    assert.equal(authView(store.getSnapshot(), "admin"), "admin");
  });
}
for (const [status, view] of [[422, "challenge"], [419, "login"], [429, "challenge"], [401, "login"], [403, "denied"], [503, "challenge"]]) {
  test(`challenge ${status} is surfaced with ${view}, without automatic retry`, async () => {
    respond((url) => {
      if (url === "/login") return { two_factor: true };
      if (url === "/two-factor-challenge") throw failure(status);
      return context();
    });
    const store = createAuthStore();
    await store.initialize(); await store.login(credentials);
    await assert.rejects(store.challenge({ code: "123456" }));
    assert.equal(authView(store.getSnapshot(), "login"), view);
    assert.equal(store.getSnapshot().error.status, status);
    assert.equal(requests.filter((url) => url === "/two-factor-challenge").length, 1);
    assert.notEqual(authView(store.getSnapshot(), "admin"), "admin");
  });
}
test("login network failure is error, never a guest success or admin redirect", async () => {
  respond((url) => {
    if (url === "/login") throw new AxiosError("Offline");
    return context();
  });
  const store = createAuthStore(); await store.initialize();
  await assert.rejects(store.login(credentials), { kind: "network" });
  assert.equal(store.getSnapshot().status, "error");
  assert.equal(authView(store.getSnapshot(), "login"), "error");
});
test("initial API failure is error, refresh recovers guest; logout returns to login", async () => {
  respond(() => { throw failure(503); });
  const store = createAuthStore();
  await assert.rejects(store.initialize());
  assert.equal(authView(store.getSnapshot(), "admin"), "error");
  respond(() => context()); await store.refresh();
  assert.equal(authView(store.getSnapshot(), "admin"), "redirect_login");
  respond(() => context(true, true)); await store.refresh();
  respond(() => ""); await store.logout();
  assert.equal(authView(store.getSnapshot(), "admin"), "redirect_login");
  assert.equal(requests.at(-1), "/logout");
});
