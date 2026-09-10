export const defaultPegawaiReturnTo = "/admin/pegawai";

export function safePegawaiReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === defaultPegawaiReturnTo || candidate?.startsWith(`${defaultPegawaiReturnTo}?`) ? candidate : defaultPegawaiReturnTo;
}
