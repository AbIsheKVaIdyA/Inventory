import { normalizeKey } from "@/lib/fuzzy-text";

/** Compare locations ignoring case / extra spaces. */
export function normalizeLocationKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * If `candidate` already exists in the roster, return the canonical
 * spelling from the file; otherwise null.
 */
export function findMatchingLocation(
  candidate: string,
  existingLocations: string[]
): string | null {
  const raw = candidate.trim();
  if (!raw) return null;
  const key = normalizeLocationKey(raw);
  const compact = normalizeKey(raw);

  for (const loc of existingLocations) {
    const t = loc.trim();
    if (!t) continue;
    if (normalizeLocationKey(t) === key) return t;
  }
  if (compact.length >= 2) {
    for (const loc of existingLocations) {
      const t = loc.trim();
      if (!t) continue;
      if (normalizeKey(t) === compact) return t;
    }
  }
  return null;
}

/** Prefill chips for Create room — ECS campus buildings. */
export function buildingChipsFromLocations(_locations?: string[]): string[] {
  void _locations;
  return ["ECS", "ECSN", "ECSW"];
}

export function distinctLocationsFromRows(
  rows: { location?: string | null }[]
): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const t = r.location?.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
