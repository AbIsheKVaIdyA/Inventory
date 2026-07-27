"use client";

import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { getDailyAnomalies, type DailyAnomaly } from "@/lib/scan-activity";

import { cn } from "@/lib/utils";

type DailyAnomalySummaryProps = {
  /** Bump when activity is recorded so the panel refreshes. */
  refreshKey: number;
  className?: string;
};

export function DailyAnomalySummary({ refreshKey, className }: DailyAnomalySummaryProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const anomalies = useMemo(() => {
    void refreshKey;
    return getDailyAnomalies().filter((a) => !dismissed.includes(a.id));
  }, [refreshKey, dismissed]);

  if (anomalies.length === 0) return null;

  return (
    <section
      aria-label="Today’s scan notes"
      className={cn(
        "rounded-2xl border border-amber-500/30 bg-amber-950/25 px-3.5 py-3 shadow-inner ring-1 ring-amber-400/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-amber-200/90">
          Today’s notes
        </p>
        <button
          type="button"
          className="text-[0.65rem] font-medium text-amber-200/70 hover:text-amber-100"
          onClick={() => setDismissed(anomalies.map((a) => a.id))}
        >
          Dismiss
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {anomalies.map((a) => (
          <AnomalyRow key={a.id} anomaly={a} />
        ))}
      </ul>
    </section>
  );
}

function AnomalyRow({ anomaly }: { anomaly: DailyAnomaly }) {
  const warn = anomaly.severity === "warn";
  return (
    <li className="flex gap-2.5 rounded-xl border border-border/50 bg-card/40 px-3 py-2.5">
      {warn ? (
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
      ) : (
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-sky-300" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{anomaly.title}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{anomaly.detail}</p>
      </div>
    </li>
  );
}
