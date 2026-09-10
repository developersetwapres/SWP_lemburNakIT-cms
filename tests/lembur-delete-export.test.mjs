import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dialog } from "@base-ui/react/dialog";
import { apiClient } from "../src/lib/api/client.ts";
import { deleteLembur, exportLemburs } from "../src/features/lembur/api.ts";
import { DeleteConfirmationContent, deleteErrorMessage } from "../src/features/lembur/components/delete-dialog.tsx";
import { exportErrorMessage } from "../src/features/lembur/components/export-button.tsx";
import { LemburDetailContent } from "../src/features/lembur/components/detail-content.tsx";
import { LemburActionFeedback } from "../src/features/lembur/components/lembur-page.tsx";
import { toLemburExportParams } from "../src/features/lembur/filters.ts";
import { lockDialogActions, runOnce } from "../src/features/lembur/lock.ts";
import { safeLemburReturnTo, withLemburNotice } from "../src/features/lembur/navigation.ts";
import { assertPdfBlob, downloadPdf, pdfFilenameFromDisposition } from "../src/features/lembur/pdf.ts";
import { invalidateLemburAfterDelete, lemburDetailQueryKey, lemburListQueryPrefix } from "../src/features/lembur/query.ts";
import { ApiError } from "../src/lib/api/errors.ts";

const UUID = "11111111-1111-4111-8111-111111111111";
const detail = { id: "11", uuid: UUID, tanggal: "2026-09-04", nama_kegiatan: "Rapat evaluasi", lokasi_kegiatan: "Ruang rapat", foto_kegiatan_url: null, foto_kegiatan_at: null, foto_pulang_url: null, foto_pulang_at: null, waktu_pulang: "20:15", jenis_hari: "hari_kerja", upah: 75000, status: "complete", can_lock: true, can_delete: true, locked_at: null, pegawai: { uuid: "u7", name: "Ayu", nip: "197001", jabatan: "Staf" }, lockedBy: null };
const filters = { bulan: "2026-09", pegawai: "user-7", status: "complete", jenis_hari: "libur", search: "rapat", page: 4, per_page: 50 };

beforeEach(() => { globalThis.window = {}; process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid"; });

test("can_delete alone controls the detail delete action", () => {
  const allowed = renderToStaticMarkup(createElement(LemburDetailContent, { detail, deleteAction: createElement("button", null, "Hapus") }));
  assert.match(allowed, /Hapus/);
  const denied = renderToStaticMarkup(createElement(LemburDetailContent, { detail: { ...detail, status: "locked", can_lock: false, can_delete: false }, deleteAction: createElement("button", null, "Hapus") }));
  assert.doesNotMatch(denied, /Hapus/); assert.match(denied, /sudah dikunci/);
});

test("delete confirmation names the record, warns about permanent photo removal, and disables duplicate controls", () => {
  const render = (props) => renderToStaticMarkup(createElement(Dialog.Root, { open: true }, createElement(DeleteConfirmationContent, props)));
  const ready = render({ activity: "Rapat evaluasi", pending: false, error: null, onCancel: () => {}, onConfirm: () => {} });
  assert.match(ready, /Rapat evaluasi/); assert.match(ready, /dihapus permanen/); assert.match(ready, /foto terkait/); assert.match(ready, /Batal/); assert.match(ready, /Hapus permanen/);
  const pending = render({ activity: "Rapat evaluasi", pending: true, error: null, onCancel: () => {}, onConfirm: () => {} });
  assert.match(pending, /Menghapus/); assert.equal((pending.match(/ disabled=""/g) ?? []).length, 2);
});

test("delete sends the UUID once and accepts only the backend 204 contract", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { status: 204, headers: {}, config, data: "" }; };
  await deleteLembur(UUID);
  assert.equal(requests.length, 1); assert.equal(requests[0].method, "delete"); assert.equal(requests[0].url, `/api/admin/lemburs/${UUID}`);
  apiClient.defaults.adapter = async (config) => ({ status: 200, headers: {}, config, data: { ok: true } });
  await assert.rejects(() => deleteLembur(UUID), { kind: "contract" });
});

test("single-flight prevents duplicate delete and cancel performs no operation", async () => {
  let calls = 0; let release; const busy = { current: false };
  const operation = () => { calls++; return new Promise((resolve) => { release = resolve; }); };
  const first = runOnce(busy, operation); const duplicate = runOnce(busy, operation);
  assert.equal(calls, 1); assert.equal(await duplicate, undefined); release(); await first;
  let closes = 0; let deletes = 0; const actions = lockDialogActions(() => closes++, () => deletes++);
  actions.cancel(); assert.equal(closes, 1); assert.equal(deletes, 0);
});

test("delete invalidates exact detail without refetch and all list variants", async () => {
  const calls = []; const client = { invalidateQueries: async (options) => { calls.push(options); } };
  await invalidateLemburAfterDelete(client, "5", UUID);
  assert.deepEqual(calls, [
    { queryKey: lemburDetailQueryKey("5", UUID), exact: true, refetchType: "none" },
    { queryKey: lemburListQueryPrefix("5") },
  ]);
});

test("delete success destination preserves safe return filters and adds accessible list notice state", () => {
  const destination = withLemburNotice("/admin/lembur?bulan=2026-09&status=complete&page=2", "deleted");
  assert.match(destination, /^\/admin\/lembur\?/); assert.match(destination, /bulan=2026-09/); assert.match(destination, /status=complete/); assert.match(destination, /page=2/); assert.match(destination, /notice=deleted/);
  assert.equal(safeLemburReturnTo("https://evil.example.invalid"), "/admin/lembur");
  const feedback = renderToStaticMarkup(createElement(LemburActionFeedback, { deleted: true, bulkSuccess: null }));
  assert.match(feedback, /role="status"/); assert.match(feedback, /berhasil dihapus/);
});

test("locked delete and transport errors are explained without exposing raw server messages", () => {
  assert.match(deleteErrorMessage(new ApiError("private", "forbidden", 403)), /telah dikunci/);
  for (const kind of ["unauthorized", "not_found", "csrf", "validation", "rate_limited", "server", "network", "configuration", "contract"]) assert.doesNotMatch(deleteErrorMessage(new ApiError("private", kind)), /private/);
});

test("export sends exactly the five supported business filters and excludes pagination", () => {
  assert.deepEqual(toLemburExportParams(filters), { bulan: "2026-09", pegawai: "user-7", status: "complete", jenis_hari: "libur", search: "rapat" });
  assert.deepEqual(toLemburExportParams({ page: 3, per_page: 100 }), {});
});

test("export requests a binary PDF and uses the exposed Content-Disposition filename", async () => {
  const requests = []; const pdf = new Blob(["%PDF-test"], { type: "application/pdf" });
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { status: 200, headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=lembur-2026-09.pdf" }, config, data: pdf }; };
  const result = await exportLemburs(filters);
  assert.equal(result.blob, pdf); assert.equal(result.filename, "lembur-2026-09.pdf"); assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/admin/lemburs/export"); assert.equal(requests[0].method, "get"); assert.equal(requests[0].responseType, "blob"); assert.equal(requests[0].headers.Accept, "application/pdf");
  assert.deepEqual(requests[0].params, toLemburExportParams(filters));
});

test("PDF filename parsing supports standard and encoded headers with a safe fallback", () => {
  assert.equal(pdfFilenameFromDisposition('attachment; filename="lembur-2026-09.pdf"'), "lembur-2026-09.pdf");
  assert.equal(pdfFilenameFromDisposition("attachment; filename*=UTF-8''laporan%20lembur.pdf"), "laporan lembur.pdf");
  assert.equal(pdfFilenameFromDisposition('attachment; filename="../unsafe:name"'), "unsafe_name.pdf");
  assert.equal(pdfFilenameFromDisposition(null), "lembur.pdf");
});

test("PDF download uses an object URL, browser download name, and cleans it up", () => {
  const events = []; const anchor = { hidden: false, href: "", download: "", click: () => events.push("click"), remove: () => events.push("remove") };
  const environment = { URL: { createObjectURL: () => { events.push("create"); return "blob:test"; }, revokeObjectURL: (url) => events.push(`revoke:${url}`) }, document: { createElement: () => anchor, body: { appendChild: () => events.push("append") } } };
  downloadPdf(new Blob(["pdf"], { type: "application/pdf" }), "report.pdf", environment);
  assert.equal(anchor.href, "blob:test"); assert.equal(anchor.download, "report.pdf"); assert.deepEqual(events, ["create", "append", "click", "remove", "revoke:blob:test"]);
});

test("export rejects malformed/non-PDF binary responses and maps errors accessibly", async () => {
  assert.throws(() => assertPdfBlob(new Blob([], { type: "application/pdf" }), "application/pdf"), { kind: "contract" });
  assert.throws(() => assertPdfBlob(new Blob(["json"], { type: "application/json" }), "application/json"), { kind: "contract" });
  apiClient.defaults.adapter = async (config) => ({ status: 200, headers: { "content-type": "application/json" }, config, data: new Blob(["{}"], { type: "application/json" }) });
  await assert.rejects(() => exportLemburs(filters), { kind: "contract" });
  for (const kind of ["unauthorized", "forbidden", "not_found", "csrf", "validation", "rate_limited", "server", "network", "configuration", "contract"]) assert.doesNotMatch(exportErrorMessage(new ApiError("private", kind)), /private/);
});

test("single-flight prevents duplicate PDF export requests", async () => {
  let calls = 0; let release; const busy = { current: false }; const pdf = new Blob(["pdf"], { type: "application/pdf" });
  apiClient.defaults.adapter = (config) => { calls++; return new Promise((resolve) => { release = () => resolve({ status: 200, headers: { "content-type": "application/pdf" }, config, data: pdf }); }); };
  const first = runOnce(busy, () => exportLemburs(filters)); const duplicate = runOnce(busy, () => exportLemburs(filters));
  await new Promise((resolve) => setTimeout(resolve, 0)); assert.equal(calls, 1); assert.equal(await duplicate, undefined); release(); assert.equal((await first).filename, "lembur.pdf");
});
