export const defaultLemburReturnTo = "/admin/lembur";
export const lemburDetailPath = "/admin/lembur/detail";

function isPegawaiDetailReturn(candidate: string) {
  try {
    const url = new URL(candidate, "https://cms.invalid");
    return url.origin === "https://cms.invalid" && url.pathname === "/admin/pegawai/detail" && Boolean(url.searchParams.get("uuid"));
  } catch {
    return false;
  }
}

export function safeLemburReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const employeeHistory = candidate && isPegawaiDetailReturn(candidate);
  return candidate === defaultLemburReturnTo || candidate?.startsWith(`${defaultLemburReturnTo}?`) || employeeHistory
    ? candidate
    : defaultLemburReturnTo;
}

export function lemburReturnLabel(returnTo: string) {
  return returnTo.startsWith("/admin/pegawai/") ? "Kembali ke Pegawai" : "Kembali ke Lembur";
}

export function lemburDetailHref(uuid: string, returnTo = defaultLemburReturnTo) {
  const params = new URLSearchParams({ uuid, returnTo: safeLemburReturnTo(returnTo) });
  return `${lemburDetailPath}?${params}`;
}

export function lemburReturnTo(pathname: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  params.delete("notice");
  const query = params.toString();
  return safeLemburReturnTo(`${pathname}${query ? `?${query}` : ""}`);
}

export function withLemburNotice(returnTo: string, notice: "deleted") {
  const safe = safeLemburReturnTo(returnTo);
  const [pathname, query = ""] = safe.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("notice", notice);
  return `${pathname}?${params}`;
}
