import {
  displayLabelFromInventory,
  type InventoryItemRow,
} from "@/lib/inventory-map";

const MIN_QUERY_LEN = 2;

function textFieldsMatch(row: InventoryItemRow, q: string): boolean {
  const fields: (string | null | undefined)[] = [
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
  ];
  for (const f of fields) {
    const t = f?.trim().toLowerCase() ?? "";
    if (t.length > 0 && t.includes(q)) return true;
  }
  const label = displayLabelFromInventory(row).trim().toLowerCase();
  return label.length > 0 && label.includes(q);
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

/**
 * Case-insensitive substring match across serial, asset ID, tag, model, manufacturer,
 * description, other worksheet text columns, the display label, and sheet row id.
 */
export function searchInventoryWorksheetRows(
  rows: InventoryItemRow[],
  rawQuery: string
): InventoryItemRow[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < MIN_QUERY_LEN) return [];

  return rows.filter(
    (r) => textFieldsMatch(r, q) || sheetRowMatches(r, q)
  );
}

export function inventorySearchMinQueryLength(): number {
  return MIN_QUERY_LEN;
}
