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
