"use client";

import { ChevronDownIcon, MapPinIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

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
    "h-14 min-h-[3.25rem] w-full cursor-pointer appearance-none rounded-2xl border border-border bg-background px-4 pr-11 text-base font-medium text-foreground shadow-inner touch-manipulation",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    disabled
  );
}

const chevronBg =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/** Pick one room/site to work in — mobile-first, search for long lists. */
export function LocationFilterBar({
  value,
  onChange,
  options,
  disabled,
  className,
}: LocationFilterBarProps) {
  const [siteQuery, setSiteQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const q = siteQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, siteQuery]);

  const selected = options.find((o) => o.value === value);

  if (value !== LOCATION_FILTER_ALL) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-primary/30 bg-card/90 p-3.5 shadow-md shadow-black/20 backdrop-blur-sm sm:p-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <MapPinIcon className="size-5" aria-hidden strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
              Working in
            </p>
            <p className="mt-0.5 truncate text-base font-semibold text-foreground">
              {selected?.label ?? value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selected
                ? selected.count === 0
                  ? "No pending here"
                  : `${selected.count} left to scan here`
                : "Custom room"}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(LOCATION_FILTER_ALL)}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground touch-manipulation hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Leave this room — show home overview"
          >
            <XIcon className="size-5" aria-hidden />
          </button>
        </div>

        <label htmlFor="inventory-location-filter" className="mt-3 block text-xs font-semibold text-muted-foreground">
          Switch room
        </label>
        <select
          id="inventory-location-filter"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(selectClassName(disabled), "mt-1.5")}
          style={{
            backgroundImage: chevronBg,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.875rem center",
            backgroundSize: "1.25rem",
          }}
        >
          <option value={LOCATION_FILTER_ALL}>← Home (all rooms)</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.count === 0 ? "" : ` (${opt.count})`}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-3.5 shadow-md shadow-black/20 backdrop-blur-sm sm:p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <MapPinIcon className="size-5" aria-hidden strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Start here
          </p>
          <p className="mt-0.5 text-base font-semibold text-foreground">Pick a room</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Choose one room to see its device list. Or use Look up to find one device by tag or
            serial.
          </p>
        </div>
      </div>

      {options.length > 0 ? (
        <details className="group mt-3">
          <summary
            className={cn(
              "flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl border border-primary/35 bg-primary/10 px-4 py-3.5 text-left text-base font-semibold text-foreground touch-manipulation",
              "marker:content-none [&::-webkit-details-marker]:hidden",
              "active:bg-primary/15 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <span>Tap to choose room</span>
            <ChevronDownIcon
              className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-inner">
            <div className="border-b border-border/80 p-2">
              <label className="relative block">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  disabled={disabled}
                  value={siteQuery}
                  onChange={(e) => setSiteQuery(e.target.value)}
                  placeholder="Search room name…"
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
            </div>
            <div className="max-h-[min(55vh,18rem)] overflow-y-auto overscroll-y-contain py-1">
              {filteredOptions.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-muted-foreground">
                  No rooms match that search.
                </p>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setSiteQuery("");
                    }}
                    className="flex min-h-14 w-full touch-manipulation flex-col items-start justify-center gap-0.5 border-b border-border/50 px-4 py-3 text-left last:border-b-0 active:bg-muted/60"
                  >
                    <span className="text-base font-medium text-foreground">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {opt.count === 0
                        ? "Nothing pending"
                        : `${opt.count} to scan`}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </details>
      ) : (
        <p className="mt-3 rounded-xl bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          No rooms in the file yet. Use Room to create one, or Add new with a location.
        </p>
      )}
    </div>
  );
}
