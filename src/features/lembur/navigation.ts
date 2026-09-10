export const defaultLemburReturnTo = "/admin/lembur";

export function safeLemburReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === defaultLemburReturnTo || candidate?.startsWith(`${defaultLemburReturnTo}?`)
    ? candidate
    : defaultLemburReturnTo;
}

export function lemburDetailHref(uuid: string, returnTo = defaultLemburReturnTo) {
  const params = new URLSearchParams({ returnTo: safeLemburReturnTo(returnTo) });
  return `${defaultLemburReturnTo}/${encodeURIComponent(uuid)}?${params}`;
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
