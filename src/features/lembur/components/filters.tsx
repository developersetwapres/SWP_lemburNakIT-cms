"use client";

import { useState, type FormEvent } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dayTypeValues, statusValues, type LemburFilterInput } from "../filters";
import type { LemburList } from "../api";

const fieldClass = "h-11 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
export function LemburFilters({ initial, options, disabled, onApply, onReset }: {
  initial: LemburFilterInput; options: LemburList["pegawaiOptions"]; disabled: boolean;
  onApply: (filters: LemburFilterInput) => void; onReset: () => void;
}) {
  const [values, setValues] = useState({
    bulan: initial.bulan ?? "", pegawai: initial.pegawai ?? "", status: statusValues.includes(initial.status as never) ? initial.status! : "complete",
    jenis_hari: dayTypeValues.includes(initial.jenis_hari as never) ? initial.jenis_hari! : "semua", search: initial.search ?? "",
  });
  const missingEmployee = values.pegawai && !options.some((item) => item.uuid === values.pegawai);
  function submit(event: FormEvent) { event.preventDefault(); onApply(values); }
  return <form onSubmit={submit} className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <label className="grid gap-2 text-sm font-medium">Bulan<input type="month" value={values.bulan} disabled={disabled} onChange={(event) => setValues({ ...values, bulan: event.target.value })} className={fieldClass} /></label>
      <label className="grid gap-2 text-sm font-medium">Pegawai<select value={values.pegawai} disabled={disabled} onChange={(event) => setValues({ ...values, pegawai: event.target.value })} className={fieldClass}><option value="">Semua pegawai</option>{missingEmployee && <option value={values.pegawai}>Pegawai terpilih</option>}{options.map((item) => <option key={item.uuid} value={item.uuid}>{item.name}{item.nip ? ` · ${item.nip}` : ""}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium">Status<select value={values.status} disabled={disabled} onChange={(event) => setValues({ ...values, status: event.target.value })} className={fieldClass}><option value="complete">Complete</option><option value="draft">Draft</option><option value="locked">Locked</option></select></label>
      <label className="grid gap-2 text-sm font-medium">Jenis hari<select value={values.jenis_hari} disabled={disabled} onChange={(event) => setValues({ ...values, jenis_hari: event.target.value })} className={fieldClass}><option value="semua">Semua</option><option value="kerja">Hari kerja</option><option value="libur">Hari libur</option></select></label>
      <label className="grid gap-2 text-sm font-medium">Cari kegiatan/lokasi<div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><input type="search" value={values.search} disabled={disabled} onChange={(event) => setValues({ ...values, search: event.target.value })} placeholder="Kegiatan atau lokasi" className={`${fieldClass} w-full pl-9`} /></div></label>
    </div>
    <div className="mt-4 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={onReset}><RotateCcw aria-hidden="true" /> Reset</Button><Button type="submit" className="min-h-11" disabled={disabled}>Terapkan filter</Button></div>
  </form>;
}
