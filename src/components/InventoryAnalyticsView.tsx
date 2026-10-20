"use client";

import { ArrowLeftIcon, BarChart3Icon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ChartCard,
  DonutChart,
  EmptyChart,
  HorizontalBars,
  Kpi,
  ProgressBars,
  VerticalBars,
  type ProgressRow,
} from "@/components/charts";
import { DailyAnomalySummary } from "@/components/DailyAnomalySummary";
import { Button } from "@/components/ui/button";
import {
  buildInventoryAnalytics,
  buildingFromLocation,
  type AnalyticsRange,
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

function overallProgress(rows: InventoryItemRow[]) {
  let scanned = 0;
  let notFound = 0;
  let pending = 0;
  const byBuilding = new Map<string, ProgressRow>();
  for (const row of rows) {
    if (row.scan_status === "scanned") scanned += 1;
    else if (row.scan_status === "not_found") notFound += 1;
    else pending += 1;
    const building = buildingFromLocation(row.location);
    const entry = byBuilding.get(building) ?? { label: building, done: 0, total: 0 };
    entry.total += 1;
    if (row.scan_status !== "pending") entry.done += 1;
    byBuilding.set(building, entry);
  }
  return {
    status: [
      { label: "Scanned", value: scanned, tone: "emerald" as const },
      { label: "Not found", value: notFound, tone: "red" as const },
      { label: "Still to scan", value: pending, tone: "amber" as const },
    ],
    buildings: [...byBuilding.values()].sort((a, b) => b.total - a.total),
  };
}

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
  const overall = useMemo(() => overallProgress(inventoryRows), [inventoryRows]);

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Overall progress" subtitle="Every device in the inventory">
          <DonutChart data={overall.status} centerLabel="devices" />
        </ChartCard>
        <ChartCard title="Progress by building" subtitle="Scanned or marked not found, out of total">
          <ProgressBars rows={overall.buildings} />
        </ChartCard>
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
        <Kpi label="Still pending" value={stats.totals.pending} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="New systems added" subtitle="Discovered-on-scan per day">
          <VerticalBars data={stats.addsByDay} tone="cyan" />
        </ChartCard>
        <ChartCard title="Resolutions" subtitle="Scanned + not found per day">
          <VerticalBars data={stats.resolutionsByDay} tone="emerald" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Where (building)" subtitle="Prefixes taken from locations on file">
          <HorizontalBars
            data={stats.byBuilding}
            tone="teal"
            emptyMessage="No data in this range yet."
          />
        </ChartCard>
        <ChartCard title="Top rooms" subtitle="Most activity in this range">
          <HorizontalBars
            data={stats.topRooms}
            tone="violet"
            emptyMessage="No data in this range yet."
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Rooms with new systems"
        subtitle="Locations that received at least one add"
      >
        {stats.roomsWithAdds.length === 0 ? (
          <EmptyChart message="No newly added systems in this range." />
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
