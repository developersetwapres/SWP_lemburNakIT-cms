export const statusLabels: Record<string, string> = { complete: "Complete", draft: "Draft", locked: "Locked" };
export const dayTypeLabels: Record<string, string> = { hari_kerja: "Hari kerja", hari_libur: "Hari libur" };

export function formatLemburDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

export function formatLemburTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${formatLemburDate(`${year}-${month}-${day}`)}, ${hour}:${minute}`;
}

export function formatLemburTime(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function employeeName(employee: { name: string } | null) { return employee?.name || "Pegawai tidak tersedia"; }
