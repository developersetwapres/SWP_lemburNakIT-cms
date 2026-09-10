import { ApiError } from "@/lib/api/errors";

const fallbackPdfFilename = "lembur.pdf";

function safePdfFilename(value: string) {
  const leaf = value.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f<>:"|?*]/g, "_").trim();
  if (!leaf) return fallbackPdfFilename;
  return leaf.toLowerCase().endsWith(".pdf") ? leaf : `${leaf}.pdf`;
}

export function pdfFilenameFromDisposition(value: string | null | undefined) {
  if (!value) return fallbackPdfFilename;
  const encoded = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return safePdfFilename(decodeURIComponent(encoded.replace(/^"|"$/g, ""))); }
    catch { return fallbackPdfFilename; }
  }
  const regular = value.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  return safePdfFilename((regular?.[1] ?? regular?.[2] ?? "").trim());
}

export function assertPdfBlob(data: unknown, contentType: string | undefined) {
  if (!(data instanceof Blob) || data.size === 0 || !`${contentType ?? data.type}`.toLowerCase().includes("application/pdf")) {
    throw new ApiError("Invalid PDF export response.", "contract");
  }
  return data;
}

export function downloadPdf(blob: Blob, filename: string, environment: Pick<typeof globalThis, "document" | "URL"> = globalThis) {
  const objectUrl = environment.URL.createObjectURL(blob);
  const anchor = environment.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safePdfFilename(filename);
  anchor.hidden = true;
  environment.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  environment.URL.revokeObjectURL(objectUrl);
}
