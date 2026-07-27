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

function rowTextFields(row: InventoryItemRow): string[] {
  return [
    row.serial_id,
    row.asset_id,
    row.tag_number,
    row.manufacturer,
    row.model,
    row.description,
    row.area_id,
    row.fy_missing,
    row.profile_id,
    row.po_no,
    row.location,
    row.acq_date,
    row.inventory_date,
    displayLabelFromInventory(row),
  ]
    .map((f) => f?.trim() ?? "")
    .filter((t) => t.length > 0);
}

function sheetRowMatches(row: InventoryItemRow, q: string): boolean {
  if (row.sheet_row_id == null || Number.isNaN(Number(row.sheet_row_id))) return false;
  const sheet = String(row.sheet_row_id);
  const sheetHash = `#${sheet}`;
  return (
    sheet === q ||
    sheetHash === q ||
    (q.startsWith("#") && sheet === q.slice(1)) ||
    sheet.includes(q)
  );
}

export type InventorySearchHit = {
  row: InventoryItemRow;
  /** Lower is better. 0 = exact / normalized contains. */
  score: number;
  fuzzy: boolean;
};

/**
 * Case-insensitive search with normalized keys (ignores spaces/punctuation)
 * and typo-tolerant fuzzy fallback when nothing exact matches.
 */
export function searchInventoryWorksheetHits(
  rows: InventoryItemRow[],
  rawQuery: string
): InventorySearchHit[] {
  const qRaw = rawQuery.trim().toLowerCase();
  if (qRaw.length < MIN_QUERY_LEN) return [];

  const qNorm = normalizeKey(qRaw);
  const exact: InventorySearchHit[] = [];

  for (const row of rows) {
    if (sheetRowMatches(row, qRaw)) {
      exact.push({ row, score: 0, fuzzy: false });
      continue;
    }

    let best: number | null = null;
    for (const field of rowTextFields(row)) {
      const lower = field.toLowerCase();
      const norm = normalizeKey(field);
      if (lower.includes(qRaw) || (qNorm.length >= 2 && norm.includes(qNorm))) {
        best = 0;
        break;
      }
    }
    if (best === 0) exact.push({ row, score: 0, fuzzy: false });
  }

  if (exact.length > 0) {
    return exact.sort((a, b) => a.score - b.score);
  }

  if (qNorm.length < MIN_QUERY_LEN) return [];

  const threshold = fuzzyDistanceThreshold(qNorm.length);
  const fuzzy: InventorySearchHit[] = [];

  for (const row of rows) {
    let best = Infinity;
    for (const field of rowTextFields(row)) {
      const norm = normalizeKey(field);
      if (!norm) continue;
      const d = bestWindowDistance(norm, qNorm);
      if (d < best) best = d;
    }
    if (best <= threshold) {
      fuzzy.push({ row, score: best, fuzzy: true });
    }
  }

  return fuzzy.sort((a, b) => a.score - b.score || a.row.id.localeCompare(b.row.id));
}

/**
 * Case-insensitive substring + fuzzy match across worksheet identity fields.
 */
export function searchInventoryWorksheetRows(
  rows: InventoryItemRow[],
  rawQuery: string
): InventoryItemRow[] {
  return searchInventoryWorksheetHits(rows, rawQuery).map((h) => h.row);
}

export function inventorySearchMinQueryLength(): number {
  return MIN_QUERY_LEN;
}

/** Filter a list of free-text blobs (e.g. room queue cards) with the same rules. */
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
