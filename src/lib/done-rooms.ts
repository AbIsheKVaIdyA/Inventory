import { normalizeLocationKey } from "@/lib/location-rooms";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";

const DONE_ROOMS_KEY = "inventory-done-rooms-v1";

export type DoneRoomRecord = {
  name: string;
  at: string;
};

function readLocal(): DoneRoomRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DONE_ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DoneRoomRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r) => r && typeof r.name === "string" && typeof r.at === "string" && r.name.trim()
    );
  } catch {
    return [];
  }
}

function writeLocal(list: DoneRoomRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DONE_ROOMS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function mergeLists(...lists: DoneRoomRecord[][]): DoneRoomRecord[] {
  const byKey = new Map<string, DoneRoomRecord>();
  for (const list of lists) {
    for (const r of list) {
      const name = r.name.trim();
      if (!name) continue;
      const key = normalizeLocationKey(name);
      const at = r.at || new Date(0).toISOString();
      const prev = byKey.get(key);
      if (!prev || at > prev.at) {
        byKey.set(key, { name: prev?.name ?? name, at });
      } else if (prev) {
        byKey.set(key, prev);
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.at.localeCompare(a.at) || a.name.localeCompare(b.name, undefined, { numeric: true })
  );
}

async function fetchRemote(): Promise<DoneRoomRecord[]> {
  if (!hasSupabaseConfig()) return [];
  try {
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("done_rooms")
      .select("location, marked_at")
      .order("marked_at", { ascending: false });
    if (error || !data) return [];
    return data
      .map((row) => {
        const name = typeof row.location === "string" ? row.location.trim() : "";
        const at =
          typeof row.marked_at === "string" ? row.marked_at : new Date(0).toISOString();
        if (!name) return null;
        return { name, at };
      })
      .filter((r): r is DoneRoomRecord => r != null);
  } catch {
    return [];
  }
}

async function upsertRemote(name: string, at: string, markedBy?: string) {
  if (!hasSupabaseConfig()) return;
  try {
    const sb = getSupabaseBrowserClient();
    await sb.from("done_rooms").upsert(
      {
        location: name,
        marked_at: at,
        ...(markedBy ? { marked_by: markedBy } : {}),
      },
      { onConflict: "location", ignoreDuplicates: false }
    );
  } catch {
    /* table may not exist yet */
  }
}

async function deleteRemote(name: string) {
  if (!hasSupabaseConfig()) return;
  try {
    const sb = getSupabaseBrowserClient();
    await sb.from("done_rooms").delete().eq("location", name);
  } catch {
    /* ignore */
  }
}

/** Full done-rooms list (Supabase + local). */
export async function loadDoneRooms(): Promise<DoneRoomRecord[]> {
  const local = readLocal();
  const remote = await fetchRemote();
  const merged = mergeLists(remote, local);
  writeLocal(merged);
  return merged;
}

export function getDoneRoomsSync(): DoneRoomRecord[] {
  return readLocal();
}

export function isLocationDone(location: string, done: DoneRoomRecord[]): boolean {
  const key = normalizeLocationKey(location);
  if (!key) return false;
  return done.some((r) => normalizeLocationKey(r.name) === key);
}

/** Mark a room complete — hides it from Pick a room. */
export function markRoomDone(location: string, markedBy?: string) {
  const n = location.trim();
  if (!n) return;
  const at = new Date().toISOString();
  const list = readLocal().filter((r) => normalizeLocationKey(r.name) !== normalizeLocationKey(n));
  list.unshift({ name: n, at });
  writeLocal(list);
  void upsertRemote(n, at, markedBy);
}

/** Put a room back on the Pick a room list. */
export function unmarkRoomDone(location: string) {
  const n = location.trim();
  if (!n) return;
  writeLocal(readLocal().filter((r) => normalizeLocationKey(r.name) !== normalizeLocationKey(n)));
  void deleteRemote(n);
}
