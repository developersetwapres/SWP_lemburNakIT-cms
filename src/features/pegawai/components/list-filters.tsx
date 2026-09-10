"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function PegawaiListFilters({ initial, disabled, onApply, onReset }: {
  initial: { search?: string; status?: string }; disabled: boolean;
  onApply: (values: { search?: string; status?: string }) => void; onReset: () => void;
}) {
  const [search, setSearch] = useState(initial.search ?? "");
  const [status, setStatus] = useState(initial.status ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply({ search: search.trim() || undefined, status: status || undefined });
  };
  return <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
    <label className="grid gap-2 text-sm font-medium">Cari pegawai
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama, NIP, jabatan, atau kode biro" className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>
    <label className="grid gap-2 text-sm font-medium">Status
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Tidak aktif</option>
      </select>
    </label>
    <div className="flex gap-2"><Button type="submit" className="min-h-11 flex-1" disabled={disabled}>Terapkan</Button><Button type="button" variant="outline" className="min-h-11 flex-1" disabled={disabled} onClick={onReset}>Reset</Button></div>
  </form>;
}
