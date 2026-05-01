"use client";

import { MapPinIcon } from "lucide-react";

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

/** Plan-by-site: narrow the queue to one `location` value, or all. */
export function LocationFilterBar({
  value,
  onChange,
  options,
  disabled,
  className,
}: LocationFilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-4 shadow-md shadow-black/20 backdrop-blur-sm",
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
            Same value as the Location column — finish one site before moving on.
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
        className={cn(
          "h-14 w-full cursor-pointer appearance-none rounded-2xl border border-border bg-background px-4 pr-11 text-base font-medium text-foreground shadow-inner",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        style={{
          backgroundImage:
            `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
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
