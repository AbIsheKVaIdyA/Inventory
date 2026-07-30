import { normalizeKey } from "@/lib/fuzzy-text";
import { INVENTORY_STATUS_DISCOVERED_ON_SCAN } from "@/lib/inventory-map";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";

const CREATED_ROOMS_KEY = "inventory-created-rooms-v1";

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

function readLocalCreated(): CreatedRoomRecord[] {
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

function writeLocalCreated(list: CreatedRoomRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CREATED_ROOMS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function mergeCreatedLists(...lists: CreatedRoomRecord[][]): CreatedRoomRecord[] {
  const byKey = new Map<string, CreatedRoomRecord>();
  const epoch = new Date(0).toISOString();
  for (const list of lists) {
    for (const r of list) {
      const name = r.name.trim();
      if (!name) continue;
      const key = normalizeLocationKey(name);
      const at = r.at || epoch;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { name, at });
        continue;
      }
      // Keep earliest real creation time; prefer non-epoch dates
      let bestAt = prev.at;
      if (prev.at === epoch && at !== epoch) bestAt = at;
      else if (prev.at !== epoch && at !== epoch && at < prev.at) bestAt = at;
      byKey.set(key, { name: prev.name, at: bestAt });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.at.localeCompare(a.at) || a.name.localeCompare(b.name, undefined, { numeric: true })
  );
}

/**
 * Rooms that only contain manually added / inserted rows (no sheet import id)
 * — treated as created rooms for the historical list.
 */
export function createdRoomsInferredFromInventory(
  rows: {
    location?: string | null;
    sheet_row_id?: number | null;
    inventory_status?: string | null;
  }[]
): CreatedRoomRecord[] {
  type Acc = { hasSheet: boolean; hasManual: boolean; name: string };
  const byLoc = new Map<string, Acc>();

  for (const r of rows) {
    const name = r.location?.trim() ?? "";
    if (!name) continue;
    const key = normalizeLocationKey(name);
    const acc = byLoc.get(key) ?? { hasSheet: false, hasManual: false, name };
    const sheetId = r.sheet_row_id;
    const hasSheet = sheetId != null && !Number.isNaN(Number(sheetId));
    const isDiscovered = r.inventory_status === INVENTORY_STATUS_DISCOVERED_ON_SCAN;
    if (hasSheet) acc.hasSheet = true;
    else acc.hasManual = true;
    if (isDiscovered) acc.hasManual = true;
    byLoc.set(key, acc);
  }

  const out: CreatedRoomRecord[] = [];
  for (const acc of byLoc.values()) {
    // Pure new room: only manual/added rows, no imported sheet rows
    if (acc.hasManual && !acc.hasSheet) {
      out.push({ name: acc.name, at: new Date(0).toISOString() });
    }
  }
  return out;
}

async function fetchRemoteCreatedRooms(): Promise<CreatedRoomRecord[]> {
  if (!hasSupabaseConfig()) return [];
  try {
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("created_rooms")
      .select("location, created_at")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data
      .map((row) => {
        const name = typeof row.location === "string" ? row.location.trim() : "";
        const at =
          typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString();
        if (!name) return null;
        return { name, at };
      })
      .filter((r): r is CreatedRoomRecord => r != null);
  } catch {
    return [];
  }
}

async function upsertRemoteCreatedRoom(name: string, at: string, createdBy?: string) {
  if (!hasSupabaseConfig()) return;
  try {
    const sb = getSupabaseBrowserClient();
    await sb.from("created_rooms").upsert(
      {
        location: name,
        created_at: at,
        ...(createdBy ? { created_by: createdBy } : {}),
      },
      { onConflict: "location", ignoreDuplicates: true }
    );
  } catch {
    /* table may not exist yet */
  }
}

/** Remember a room name the operator introduced via Create room / add. */
export function recordCreatedRoom(name: string, createdBy?: string) {
  const n = name.trim();
  if (!n) return;
  const at = new Date().toISOString();
  const list = readLocalCreated().filter(
    (r) => normalizeLocationKey(r.name) !== normalizeLocationKey(n)
  );
  list.unshift({ name: n, at });
  writeLocalCreated(list);
  void upsertRemoteCreatedRoom(n, at, createdBy);
}

/** Local-only snapshot (sync). Prefer loadCreatedRooms for the full list. */
export function getCreatedRooms(): CreatedRoomRecord[] {
  return readLocalCreated();
}

/**
 * Full historical list: Supabase + localStorage + inferred from inventory.
 * Call this for the Newly created rooms UI.
 */
export async function loadCreatedRooms(
  inventoryRows: {
    location?: string | null;
    sheet_row_id?: number | null;
    inventory_status?: string | null;
  }[] = []
): Promise<CreatedRoomRecord[]> {
  const local = readLocalCreated();
  const remote = await fetchRemoteCreatedRooms();
  const inferred = createdRoomsInferredFromInventory(inventoryRows);
  const merged = mergeCreatedLists(remote, local, inferred);

  // Push any local/inferred names up to Supabase so history survives browsers
  for (const r of merged) {
    const onRemote = remote.some(
      (x) => normalizeLocationKey(x.name) === normalizeLocationKey(r.name)
    );
    if (!onRemote) {
      void upsertRemoteCreatedRoom(r.name, r.at);
    }
  }

  writeLocalCreated(merged);
  return merged;
}

export function clearCreatedRooms() {
  writeLocalCreated([]);
}
