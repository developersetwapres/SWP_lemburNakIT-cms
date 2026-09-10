import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LemburFilters } from "../src/features/lembur/components/filters.tsx";
import { LemburPagination, LemburTable } from "../src/features/lembur/components/list.tsx";
import { LemburEmpty, LemburError, LemburLoading } from "../src/features/lembur/components/states.tsx";
import { Sidebar } from "../src/components/admin/sidebar.tsx";
import { LemburHeading } from "../src/features/lembur/components/lembur-page.tsx";
import { ApiError } from "../src/lib/api/errors.ts";

const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const list = { rows: [{ id: "11", uuid: "l-11", tanggal: "2026-09-04", nama_kegiatan: "Rapat evaluasi", lokasi_kegiatan: "Ruang rapat", jenis_hari: "hari_kerja", upah: 50000, status: "complete", waktu_pulang: "18:00", can_lock: true, can_delete: true, pegawai: { uuid: "u-7", name: "Ayu", nip: "197001", jabatan: "Staf" } }], filters: { bulan: "2026-09", pegawai: null, status: "complete", jenis_hari: "semua", search: "" }, pegawaiOptions: [{ uuid: "u-7", name: "Ayu", nip: "197001" }], pagination: { current_page: 1, last_page: 2, per_page: 15, total: 16, from: 1, to: 15 } };

test("lembur page controls render every supported filter with explicit search scope", () => {
  const heading = render(LemburHeading, {}); assert.match(heading, /<h1[^>]*>Data lembur/); assert.match(heading, /kegiatan atau lokasi/);
  const html = render(LemburFilters, { initial: list.filters, options: list.pegawaiOptions, disabled: false, onApply: () => {}, onReset: () => {} });
  assert.match(html, /type="month"/); assert.match(html, /Semua pegawai/); assert.match(html, /Complete/); assert.match(html, /Draft/); assert.match(html, /Locked/);
  assert.match(html, /Hari kerja/); assert.match(html, /Hari libur/); assert.match(html, /Kegiatan atau lokasi/); assert.match(html, /Terapkan filter/); assert.match(html, /Reset/);
});

test("table renders contract fields responsively and contains no business action", () => {
  const html = render(LemburTable, { list, updating: false });
  for (const value of ["Pegawai", "Tanggal", "Kegiatan", "Lokasi", "Status", "Jenis hari", "Ayu", "Rapat evaluasi", "Ruang rapat", "Complete", "Hari kerja"]) assert.match(html, new RegExp(value));
  assert.match(html, /overflow-x-auto/); assert.doesNotMatch(html, /Detail|Lock|Hapus|Export|Edit/);
});

test("pagination uses server metadata and exposes only valid previous/next state", () => {
  const first = render(LemburPagination, { pagination: list.pagination, disabled: false, onPage: () => {} });
  assert.match(first, /1–15 dari 16/); assert.match(first, /Halaman 1 dari 2/); assert.match(first, /Sebelumnya/); assert.match(first, /disabled/); assert.match(first, /Berikutnya/);
  const last = render(LemburPagination, { pagination: { ...list.pagination, current_page: 2, from: 16, to: 16 }, disabled: false, onPage: () => {} });
  assert.match(last, /16–16 dari 16/); assert.match(last, /Berikutnya/); assert.match(last, /disabled/);
});

test("loading, empty/filter reset, and every required error category are explicit", () => {
  assert.match(render(LemburLoading, {}), /role="status"/);
  const empty = render(LemburEmpty, { filtered: true, onReset: () => {} }); assert.match(empty, /Belum ada data lembur/); assert.match(empty, /Reset filter/);
  assert.doesNotMatch(render(LemburEmpty, { filtered: false, onReset: () => {} }), /Reset filter/);
  for (const kind of ["unauthorized", "forbidden", "csrf", "validation", "rate_limited", "server", "network", "configuration"]) {
    const html = render(LemburError, { error: new ApiError("PRIVATE", kind), retry: () => {}, busy: true });
    assert.match(html, /role="alert"/); assert.doesNotMatch(html, /PRIVATE/); assert.match(html, /disabled/);
  }
});

test("sidebar marks Lembur active on its route and Dashboard inactive", () => {
  const html = render(Sidebar, { pathname: "/admin/lembur" });
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(html, /aria-current="page"[^>]*href="\/admin\/lembur"/);
  assert.doesNotMatch(html, /\/admin\/lembur\//);
});
