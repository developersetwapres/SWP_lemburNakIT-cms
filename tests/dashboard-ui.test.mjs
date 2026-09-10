import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardSummaryContent } from "../src/features/dashboard/components/summary.tsx";
import { DashboardLoading, DashboardError } from "../src/features/dashboard/components/states.tsx";
import { Sidebar } from "../src/components/admin/sidebar.tsx";
import { AdminShellContent } from "../src/components/admin/admin-shell.tsx";
import { ApiError } from "../src/lib/api/errors.ts";

const render = (component, props) => renderToStaticMarkup(createElement(component, props));
test("all-zero content renders four statistics and twelve readable zero months without false error", () => {
  const summary = { bulan: "2024-02", total_lembur: 0, total_upah: 0, hari_kerja: 0, hari_libur: 0, chart: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 })) };
  const html = render(DashboardSummaryContent, { summary });
  assert.match(html, /Februari 2024/); assert.match(html, /Tahun 2024/); assert.match(html, /Seluruh bulan bernilai 0/);
  assert.equal((html.match(/<article/g) ?? []).length, 4); assert.equal((html.match(/<li /g) ?? []).length, 12);
  assert.equal((html.match(/height:0%/g) ?? []).length, 12); assert.doesNotMatch(html, /NaN|gagal|Infinity/);
  assert.match(html, /Januari/); assert.match(html, /Desember/);
});

test("loading reserves metric/chart space without presenting fake numbers", () => {
  const html = render(DashboardLoading, {});
  assert.match(html, /role="status"/); assert.match(html, /Memuat dashboard/);
  assert.doesNotMatch(html, /Rp|Total upah|Total lembur/);
});

test("dashboard errors offer session recovery or explicit retry without raw diagnostics", () => {
  for (const kind of ["unauthorized", "csrf", "forbidden", "rate_limited", "server", "network", "configuration", "contract"]) {
    const html = render(DashboardError, { error: new ApiError("PRIVATE_DEBUG", kind), retry: () => {}, busy: true });
    assert.match(html, /role="alert"/); assert.match(html, /disabled/); assert.doesNotMatch(html, /PRIVATE_DEBUG/);
    assert.match(html, kind === "unauthorized" || kind === "csrf" ? /Periksa kembali sesi/ : /Coba lagi/);
    if (kind === "forbidden") assert.match(html, /Akses dashboard ditolak/);
  }
});

test("sidebar exposes Dashboard and Lembur without later-phase routes", () => {
  const html = render(Sidebar, {});
  assert.match(html, /href="\/admin"/); assert.match(html, /aria-current="page"/);
  assert.match(html, /href="\/admin\/lembur"/);
  assert.doesNotMatch(html, /\/admin\/(pegawai|settings)/);
});

test("shell has responsive sidebar, mobile trigger, content landmark, and logout control", () => {
  const html = render(AdminShellContent, { pathname: "/admin", authError: null, logoutDisabled: true, onLogout: () => {}, children: "CONTENT" });
  assert.match(html, /Buka navigasi admin/); assert.match(html, /md:block/); assert.match(html, /md:hidden/);
  assert.match(html, /id="admin-content"/); assert.match(html, /Keluar/); assert.match(html, /CONTENT/);
  // The shell honors the auth layer's pending state.
  assert.match(html, /disabled/);
});
