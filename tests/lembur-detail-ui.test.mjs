import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dialog } from "@base-ui/react/dialog";
import { LemburDetailContent } from "../src/features/lembur/components/detail-content.tsx";
import { LemburDetailError, LemburDetailLoading, LemburDetailNotFound } from "../src/features/lembur/components/detail-states.tsx";
import { LockConfirmationContent } from "../src/features/lembur/components/lock-dialog.tsx";
import { LemburTable } from "../src/features/lembur/components/list.tsx";
import { ApiError } from "../src/lib/api/errors.ts";

const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const detail = {
  id: "11", uuid: "11111111-1111-4111-8111-111111111111", tanggal: "2026-09-04", nama_kegiatan: "Rapat evaluasi", lokasi_kegiatan: "Ruang rapat",
  foto_kegiatan_url: "https://media.example.invalid/kegiatan.jpg", foto_kegiatan_at: "2026-09-04 18:10:00",
  foto_pulang_url: "https://media.example.invalid/pulang.jpg", foto_pulang_at: "2026-09-04 20:15:00", waktu_pulang: "20:15",
  jenis_hari: "hari_kerja", upah: 75000, status: "complete", can_lock: true, can_delete: true, locked_at: null,
  pegawai: { uuid: "user-7", name: "Ayu", nip: "197001", jabatan: "Staf" }, lockedBy: null,
};

test("detail loading, not-found, forbidden, and generic error states stay distinct", () => {
  assert.match(render(LemburDetailLoading, {}), /role="status"/);
  const missing = render(LemburDetailNotFound, { returnTo: "/admin/lembur?page=2" }); assert.match(missing, /Lembur tidak ditemukan/); assert.match(missing, /Kembali ke Lembur/);
  const forbidden = render(LemburDetailError, { error: new ApiError("private", "forbidden", 403), returnTo: "/admin/lembur", retry: () => {}, busy: false });
  assert.match(forbidden, /Akses ditolak/); assert.doesNotMatch(forbidden, /private/);
  const network = render(LemburDetailError, { error: new ApiError("private", "network"), returnTo: "/admin/lembur", retry: () => {}, busy: true });
  assert.match(network, /Detail lembur gagal dimuat/); assert.match(network, /Tidak dapat terhubung/); assert.match(network, /disabled/);
});

test("detail content renders employee, overtime, media, timestamps, wage, status, and accessible photos", () => {
  const html = render(LemburDetailContent, { detail, action: createElement("button", null, "Lock lembur") });
  for (const value of ["Informasi pegawai", "Ayu", "197001", "Staf", "Informasi lembur", "Rapat evaluasi", "Ruang rapat", "Hari kerja", "Complete", "Dokumentasi", "04 Sep 2026, 18:10", "Lock lembur"]) assert.match(html, new RegExp(value));
  assert.match(html, /Rp(?:\s|&nbsp;| )*75\.000/);
  assert.match(html, /src="https:\/\/media\.example\.invalid\/kegiatan\.jpg"/); assert.match(html, /alt="Foto kegiatan Rapat evaluasi"/);
});

test("missing photos and optional fields render as valid unavailable states", () => {
  const html = render(LemburDetailContent, { detail: { ...detail, foto_kegiatan_url: null, foto_kegiatan_at: null, foto_pulang_url: null, foto_pulang_at: null, waktu_pulang: null, pegawai: null }, action: null });
  assert.equal((html.match(/Foto tidak tersedia/g) ?? []).length, 2); assert.match(html, /Timestamp tidak tersedia/); assert.match(html, /Pegawai tidak tersedia/);
});

test("lock action follows backend can_lock and locked status is textual", () => {
  const allowed = render(LemburDetailContent, { detail, action: createElement("button", null, "Lock lembur") }); assert.match(allowed, /Lock lembur/);
  const locked = render(LemburDetailContent, { detail: { ...detail, status: "locked", can_lock: false, locked_at: "2026-09-05 08:00:00", lockedBy: { uuid: "u9", name: "Admin Satu", nip: null, jabatan: "Admin" } }, action: createElement("button", null, "Lock lembur") });
  assert.doesNotMatch(locked, /Lock lembur/); assert.match(locked, /Locked/); assert.match(locked, /Data lembur ini sudah dikunci/); assert.match(locked, /Admin Satu/);
});

test("confirmation explains final lock, exposes cancel/confirm, errors, and pending prevention", () => {
  const renderConfirmation = (props) => renderToStaticMarkup(createElement(Dialog.Root, { open: true }, createElement(LockConfirmationContent, props)));
  const ready = renderConfirmation({ pending: false, error: null, onCancel: () => {}, onConfirm: () => {} });
  assert.match(ready, /Kunci data lembur/); assert.match(ready, /tidak dapat dikembalikan/); assert.match(ready, /Batal/); assert.match(ready, /Konfirmasi Lock/);
  const failed = renderConfirmation({ pending: true, error: new ApiError("private", "validation", 422), onCancel: () => {}, onConfirm: () => {} });
  assert.match(failed, /role="alert"/); assert.match(failed, /Statusnya mungkin sudah berubah/); assert.doesNotMatch(failed, /private/); assert.equal((failed.match(/ disabled=""/g) ?? []).length, 2);
});

test("list links to UUID detail and keeps the full filtered return URL", () => {
  const list = { rows: [detail], filters: { bulan: "2026-09", pegawai: null, status: "complete", jenis_hari: "semua", search: "" }, pegawaiOptions: [], pagination: { current_page: 2, last_page: 2, per_page: 15, total: 16, from: 16, to: 16 } };
  const html = render(LemburTable, { list, updating: false, returnTo: "/admin/lembur?bulan=2026-09&status=complete&page=2" });
  assert.match(html, /href="\/admin\/lembur\/11111111-1111-4111-8111-111111111111\?returnTo=/); assert.match(html, /page%3D2/);
});
