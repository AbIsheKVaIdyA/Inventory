import type { Asset } from "@/types/asset";

/** Value for filter state: show every row */
export const LOCATION_FILTER_ALL = "__all__";

/** Rows with empty or whitespace-only `location` */
export const LOCATION_FILTER_UNSET = "__unset__";

export function assetMatchesLocationFilter(asset: Asset, filter: string): boolean {
  if (filter === LOCATION_FILTER_ALL) return true;
  const loc = asset.location?.trim() ?? "";
  if (filter === LOCATION_FILTER_UNSET) return loc === "";
  return loc === filter;
}

export type LocationFilterOption = {
  value: string;
  label: string;
  /** Pending rows still at this location (0 when only scanned rows remain there). */
  count: number;
};

/**
 * Distinct locations across the roster so filtering still works after a site is fully scanned.
 * `count` = pending scans still there.
 */
export function buildLocationFilterOptions(allAssets: Asset[]): LocationFilterOption[] {
  const pendingByKey = new Map<string, number>();
  for (const a of allAssets) {
    if (a.status !== "pending") continue;
    const k = a.location?.trim() ?? "";
    pendingByKey.set(k, (pendingByKey.get(k) ?? 0) + 1);
  }

  const allKeys = new Set<string>();
  for (const a of allAssets) {
    allKeys.add(a.location?.trim() ?? "");
  }

  const sortedKeys = [...allKeys].sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b);
  });

  return sortedKeys.map((key) => ({
    value: key === "" ? LOCATION_FILTER_UNSET : key,
    label: key === "" ? "(No location set)" : key,
    count: pendingByKey.get(key) ?? 0,
  }));
}
