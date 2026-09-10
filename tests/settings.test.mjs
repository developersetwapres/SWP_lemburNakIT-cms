import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { apiClient } from "../src/lib/api/client.ts";
import { getProfile, getSecuritySettings, parseProfile, parseSecuritySettings, updatePassword, updateProfile } from "../src/features/settings/api.ts";
import { passwordConfirmationOptions, profileOptions, securityOptions } from "../src/features/settings/query.ts";
import { createRunOnce } from "../src/features/lembur/lock.ts";

const UUID = "11111111-1111-4111-8111-111111111111";
const profileResource = { type: "users", id: "5", attributes: { name: "Admin", email: "admin@example.test", role: ["administrator"], uuid: UUID, image: null, jabatan: "Supervisor", nip: "1001", kode_biro: "UMUM", is_active: true, email_verified_at: "2026-01-01T00:00:00Z", two_factor_confirmed_at: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z" } };
const profileFixture = { data: profileResource, meta: { mustVerifyEmail: false, status: null } };
const securityFixture = { data: { type: "security-settings", id: "5", attributes: { canManageTwoFactor: true, canManagePasskeys: true, passkeys: [{ id: 9, name: "Laptop", authenticator: "platform", created_at_diff: "1 hari lalu", last_used_at_diff: null }], passwordRules: "minimal 8 karakter", twoFactorEnabled: true, requiresConfirmation: true } } };
const auth = (status, allowed) => ({ status, user: status === "authenticated" ? { type: "users", id: "5", attributes: {} } : null, canAccessAdminPanel: allowed, context: null, error: null });

beforeEach(() => { globalThis.window = {}; process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid"; });

test("profile JSON:API contract parses all returned fields and response metadata", () => {
  const profile = parseProfile(profileFixture); assert.equal(profile.name, "Admin"); assert.deepEqual(profile.role, ["administrator"]); assert.equal(profile.mustVerifyEmail, false); assert.equal(profile.status, null);
  assert.equal(parseProfile({ data: profileResource, meta: { message: "Profile updated." } }).message, "Profile updated.");
});

test("security contract supports enabled features, passkeys and omitted conditional 2FA fields", () => {
  const security = parseSecuritySettings(securityFixture); assert.equal(security.twoFactorEnabled, true); assert.equal(security.passkeys[0].name, "Laptop");
  const disabled = parseSecuritySettings({ data: { type: "security-settings", id: "5", attributes: { canManageTwoFactor: false, canManagePasskeys: false, passkeys: [], passwordRules: "minimal 8 karakter" } } });
  assert.equal(disabled.twoFactorEnabled, undefined); assert.deepEqual(disabled.passkeys, []);
});

test("malformed profile and security responses become contract errors", () => {
  assert.throws(() => parseProfile({ data: { ...profileResource, type: "security-settings" } }), { kind: "contract" });
  assert.throws(() => parseProfile({ data: { ...profileResource, attributes: { name: "Missing fields" } } }), { kind: "contract" });
  assert.throws(() => parseSecuritySettings({ data: { type: "security-settings", id: "5", attributes: { canManageTwoFactor: true } } }), { kind: "contract" });
});

test("profile GET/PATCH, security GET and password PUT use exact contracts", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); if (config.url === "/api/settings/security") return { status: 200, headers: {}, config, data: securityFixture }; if (config.url === "/api/settings/password") return { status: 204, headers: {}, config, data: "" }; return { status: 200, headers: {}, config, data: config.method === "patch" ? { data: profileResource, meta: { message: "Profile updated." } } : profileFixture }; };
  await getProfile(); await updateProfile({ name: "Admin Baru", email: "baru@example.test" }); await getSecuritySettings();
  const password = { current_password: "old-password", password: "new-password", password_confirmation: "new-password" }; await updatePassword(password);
  assert.deepEqual(requests.map((item) => [item.method, item.url]), [["get", "/api/settings/profile"], ["patch", "/api/settings/profile"], ["get", "/api/settings/security"], ["put", "/api/settings/password"]]);
  assert.deepEqual(JSON.parse(requests[1].data), { name: "Admin Baru", email: "baru@example.test" }); assert.deepEqual(JSON.parse(requests[3].data), password);
});

test("password update accepts only backend 204 response", async () => {
  apiClient.defaults.adapter = async (config) => ({ status: 200, headers: {}, config, data: {} });
  await assert.rejects(() => updatePassword({ current_password: "a", password: "b", password_confirmation: "b" }), { kind: "contract" });
});

for (const [status, permission, enabled] of [["guest", false, false], ["requires_2fa", true, false], ["authenticated", false, false], ["authenticated", true, true]]) {
  test(`settings queries gate ${status}/${permission}`, () => {
    assert.equal(profileOptions(auth(status, permission)).enabled, enabled); assert.equal(passwordConfirmationOptions(auth(status, permission)).enabled, enabled);
    assert.equal(securityOptions(auth(status, permission), true).enabled, enabled); assert.equal(securityOptions(auth(status, permission), false).enabled, false);
  });
}

test("security endpoint is not automatically polled or refetched by browser events", () => {
  const options = securityOptions(auth("authenticated", true), true);
  assert.equal(options.retry, false); assert.equal(options.staleTime, Infinity); assert.equal(options.refetchOnMount, false); assert.equal(options.refetchOnWindowFocus, false); assert.equal(options.refetchOnReconnect, false); assert.equal(options.refetchInterval, undefined);
});

test("single-flight guard prevents duplicate settings mutations", async () => {
  const once = createRunOnce(); let calls = 0; let release; const operation = () => { calls++; return new Promise((resolve) => { release = resolve; }); };
  const first = once(operation); const duplicate = once(operation); assert.equal(calls, 1); assert.equal(await duplicate, undefined); release(); await first;
});

test("settings forms contain exact profile/password fields and no stored credentials", () => {
  const profile = readFileSync(new URL("../src/features/settings/components/profile-section.tsx", import.meta.url), "utf8");
  assert.match(profile, /register\(\"name\"/); assert.match(profile, /register\(\"email\"/); assert.doesNotMatch(profile, /register\(\"role\"/);
  const password = readFileSync(new URL("../src/features/settings/components/password-section.tsx", import.meta.url), "utf8");
  for (const field of ["current_password", "password", "password_confirmation"]) assert.match(password, new RegExp(`register\\(\"${field}\"`));
  assert.doesNotMatch(profile + password, /localStorage|sessionStorage/);
});
