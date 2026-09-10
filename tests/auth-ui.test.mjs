import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LoginForm, ChallengeForm } from "../src/components/auth/forms.tsx";
import { AuthError, AuthLoading } from "../src/components/auth/feedback.tsx";
import { ApiError } from "../src/lib/api/errors.ts";

const render = (component, props) => renderToStaticMarkup(createElement(component, props));
test("login renders email/password/remember, accessible field errors and disabled pending submit", () => {
  const html = render(LoginForm, { busy: true, error: new ApiError("Invalid", "validation", 422, { email: ["Email tidak cocok."] }), onSubmit: async () => {} });
  assert.match(html, /type="email"/); assert.match(html, /type="password"/);
  assert.match(html, /name="remember"/); assert.match(html, /Email tidak cocok/);
  assert.match(html, /aria-busy="true"/); assert.match(html, /Sedang masuk/);
  assert.match(html, /disabled/); assert.match(html, /aria-describedby="email-error"/);
});
test("2FA renders OTP input, recovery-mode control and disabled pending state", () => {
  const html = render(ChallengeForm, { busy: true, error: null, onSubmit: async () => {} });
  assert.match(html, /inputMode="numeric"/); assert.match(html, /maxLength="6"/);
  assert.match(html, /Gunakan recovery code/); assert.match(html, /Memverifikasi/);
  assert.match(html, /disabled/);
});
test("auth error categories render meaningful alerts without exposing raw server diagnostics", () => {
  const kinds = ["validation", "csrf", "rate_limited", "unauthorized", "forbidden", "server", "network", "configuration"];
  const outputs = kinds.map((kind) => render(AuthError, { error: new ApiError("SECRET_DEBUG", kind) }));
  for (const html of outputs) { assert.match(html, /role="alert"/); assert.doesNotMatch(html, /SECRET_DEBUG/); }
  assert.equal(new Set(outputs).size, kinds.length);
  assert.match(render(AuthLoading, {}), /role="status"/);
});
