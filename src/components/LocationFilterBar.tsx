"use client";

import { ChevronDownIcon, MapPinIcon } from "lucide-react";

import { LOCATION_FILTER_ALL } from "@/lib/location-filter";
import type { LocationFilterOption } from "@/lib/location-filter";

import { cn } from "@/lib/utils";

type LocationFilterBarProps = {
  value: string;
  onChange: (next: string) => void;
  options: LocationFilterOption[];
  disabled?: boolean;
  className?: string;
};

function selectClassName(disabled: boolean | undefined) {
  return cn(
    "h-14 min-h-[3rem] w-full cursor-pointer appearance-none rounded-2xl border border-border bg-background px-4 pr-11 text-base font-medium text-foreground shadow-inner touch-manipulation",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    disabled
  );
}

const chevronBg =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/** Plan-by-site: narrow the queue to one `location` value, or all. */
export function LocationFilterBar({
  value,
  onChange,
  options,
  disabled,
  className,
}: LocationFilterBarProps) {
  if (value !== LOCATION_FILTER_ALL) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-card/80 p-4 max-[361px]:p-3 shadow-md shadow-black/20 backdrop-blur-sm",
          className
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <MapPinIcon className="size-4" aria-hidden strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Filter by location
            </p>
            <p className="text-sm text-muted-foreground">
              Same value as the Location column — switch site or return to all.
            </p>
          </div>
        </div>

        <label htmlFor="inventory-location-filter" className="sr-only">
          Filter queue by location
        </label>
        <select
          id="inventory-location-filter"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={selectClassName(disabled)}
          style={{
            backgroundImage: chevronBg,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.875rem center",
            backgroundSize: "1.25rem",
          }}
        >
          <option value={LOCATION_FILTER_ALL}>All locations</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {" — "}
              {opt.count === 0
                ? "no pending (history only)"
                : `${opt.count} pending`}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-4 max-[361px]:p-3 shadow-md shadow-black/20 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <MapPinIcon className="size-4" aria-hidden strokeWidth={2.25} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Filter by location
          </p>
          <p className="text-sm text-muted-foreground">
            All sites are shown. Use <span className="font-medium text-foreground">Look up</span> to
            find a row by serial or asset ID, or pick one site below to focus the queue.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-3.5 py-3 ring-1 ring-emerald-500/15">
        <p className="text-sm font-semibold text-emerald-50">All locations</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-200/85">
          {options.length === 0
            ? "No distinct location values in this file yet."
            : `${options.length} distinct ${options.length === 1 ? "place" : "places"} in the roster — optional filter only.`}
        </p>
      </div>

      {options.length > 0 ? (
        <details className="group mt-3">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl border border-border bg-background/90 px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-inner touch-manipulation",
              "marker:content-none [&::-webkit-details-marker]:hidden",
              "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <span>Choose a site to filter</span>
            <ChevronDownIcon
              className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-2 max-h-[min(50vh,16rem)] overflow-y-auto overscroll-y-contain rounded-2xl border border-border bg-card/95 py-1 shadow-inner ring-1 ring-white/[0.04]">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.value)}
                className="flex w-full touch-manipulation flex-col items-start gap-0.5 border-b border-border/60 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/50 active:bg-muted/70"
              >
                <span className="font-medium text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground">
                  {opt.count === 0
                    ? "No pending (history only)"
                    : `${opt.count} pending`}
                </span>
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
