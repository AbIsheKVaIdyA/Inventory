import {
  displayLabelFromInventory,
  type InventoryItemRow,
} from "@/lib/inventory-map";
import {
  bestWindowDistance,
  fuzzyDistanceThreshold,
  normalizeKey,
} from "@/lib/fuzzy-text";

const MIN_QUERY_LEN = 2;

export type InventorySearchHit = {
  row: InventoryItemRow;
  /** Lower is better. 0 = exact / normalized equality. */
  score: number;
  fuzzy: boolean;
};

function identityFields(row: InventoryItemRow): string[] {
  return [
    row.tag_number,
    row.serial_id,
    row.asset_id,
    displayLabelFromInventory(row),
  ]
    .map((f) => f?.trim() ?? "")
    .filter((t) => t.length > 0);
}

function sheetRowExactMatch(row: InventoryItemRow, q: string): boolean {
  if (row.sheet_row_id == null || Number.isNaN(Number(row.sheet_row_id))) return false;
  const sheet = String(row.sheet_row_id);
  return sheet === q || `#${sheet}` === q || (q.startsWith("#") && sheet === q.slice(1));
}

/**
 * Look up: exact match only on tag / serial / asset ID / display label
 * (and exact sheet row id). No fuzzy or “close” suggestions.
 */
export function searchInventoryExactIdentity(
  rows: InventoryItemRow[],
  rawQuery: string
): InventorySearchHit[] {
  const qRaw = rawQuery.trim().toLowerCase();
  if (qRaw.length < MIN_QUERY_LEN) return [];
  const qNorm = normalizeKey(qRaw);

  const hits: InventorySearchHit[] = [];
  for (const row of rows) {
    if (sheetRowExactMatch(row, qRaw)) {
      hits.push({ row, score: 0, fuzzy: false });
      continue;
    }
    let matched = false;
    for (const field of identityFields(row)) {
      const lower = field.toLowerCase();
      if (lower === qRaw) {
        matched = true;
        break;
      }
      if (qNorm.length >= 2 && normalizeKey(field) === qNorm) {
        matched = true;
        break;
      }
    }
    if (matched) hits.push({ row, score: 0, fuzzy: false });
  }

  return hits.sort((a, b) => a.row.id.localeCompare(b.row.id));
}

/** @deprecated Prefer searchInventoryExactIdentity for Look up */
export function searchInventoryWorksheetHits(
  rows: InventoryItemRow[],
  rawQuery: string
): InventorySearchHit[] {
  return searchInventoryExactIdentity(rows, rawQuery);
}

export function searchInventoryWorksheetRows(
  rows: InventoryItemRow[],
  rawQuery: string
): InventoryItemRow[] {
  return searchInventoryExactIdentity(rows, rawQuery).map((h) => h.row);
}

export function inventorySearchMinQueryLength(): number {
  return MIN_QUERY_LEN;
}

/** In-room list filter — substring / normalized contains (not Look up). */
export function textMatchesQuery(blob: string, rawQuery: string): boolean {
  const qRaw = rawQuery.trim().toLowerCase();
  if (qRaw.length < MIN_QUERY_LEN) return true;
  const qNorm = normalizeKey(qRaw);
  const lower = blob.toLowerCase();
  const norm = normalizeKey(blob);
  if (lower.includes(qRaw) || (qNorm.length >= 2 && norm.includes(qNorm))) return true;
  const threshold = fuzzyDistanceThreshold(qNorm.length);
  return bestWindowDistance(norm, qNorm) <= threshold;
}
