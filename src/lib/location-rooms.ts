import { normalizeKey } from "@/lib/fuzzy-text";

const CREATED_ROOMS_KEY = "inventory-created-rooms-v1";
const MAX_CREATED = 80;

export type CreatedRoomRecord = {
  name: string;
  at: string;
};

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

/** Room-create chips: this inventory uses ECS only (never ECSS). */
export function buildingChipsFromLocations(_locations?: string[]): string[] {
  void _locations;
  return ["ECS"];
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

function readCreated(): CreatedRoomRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CREATED_ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CreatedRoomRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r) => r && typeof r.name === "string" && typeof r.at === "string" && r.name.trim()
    );
  } catch {
    return [];
  }
}

function writeCreated(list: CreatedRoomRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CREATED_ROOMS_KEY, JSON.stringify(list.slice(0, MAX_CREATED)));
  } catch {
    /* ignore */
  }
}

/** Remember a room name the operator introduced via Create room. */
export function recordCreatedRoom(name: string) {
  const n = name.trim();
  if (!n) return;
  const list = readCreated().filter(
    (r) => normalizeLocationKey(r.name) !== normalizeLocationKey(n)
  );
  list.unshift({ name: n, at: new Date().toISOString() });
  writeCreated(list);
}

export function getCreatedRooms(): CreatedRoomRecord[] {
  return readCreated();
}

export function clearCreatedRooms() {
  writeCreated([]);
}
