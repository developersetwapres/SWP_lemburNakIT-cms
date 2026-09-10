import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsError, SettingsLoading, settingsErrorMessage } from "../src/features/settings/components/feedback.tsx";
import { Sidebar } from "../src/components/admin/sidebar.tsx";
import { ApiError } from "../src/lib/api/errors.ts";

const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("settings loading and all API errors are accessible and classified", () => {
  assert.match(render(SettingsLoading, { label: "Memuat profile" }), /role="status"/);
  for (const kind of ["unauthorized", "forbidden", "not_found", "csrf", "validation", "password_confirmation", "rate_limited", "server", "network", "configuration", "contract"]) {
    const error = new ApiError("private", kind); const html = render(SettingsError, { error, retry: () => {}, busy: false }); assert.match(html, /role="alert"/); assert.doesNotMatch(settingsErrorMessage(error), /private/);
  }
});

test("settings navigation exists and nested settings route is active", () => {
  const html = render(Sidebar, { pathname: "/admin/settings" }); assert.match(html, /href="\/admin\/settings"/); assert.match(html, /aria-current="page"[^>]*href="\/admin\/settings"/);
});
