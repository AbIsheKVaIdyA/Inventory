const STORAGE_KEY = "inventory-scan-path-v1";
const MAX_RECENT = 24;

type PathState = {
  /** Most recent rooms first */
  recent: string[];
  /** From room → to room → count */
  transitions: Record<string, Record<string, number>>;
};

function emptyState(): PathState {
  return { recent: [], transitions: {} };
}

function readState(): PathState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PathState;
    if (!parsed || !Array.isArray(parsed.recent) || typeof parsed.transitions !== "object") {
      return emptyState();
    }
    return {
      recent: parsed.recent.filter((x) => typeof x === "string" && x.trim()),
      transitions: parsed.transitions ?? {},
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: PathState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/** Record that the scanner is working in / confirmed this location. */
export function recordLocationVisit(location: string | null | undefined) {
  const loc = location?.trim() ?? "";
  if (!loc) return;

  const state = readState();
  const prev = state.recent[0];
  if (prev && prev !== loc) {
    const bucket = state.transitions[prev] ?? {};
    bucket[loc] = (bucket[loc] ?? 0) + 1;
    state.transitions[prev] = bucket;
  }

  state.recent = [loc, ...state.recent.filter((r) => r !== loc)].slice(0, MAX_RECENT);
  writeState(state);
}

/**
 * Suggest next rooms: strongest transitions from current, then other recent rooms
 * that still appear in `available` (pending location options).
 */
export function suggestNextLocations(
  current: string | null,
  available: string[],
  limit = 3
): string[] {
  const avail = new Set(available.filter((a) => a.trim()));
  if (avail.size === 0) return [];

  const state = readState();
  const scored = new Map<string, number>();

  const cur = current?.trim() ?? "";
  if (cur && state.transitions[cur]) {
    for (const [to, count] of Object.entries(state.transitions[cur])) {
      if (to !== cur && avail.has(to)) scored.set(to, (scored.get(to) ?? 0) + count * 10);
    }
  }

  state.recent.forEach((loc, i) => {
    if (loc === cur || !avail.has(loc)) return;
    scored.set(loc, (scored.get(loc) ?? 0) + Math.max(1, MAX_RECENT - i));
  });

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([loc]) => loc)
    .filter((loc) => loc !== cur)
    .slice(0, limit);
}
