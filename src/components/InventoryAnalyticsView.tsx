"use client";

import type { ReactNode } from "react";
import { ArrowLeftIcon, BarChart3Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DailyAnomalySummary } from "@/components/DailyAnomalySummary";
import {
  buildInventoryAnalytics,
  type AnalyticsRange,
  type NamedCount,
} from "@/lib/inventory-analytics";
import type { InventoryItemRow } from "@/lib/inventory-map";

import { cn } from "@/lib/utils";

type InventoryAnalyticsViewProps = {
  inventoryRows: InventoryItemRow[];
  activityVersion?: number;
  onBack: () => void;
};

const RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "all", label: "14 days" },
];

export function InventoryAnalyticsView({
  inventoryRows,
  activityVersion = 0,
  onBack,
}: InventoryAnalyticsViewProps) {
  const [range, setRange] = useState<AnalyticsRange>("week");
  const stats = useMemo(
    () => buildInventoryAnalytics(inventoryRows, range),
    [inventoryRows, range]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 rounded-xl"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back to scanning
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BarChart3Icon className="size-5 shrink-0 text-cyan-300" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Scan analytics</h2>
            <p className="text-xs text-muted-foreground">
              Adds, rooms, and buildings · {stats.rangeLabel}
            </p>
          </div>
        </div>
      </div>

      <DailyAnomalySummary refreshKey={activityVersion} />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={cn(
              "h-9 rounded-xl border px-3 text-sm font-medium transition-colors",
              range === r.id
                ? "border-cyan-400/50 bg-cyan-950/50 text-cyan-50"
                : "border-border bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Scanned" value={stats.totals.scanned} tone="emerald" />
        <Kpi label="Not found" value={stats.totals.notFound} tone="violet" />
        <Kpi label="New adds" value={stats.totals.added} tone="cyan" />
        <Kpi label="Rooms touched" value={stats.totals.roomsTouched} tone="amber" />
        <Kpi label="Buildings" value={stats.totals.buildingsTouched} tone="sky" />
        <Kpi label="Still pending" value={stats.totals.pending} tone="muted" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="New systems added" subtitle="Discovered-on-scan per day">
          <VerticalBars data={stats.addsByDay} barClass="bg-cyan-500" />
        </ChartCard>
        <ChartCard title="Resolutions" subtitle="Scanned + not found per day">
          <VerticalBars data={stats.resolutionsByDay} barClass="bg-emerald-500" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Where (building)"
          subtitle="Prefixes taken from locations on file"
        >
          {stats.byBuilding.length === 0 ? (
            <EmptyChart />
          ) : (
            <HorizontalBars data={stats.byBuilding} barClass="bg-teal-500" />
          )}
        </ChartCard>
        <ChartCard title="Top rooms" subtitle="Most activity in this range">
          {stats.topRooms.length === 0 ? (
            <EmptyChart />
          ) : (
            <HorizontalBars data={stats.topRooms} barClass="bg-primary" />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Rooms with new systems"
        subtitle="Locations that received at least one add"
      >
        {stats.roomsWithAdds.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No newly added systems in this range.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {stats.roomsWithAdds.map((r) => (
              <li
                key={r.label}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate font-medium text-foreground">{r.label}</span>
                <span className="shrink-0 tabular-nums text-cyan-300">
                  {r.value} add{r.value === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "violet" | "cyan" | "amber" | "sky" | "muted";
}) {
  const toneClass = {
    emerald: "text-emerald-400",
    violet: "text-violet-300",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    muted: "text-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card/70 px-3 py-3 text-center shadow-sm">
      <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", toneClass)}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-md shadow-black/15">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart() {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">No data in this range yet.</p>
  );
}

function VerticalBars({ data, barClass }: { data: NamedCount[]; barClass: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const dense = data.length > 8;
  return (
    <div
      className={cn(
        "flex h-44 items-end gap-1.5 sm:gap-2",
        dense && "overflow-x-auto pb-1"
      )}
    >
      {data.map((d) => (
        <div
          key={d.label}
          className={cn(
            "flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1",
            dense && "min-w-[2.25rem] flex-none"
          )}
          title={`${d.label}: ${d.value}`}
        >
          <span className="text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
            {d.value > 0 ? d.value : ""}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className={cn("w-full rounded-t-md transition-[height]", barClass)}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2)}%` }}
            />
          </div>
          <span className="w-full truncate text-center text-[0.55rem] leading-tight text-muted-foreground sm:text-[0.6rem]">
            {dense ? d.label.replace(/,.*/, "").slice(0, 6) : d.label.split(",")[0]}
          </span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ data, barClass }: { data: NamedCount[]; barClass: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,10rem)_1fr_auto]">
          <span className="truncate text-xs font-medium text-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", barClass)}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-semibold tabular-nums text-muted-foreground">
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
