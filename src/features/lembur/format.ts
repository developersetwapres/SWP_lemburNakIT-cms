export const statusLabels: Record<string, string> = { complete: "Complete", draft: "Draft", locked: "Locked" };
export const dayTypeLabels: Record<string, string> = { hari_kerja: "Hari kerja", hari_libur: "Hari libur" };

export function formatLemburDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

export function employeeName(employee: { name: string } | null) { return employee?.name || "Pegawai tidak tersedia"; }
