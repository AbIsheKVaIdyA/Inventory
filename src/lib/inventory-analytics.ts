import {
  INVENTORY_STATUS_DISCOVERED_ON_SCAN,
  type InventoryItemRow,
} from "@/lib/inventory-map";

export type AnalyticsRange = "day" | "week" | "all";

export type NamedCount = {
  label: string;
  value: number;
};

export type InventoryAnalytics = {
  range: AnalyticsRange;
  rangeLabel: string;
  totals: {
    scanned: number;
    notFound: number;
    added: number;
    pending: number;
    roomsTouched: number;
    buildingsTouched: number;
  };
  /** New systems (discovered on scan) per day in range */
  addsByDay: NamedCount[];
  /** Scans + not_found resolutions per day */
  resolutionsByDay: NamedCount[];
  /** Building / site prefix (ECSS, ECSN, ECSW, …) */
  byBuilding: NamedCount[];
  /** Top rooms by activity in range */
  topRooms: NamedCount[];
  /** Rooms that received at least one new add in range */
  roomsWithAdds: NamedCount[];
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function inRange(iso: string | null | undefined, from: Date | null, to: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < from.getTime()) return false;
  return t < to.getTime();
}

/**
 * Building / wing prefix from a location string.
 * ECS and ECSS both map to ECS (this inventory uses ECS).
 * Keeps ECSW / ECSN / ECSE distinct when present.
 */
export function buildingFromLocation(location: string | null | undefined): string {
  const raw = location?.trim() ?? "";
  if (!raw) return "Unset";
  const wing = raw.match(/^(ECSW|ECSN|ECSE)\b/i);
  if (wing) return wing[1]!.toUpperCase();
  if (/^ECSS?\b/i.test(raw)) return "ECS";
  const token = raw.split(/[\s\-_/]+/)[0]?.trim() ?? "";
  if (!token) return "Other";
  if (token.length <= 8 && /^[A-Za-z0-9]+$/.test(token)) return token.toUpperCase();
  return "Other";
}

function bump(map: Map<string, number>, key: string, n = 1) {
  map.set(key, (map.get(key) ?? 0) + n);
}

function toSortedCounts(map: Map<string, number>, limit?: number): NamedCount[] {
  const list = [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return limit ? list.slice(0, limit) : list;
}

function rangeBounds(range: AnalyticsRange, now = new Date()): {
  from: Date | null;
  to: Date;
  label: string;
  dayKeys: string[];
} {
  const todayStart = startOfLocalDay(now);
  const to = addDays(todayStart, 1);

  if (range === "day") {
    return {
      from: todayStart,
      to,
      label: "Today",
      dayKeys: [dayKey(todayStart)],
    };
  }

  if (range === "week") {
    const from = addDays(todayStart, -6);
    const dayKeys: string[] = [];
    for (let i = 0; i < 7; i++) dayKeys.push(dayKey(addDays(from, i)));
    return { from, to, label: "Last 7 days", dayKeys };
  }

  // all — last 14 days for charts (still useful), totals use all resolved timestamps
  const from = addDays(todayStart, -13);
  const dayKeys: string[] = [];
  for (let i = 0; i < 14; i++) dayKeys.push(dayKey(addDays(from, i)));
  return { from, to, label: "Last 14 days", dayKeys };
}

export function buildInventoryAnalytics(
  rows: InventoryItemRow[],
  range: AnalyticsRange,
  now = new Date()
): InventoryAnalytics {
  const { from, to, label, dayKeys } = rangeBounds(range, now);

  const addsByDay = new Map<string, number>();
  const resolutionsByDay = new Map<string, number>();
  const byBuilding = new Map<string, number>();
  const roomActivity = new Map<string, number>();
  const roomsWithAdds = new Map<string, number>();

  for (const key of dayKeys) {
    addsByDay.set(key, 0);
    resolutionsByDay.set(key, 0);
  }

  let scanned = 0;
  let notFound = 0;
  let added = 0;
  let pending = 0;

  for (const row of rows) {
    if (row.scan_status === "pending") {
      pending += 1;
      continue;
    }

    const at = row.scanned_at;
    if (!inRange(at, from, to)) continue;

    const loc = row.location?.trim() || "(No location)";
    const building = buildingFromLocation(row.location);
    const dk = dayKey(startOfLocalDay(new Date(at!)));

    if (row.inventory_status === INVENTORY_STATUS_DISCOVERED_ON_SCAN) {
      added += 1;
      bump(addsByDay, dk);
      bump(roomsWithAdds, loc);
      bump(byBuilding, building);
      bump(roomActivity, loc);
      continue;
    }

    if (row.scan_status === "scanned") {
      scanned += 1;
      bump(resolutionsByDay, dk);
      bump(byBuilding, building);
      bump(roomActivity, loc);
    } else if (row.scan_status === "not_found") {
      notFound += 1;
      bump(resolutionsByDay, dk);
      bump(byBuilding, building);
      bump(roomActivity, loc);
    }
  }

  return {
    range,
    rangeLabel: label,
    totals: {
      scanned,
      notFound,
      added,
      pending,
      roomsTouched: roomActivity.size,
      buildingsTouched: [...byBuilding.keys()].filter((k) => k !== "Unset").length,
    },
    addsByDay: dayKeys.map((k) => ({ label: dayLabel(k), value: addsByDay.get(k) ?? 0 })),
    resolutionsByDay: dayKeys.map((k) => ({
      label: dayLabel(k),
      value: resolutionsByDay.get(k) ?? 0,
    })),
    byBuilding: toSortedCounts(byBuilding),
    topRooms: toSortedCounts(roomActivity, 8),
    roomsWithAdds: toSortedCounts(roomsWithAdds, 8),
  };
}
