import type { SupabaseClient } from "@supabase/supabase-js";

export type RoomMapping = {
  location: string;
  department_code: string;
  created_at: string;
};

export type RoomSummary = {
  location: string;
  deviceCount: number;
};

const PAGE_SIZE = 1000;

export async function fetchRoomMappings(sb: SupabaseClient): Promise<RoomMapping[]> {
  const { data, error } = await sb
    .from("room_department_map")
    .select("location, department_code, created_at")
    .order("location", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomMapping[];
}

/** Every room that has inventory, with device counts. */
export async function fetchRoomSummaries(sb: SupabaseClient): Promise<RoomSummary[]> {
  const counts = new Map<string, number>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from("inventory_items")
      .select("location")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data ?? [];
    for (const row of batch) {
      const loc = typeof row.location === "string" ? row.location.trim() : "";
      if (loc) counts.set(loc, (counts.get(loc) ?? 0) + 1);
    }
    if (batch.length < PAGE_SIZE) break;
  }
  return [...counts.entries()]
    .map(([location, deviceCount]) => ({ location, deviceCount }))
    .sort((a, b) => a.location.localeCompare(b.location, undefined, { numeric: true }));
}

/** Matches the database's `location_key` (spaces removed, upper case). */
export function roomKey(location: string): string {
  return location.replace(/\s+/g, "").toUpperCase();
}
