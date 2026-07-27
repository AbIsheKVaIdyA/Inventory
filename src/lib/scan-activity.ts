const STORAGE_KEY = "inventory-scan-activity-v1";
const MAX_EVENTS = 400;

export type ScanActivityType = "scan" | "add" | "not_found" | "relocate";

export type ScanActivityEvent = {
  type: ScanActivityType;
  at: string;
  location?: string | null;
  fromLocation?: string | null;
  count?: number;
};

export type DailyAnomaly = {
  id: string;
  severity: "info" | "warn";
  title: string;
  detail: string;
};

function readEvents(): ScanActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanActivityEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.type === "string" && typeof e.at === "string");
  } catch {
    return [];
  }
}

function writeEvents(events: ScanActivityEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* ignore */
  }
}

export function recordScanActivity(event: Omit<ScanActivityEvent, "at"> & { at?: string }) {
  const next: ScanActivityEvent = {
    ...event,
    at: event.at ?? new Date().toISOString(),
  };
  const events = readEvents();
  events.unshift(next);
  writeEvents(events);
}

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameLocalDay(iso: string, dayStart: Date): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const end = dayStart.getTime() + 24 * 60 * 60 * 1000;
  return t >= dayStart.getTime() && t < end;
}

function bump(map: Map<string, number>, key: string, n = 1) {
  const k = key.trim() || "(no location)";
  map.set(k, (map.get(k) ?? 0) + n);
}

/**
 * Daily anomalies from local activity (this browser) — no DB schema changes.
 */
export function getDailyAnomalies(now = new Date()): DailyAnomaly[] {
  const dayStart = startOfLocalDay(now);
  const today = readEvents().filter((e) => isSameLocalDay(e.at, dayStart));
  if (today.length === 0) return [];

  const anomalies: DailyAnomaly[] = [];
  const addsByLoc = new Map<string, number>();
  const scansByLoc = new Map<string, number>();
  let relocates = 0;

  for (const e of today) {
    const n = e.count && e.count > 0 ? e.count : 1;
    if (e.type === "add") bump(addsByLoc, e.location ?? "", n);
    if (e.type === "scan" || e.type === "not_found") bump(scansByLoc, e.location ?? "", n);
    if (e.type === "relocate") relocates += n;
  }

  const topAdd = [...addsByLoc.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topAdd && topAdd[1] >= 5) {
    anomalies.push({
      id: `adds-${topAdd[0]}`,
      severity: topAdd[1] >= 12 ? "warn" : "info",
      title: `Unusual: ${topAdd[1]} adds in one room`,
      detail: `${topAdd[0]} — ${topAdd[1]} new devices added today on this device.`,
    });
  }

  const topScan = [...scansByLoc.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topScan && topScan[1] >= 25) {
    anomalies.push({
      id: `scans-${topScan[0]}`,
      severity: "info",
      title: `Busy room: ${topScan[1]} resolutions`,
      detail: `${topScan[0]} — scanned or marked not found ${topScan[1]} times today.`,
    });
  }

  if (relocates >= 5) {
    anomalies.push({
      id: "relocate",
      severity: relocates >= 10 ? "warn" : "info",
      title: `Scans moved from assigned location`,
      detail: `${relocates} look-up confirm(s) today used a different room than on file.`,
    });
  }

  return anomalies.slice(0, 4);
}
