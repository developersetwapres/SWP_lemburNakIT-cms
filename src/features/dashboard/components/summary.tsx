import { BriefcaseBusiness, CalendarDays, Banknote, Umbrella } from "lucide-react";
import type { DashboardSummary } from "../api";

export const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const formatCount = (value: number) => value.toLocaleString("id-ID");
export function periodLabel(bulan: string) { return `${monthNames[Number(bulan.slice(5)) - 1]} ${bulan.slice(0, 4)}`; }

export function DashboardSummaryContent({ summary }: { summary: DashboardSummary }) {
  return <>
    {summary.total_lembur === 0 && summary.total_upah === 0 && summary.hari_kerja === 0 && summary.hari_libur === 0 && <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">Belum ada lembur complete pada periode {periodLabel(summary.bulan)}.</p>}
    <StatisticCards summary={summary} />
    <MonthlyChart summary={summary} />
  </>;
}

export function StatisticCards({ summary }: { summary: DashboardSummary }) {
  const metrics = [
    { label: "Total lembur", value: formatCount(summary.total_lembur), detail: "Record complete", icon: BriefcaseBusiness },
    { label: "Total upah", value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(summary.total_upah), detail: "Upah record complete", icon: Banknote },
    { label: "Hari kerja", value: formatCount(summary.hari_kerja), detail: "Record pada hari kerja", icon: CalendarDays },
    { label: "Hari libur", value: formatCount(summary.hari_libur), detail: "Record pada akhir pekan", icon: Umbrella },
  ];
  return <section aria-label={`Statistik ${periodLabel(summary.bulan)}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {metrics.map(({ label, value, detail, icon: Icon }) => <article key={label} className="min-w-0 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3"><h2 className="text-sm text-muted-foreground">{label}</h2><Icon aria-hidden="true" className="size-4 text-muted-foreground" /></div>
      <p className="mt-4 break-words text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>)}
  </section>;
}

export function MonthlyChart({ summary }: { summary: DashboardSummary }) {
  const maximum = Math.max(1, ...summary.chart.map((item) => item.total));
  const empty = summary.chart.every((item) => item.total === 0);
  return <section aria-labelledby="monthly-title" className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
    <h2 id="monthly-title" className="font-semibold">Tren lembur bulanan</h2>
    <p className="mt-1 text-sm text-muted-foreground">Jumlah record complete · Tahun {summary.bulan.slice(0, 4)}</p>
    {empty && <p role="status" className="mt-4 text-sm text-muted-foreground">Belum ada lembur complete pada tahun ini. Seluruh bulan bernilai 0.</p>}
    <div role="region" aria-label="Grafik Januari sampai Desember, dapat digeser horizontal pada layar kecil" tabIndex={0} className="relative mt-6 overflow-x-auto rounded focus-visible:outline-2 focus-visible:outline-ring">
      <ol className="grid min-w-[600px] grid-cols-12 gap-3 pt-4">
        {summary.chart.map(({ month, total }) => <li key={month} title={`${monthNames[month - 1]}: ${formatCount(total)} record`} className="min-w-0 text-center">
          <div aria-hidden="true" className="flex h-48 items-end border-b border-border">
            <div className="mx-auto w-full max-w-10 rounded-t bg-chart-3" style={{ height: `${total / maximum * 100}%` }} />
          </div>
          <span className="mt-3 block text-xs text-muted-foreground"><span aria-hidden="true">{monthNames[month - 1].slice(0, 3)}</span><span className="sr-only">{monthNames[month - 1]}</span></span>
          <span className="mt-1 block break-words text-xs font-medium tabular-nums">{formatCount(total)}</span>
        </li>)}
      </ol>
    </div>
  </section>;
}
