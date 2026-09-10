import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PegawaiListFilters } from "../src/features/pegawai/components/list-filters.tsx";
import { PegawaiPagination, PegawaiTable } from "../src/features/pegawai/components/list.tsx";
import { PegawaiError, PegawaiLoading, PegawaiNotFound } from "../src/features/pegawai/components/states.tsx";
import { HistoryFilters, PegawaiHistoryTable } from "../src/features/pegawai/components/history.tsx";
import { Sidebar } from "../src/components/admin/sidebar.tsx";
import { ApiError } from "../src/lib/api/errors.ts";

const UUID = "11111111-1111-4111-8111-111111111111";
const pagination = { current_page: 1, last_page: 2, per_page: 15, total: 16, from: 1, to: 15 };
const list = { rows: [{ id: "7", uuid: UUID, name: "Ayu", email: "ayu@example.test", image: null, jabatan: "Staf", nip: "197001", kode_biro: "UMUM", is_active: true, lemburs_count: 4 }], filters: { search: "", status: null }, pagination };
const history = { rows: [{ id: "11", uuid: "22222222-2222-4222-8222-222222222222", tanggal: "2026-09-04", nama_kegiatan: "Rapat", lokasi_kegiatan: "Kantor", jenis_hari: "hari_kerja", status: "complete", upah: 50000, can_lock: true, can_delete: true, locked_at: null, pegawai: null }], filters: { bulan: "2026-09", pegawai: UUID, status: "complete", jenis_hari: "semua", search: "" }, pagination: { ...pagination, last_page: 1, per_page: 10, total: 1, to: 1 } };
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("pegawai list UI renders search, status, responsive table, detail UUID and server pagination", () => {
  const filters = render(PegawaiListFilters, { initial: {}, disabled: false, onApply: () => {}, onReset: () => {} }); assert.match(filters, /Nama, NIP, jabatan, atau kode biro/); assert.match(filters, /Tidak aktif/); assert.match(filters, /Reset/);
  const table = render(PegawaiTable, { list, updating: false, returnTo: "/admin/pegawai?status=active&page=2" });
  for (const value of ["Ayu", "197001", "Staf", "UMUM", "Aktif", "4"]) assert.match(table, new RegExp(value));
  assert.match(table, new RegExp(`/admin/pegawai/${UUID}`)); assert.match(table, /returnTo=/); assert.match(table, /overflow-x-auto/);
  assert.match(render(PegawaiPagination, { pagination, disabled: false, onPage: () => {} }), /Halaman 1 dari 2/);
});

test("pegawai loading, empty/not-found, and errors remain distinct", () => {
  assert.match(render(PegawaiLoading, {}), /role="status"/); assert.match(render(PegawaiNotFound, { returnTo: "/admin/pegawai" }), /Pegawai tidak ditemukan/);
  for (const kind of ["unauthorized", "forbidden", "not_found", "csrf", "validation", "rate_limited", "server", "network", "configuration", "contract"]) {
    const html = render(PegawaiError, { error: new ApiError("private", kind), retry: () => {}, busy: false }); assert.match(html, /role="alert"/); assert.doesNotMatch(html, /private/);
  }
});

test("history renders filters, empty-capable list, pagination and existing Lembur detail link", () => {
  const filters = render(HistoryFilters, { initial: { page: 1, per_page: 10 }, disabled: false, onApply: () => {}, onReset: () => {} }); assert.match(filters, /type="month"/); assert.match(filters, /Cari kegiatan\/lokasi/);
  const html = render(PegawaiHistoryTable, { history, updating: false, returnTo: `/admin/pegawai/${UUID}?bulan=2026-09`, onPage: () => {} });
  assert.match(html, /Rapat/); assert.match(html, new RegExp("/admin/lembur/22222222-2222-4222-8222-222222222222")); assert.match(html, /Pagination riwayat lembur/);
});

test("sidebar exposes Pegawai and marks nested detail active", () => {
  const html = render(Sidebar, { pathname: `/admin/pegawai/${UUID}` }); assert.match(html, /href="\/admin\/pegawai"/); assert.match(html, /aria-current="page"[^>]*href="\/admin\/pegawai"/); assert.match(html, /href="\/admin\/settings"/);
});
