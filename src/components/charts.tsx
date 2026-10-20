import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChartTone =
  | "emerald"
  | "amber"
  | "red"
  | "cyan"
  | "violet"
  | "sky"
  | "teal"
  | "pink"
  | "orange"
  | "slate";

/** Literal class names so Tailwind keeps them. */
const TONES: Record<ChartTone, { stroke: string; bg: string; text: string }> = {
  emerald: { stroke: "stroke-emerald-500", bg: "bg-emerald-500", text: "text-emerald-300" },
  amber: { stroke: "stroke-amber-500", bg: "bg-amber-500", text: "text-amber-300" },
  red: { stroke: "stroke-red-500", bg: "bg-red-500", text: "text-red-300" },
  cyan: { stroke: "stroke-cyan-500", bg: "bg-cyan-500", text: "text-cyan-300" },
  violet: { stroke: "stroke-violet-500", bg: "bg-violet-500", text: "text-violet-300" },
  sky: { stroke: "stroke-sky-500", bg: "bg-sky-500", text: "text-sky-300" },
  teal: { stroke: "stroke-teal-500", bg: "bg-teal-500", text: "text-teal-300" },
  pink: { stroke: "stroke-pink-500", bg: "bg-pink-500", text: "text-pink-300" },
  orange: { stroke: "stroke-orange-500", bg: "bg-orange-500", text: "text-orange-300" },
  slate: { stroke: "stroke-slate-500", bg: "bg-slate-500", text: "text-slate-300" },
};

/** Cycled for categories without a fixed meaning (departments, brands, roles). */
export const CATEGORY_TONES: ChartTone[] = [
  "cyan",
  "violet",
  "emerald",
  "amber",
  "pink",
  "sky",
  "orange",
  "teal",
  "red",
  "slate",
];

export type ChartDatum = {
  label: string;
  value: number;
  tone?: ChartTone;
};

function toneAt(d: ChartDatum, i: number): ChartTone {
  return d.tone ?? CATEGORY_TONES[i % CATEGORY_TONES.length];
}

function pct(value: number, total: number): string {
  if (total <= 0) return "0%";
  const p = (value / total) * 100;
  return `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)}%`;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/60 p-4 shadow-md shadow-black/15",
        className
      )}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyChart({ message = "No data yet." }: { message?: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

export function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: ChartTone;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 px-3 py-3 text-center shadow-sm">
      <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone ? TONES[tone].text : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Pie-style donut with a legend (value + share per slice). */
export function DonutChart({
  data,
  centerLabel,
  emptyMessage,
}: {
  data: ChartDatum[];
  centerLabel?: string;
  emptyMessage?: string;
}) {
  const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0);
  if (total === 0) return <EmptyChart message={emptyMessage} />;

  const r = 40;
  const circumference = 2 * Math.PI * r;
  const segments = data.reduce<{ d: ChartDatum; i: number; len: number; offset: number }[]>(
    (acc, d, i) => {
      if (d.value <= 0) return acc;
      const prev = acc[acc.length - 1];
      const offset = prev ? prev.offset + prev.len : 0;
      return [...acc, { d, i, len: (d.value / total) * circumference, offset }];
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" className="stroke-muted" strokeWidth="13" />
          {segments.map(({ d, i, len, offset }) => (
            <circle
              key={d.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              strokeWidth="13"
              className={TONES[toneAt(d, i)].stroke}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
            >
              <title>{`${d.label}: ${d.value} (${pct(d.value, total)})`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {total.toLocaleString()}
          </span>
          {centerLabel ? (
            <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {centerLabel}
            </span>
          ) : null}
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className={cn("size-2.5 shrink-0 rounded-full", TONES[toneAt(d, i)].bg)} />
            <span className="min-w-0 flex-1 truncate text-foreground" title={d.label}>
              {d.label}
            </span>
            <span className="tabular-nums font-semibold text-foreground">{d.value.toLocaleString()}</span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">
              {pct(d.value, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VerticalBars({ data, tone = "cyan" }: { data: ChartDatum[]; tone?: ChartTone }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const dense = data.length > 8;
  return (
    <div className={cn("flex h-44 items-end gap-1.5 sm:gap-2", dense && "overflow-x-auto pb-1")}>
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
              className={cn("w-full rounded-t-md transition-[height]", TONES[d.tone ?? tone].bg)}
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

export function HorizontalBars({
  data,
  tone = "teal",
  emptyMessage,
}: {
  data: ChartDatum[];
  tone?: ChartTone;
  emptyMessage?: string;
}) {
  if (data.length === 0) return <EmptyChart message={emptyMessage} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li
          key={d.label}
          className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,10rem)_1fr_auto]"
        >
          <span className="truncate text-xs font-medium text-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", TONES[d.tone ?? tone].bg)}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-semibold tabular-nums text-muted-foreground">
            {d.value.toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type ProgressRow = {
  label: string;
  done: number;
  total: number;
};

/** "x of y done" bars, e.g. scanned devices per building. */
export function ProgressBars({
  rows,
  tone = "emerald",
  emptyMessage,
}: {
  rows: ProgressRow[];
  tone?: ChartTone;
  emptyMessage?: string;
}) {
  if (rows.length === 0) return <EmptyChart message={emptyMessage} />;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate font-medium text-foreground" title={r.label}>
              {r.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{r.done.toLocaleString()}</span> /{" "}
              {r.total.toLocaleString()} · {pct(r.done, r.total)}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", TONES[tone].bg)}
              style={{ width: `${r.total > 0 ? (r.done / r.total) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Count values by key, sorted high → low; extra keys beyond `limit` fold into "Other". */
export function countBy<T>(
  items: T[],
  keyOf: (item: T) => string,
  limit?: number
): ChartDatum[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyOf(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const sorted = [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  if (!limit || sorted.length <= limit) return sorted;
  const rest = sorted.slice(limit).reduce((sum, d) => sum + d.value, 0);
  return [...sorted.slice(0, limit), { label: "Other", value: rest, tone: "slate" }];
}

/** Last `days` calendar days (oldest first) with counts of timestamps per day. */
export function countPerDay(timestamps: (string | null | undefined)[], days: number): ChartDatum[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const keys: string[] = [];
  const counts = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toDateString();
    keys.push(k);
    counts.set(k, 0);
  }
  for (const iso of timestamps) {
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    const k = d.toDateString();
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((k) => ({
    label: new Date(k).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    value: counts.get(k) ?? 0,
  }));
}
