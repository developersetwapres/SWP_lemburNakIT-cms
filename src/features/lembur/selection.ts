import { numericLemburId, type LemburRow } from "./api";

export function eligibleLemburRows(rows: LemburRow[]) {
  return rows.filter((row) => row.can_lock);
}

export function selectedLemburRows(rows: LemburRow[], selectedIds: ReadonlySet<string>) {
  return eligibleLemburRows(rows).filter((row) => selectedIds.has(row.id));
}

export function toggleLemburSelection(selectedIds: ReadonlySet<string>, row: LemburRow) {
  if (!row.can_lock) return new Set(selectedIds);
  const next = new Set(selectedIds);
  if (next.has(row.id)) next.delete(row.id);
  else next.add(row.id);
  return next;
}

export function toggleAllEligibleLemburs(rows: LemburRow[], selectedIds: ReadonlySet<string>) {
  const eligible = eligibleLemburRows(rows);
  const allSelected = eligible.length > 0 && eligible.every((row) => selectedIds.has(row.id));
  return allSelected ? new Set<string>() : new Set(eligible.map((row) => row.id));
}

export function clearLemburSelection() {
  return new Set<string>();
}

export function selectedNumericIds(rows: LemburRow[], selectedIds: ReadonlySet<string>) {
  return selectedLemburRows(rows, selectedIds).map((row) => numericLemburId(row.id));
}

export function lemburSelectionScope(rows: LemburRow[], requestKey: string) {
  return JSON.stringify([requestKey, rows.map((row) => [row.id, row.uuid, row.can_lock])]);
}
