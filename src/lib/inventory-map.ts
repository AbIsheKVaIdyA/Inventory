import type { Asset } from "@/types/asset";

/** Row shape for `public.inventory_items` (worksheet + scan fields). */
export type InventoryItemRow = {
  id: string;
  sheet_row_id?: number | null;
  area_id?: string | null;
  tag_number?: string | null;
  fy_missing?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_id?: string | null;
  description?: string | null;
  profile_id?: string | null;
  acq_date?: string | null;
  po_no?: string | null;
  asset_id?: string | null;
  inventory_date?: string | null;
  inventory_status?: string | null;
  scan_status: string;
  scanned_by?: string | null;
  scanned_at?: string | null;
};

const INVENTORY_SELECT =
  "id, sheet_row_id, area_id, tag_number, fy_missing, location, manufacturer, model, serial_id, description, profile_id, acq_date, po_no, asset_id, inventory_date, inventory_status, scan_status, scanned_by, scanned_at";

export function getInventoryItemsSelectColumns(): string {
  return INVENTORY_SELECT;
}

export function displayLabelFromInventory(
  row: Pick<InventoryItemRow, "tag_number" | "asset_id" | "serial_id" | "sheet_row_id">
): string {
  const t = row.tag_number?.trim();
  if (t) return t;
  const a = row.asset_id?.trim();
  if (a) return a;
  const s = row.serial_id?.trim();
  if (s) return s;
  if (row.sheet_row_id != null && !Number.isNaN(Number(row.sheet_row_id))) {
    return `#${row.sheet_row_id}`;
  }
  return "Unknown";
}

/** Worksheet `inventory_status` when user marks asset missing on site */
export const INVENTORY_STATUS_NOT_FOUND = "Not found at location";

/** Worksheet `inventory_status` when staff adds hardware not present on the import */
export const INVENTORY_STATUS_DISCOVERED_ON_SCAN = "Discovered on scan";

/** Worksheet status to keep when moving a row from scanned / not_found back to pending */
export function inventoryStatusAfterUndoScan(
  row: Pick<InventoryItemRow, "scan_status" | "inventory_status">
): string | null {
  if (row.scan_status === "not_found") return null;
  if (row.inventory_status === INVENTORY_STATUS_DISCOVERED_ON_SCAN) return null;
  return row.inventory_status ?? null;
}

export function inventoryItemToAsset(row: InventoryItemRow): Asset {
  const loc = row.location?.trim();
  let status: Asset["status"] = "pending";
  if (row.scan_status === "scanned") status = "scanned";
  else if (row.scan_status === "not_found") status = "not_found";
  return {
    id: row.id,
    computer_name: displayLabelFromInventory(row),
    location: loc ? loc : null,
    serial_id: row.serial_id?.trim() ? row.serial_id.trim() : null,
    manufacturer: row.manufacturer?.trim() ? row.manufacturer.trim() : null,
    model: row.model?.trim() ? row.model.trim() : null,
    status,
    scanned_by: row.scanned_by ?? null,
    scanned_at: row.scanned_at ?? null,
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return String(v);
}

/** Parse a Supabase realtime or REST payload into a row when possible. */
export function inventoryItemFromRecord(
  raw: Record<string, unknown>
): InventoryItemRow | null {
  if (typeof raw.id !== "string") return null;

  const scan =
    typeof raw.scan_status === "string" ? raw.scan_status : "pending";

  return {
    id: raw.id,
    sheet_row_id: numOrNull(raw.sheet_row_id),
    area_id: strOrNull(raw.area_id),
    tag_number: strOrNull(raw.tag_number),
    fy_missing: strOrNull(raw.fy_missing),
    location: strOrNull(raw.location),
    manufacturer: strOrNull(raw.manufacturer),
    model: strOrNull(raw.model),
    serial_id: strOrNull(raw.serial_id),
    description: strOrNull(raw.description),
    profile_id: strOrNull(raw.profile_id),
    acq_date: strOrNull(raw.acq_date),
    po_no: strOrNull(raw.po_no),
    asset_id: strOrNull(raw.asset_id),
    inventory_date: strOrNull(raw.inventory_date),
    inventory_status: strOrNull(raw.inventory_status),
    scan_status: scan,
    scanned_by: strOrNull(raw.scanned_by),
    scanned_at: strOrNull(raw.scanned_at),
  };
}

export function mergeInventoryRow(
  previous: InventoryItemRow,
  patch: Record<string, unknown>
): InventoryItemRow {
  const merged = { ...previous, ...patch } as Record<string, unknown>;
  const next = inventoryItemFromRecord(merged);
  return next ?? previous;
}

export function sortInventoryRows(rows: InventoryItemRow[]): InventoryItemRow[] {
  return [...rows].sort((a, b) =>
    displayLabelFromInventory(a).localeCompare(displayLabelFromInventory(b))
  );
}

function compareInventoryRowsForCsvExport(a: InventoryItemRow, b: InventoryItemRow): number {
  const aDone = a.scan_status === "scanned" || a.scan_status === "not_found";
  const bDone = b.scan_status === "scanned" || b.scan_status === "not_found";
  if (aDone !== bDone) return aDone ? -1 : 1;
  if (aDone && bDone) {
    const byTime = (b.scanned_at ?? "").localeCompare(a.scanned_at ?? "");
    if (byTime !== 0) return byTime;
  }
  return displayLabelFromInventory(a).localeCompare(displayLabelFromInventory(b));
}

function partitionInventoryRowsForCsvExport(rows: InventoryItemRow[]): {
  main: InventoryItemRow[];
  manual: InventoryItemRow[];
} {
  const main: InventoryItemRow[] = [];
  const manual: InventoryItemRow[] = [];
  for (const r of rows) {
    if (r.inventory_status === INVENTORY_STATUS_DISCOVERED_ON_SCAN) manual.push(r);
    else main.push(r);
  }
  return { main, manual };
}

/**
 * CSV / worksheet order: import rows first (completed first, newest scan first; then pending
 * by label). Rows with `inventory_status` “Discovered on scan” (added on the floor) are last.
 */
export function sortInventoryRowsForCsvExport(
  rows: InventoryItemRow[]
): InventoryItemRow[] {
  const { main, manual } = partitionInventoryRowsForCsvExport(rows);
  return [
    ...[...main].sort(compareInventoryRowsForCsvExport),
    ...[...manual].sort(compareInventoryRowsForCsvExport),
  ];
}

/** CSV column order aligned with worksheet + scan fields */
export const INVENTORY_CSV_HEADERS = [
  "sheet_row_id",
  "area_id",
  "tag_number",
  "fy_missing",
  "location",
  "manufacturer",
  "model",
  "serial_id",
  "description",
  "profile_id",
  "acq_date",
  "po_no",
  "asset_id",
  "inventory_date",
  "inventory_status",
  "scan_status",
  "scanned_by",
  "scanned_at",
] as const;

export function inventoryRowCsvValues(row: InventoryItemRow): string[] {
  return [
    row.sheet_row_id != null ? String(row.sheet_row_id) : "",
    row.area_id ?? "",
    row.tag_number ?? "",
    row.fy_missing ?? "",
    row.location ?? "",
    row.manufacturer ?? "",
    row.model ?? "",
    row.serial_id ?? "",
    row.description ?? "",
    row.profile_id ?? "",
    row.acq_date ?? "",
    row.po_no ?? "",
    row.asset_id ?? "",
    row.inventory_date ?? "",
    row.inventory_status ?? "",
    row.scan_status,
    row.scanned_by ?? "",
    row.scanned_at ?? "",
  ];
}

/**
 * CSV body lines for download: main worksheet rows, then two blank rows when both sections exist,
 * then manually added (“Discovered on scan”) rows with their data.
 */
export function inventoryCsvBodyLines(rows: InventoryItemRow[]): string[][] {
  const { main, manual } = partitionInventoryRowsForCsvExport(rows);
  const sortedMain = [...main].sort(compareInventoryRowsForCsvExport);
  const sortedManual = [...manual].sort(compareInventoryRowsForCsvExport);
  const colCount = INVENTORY_CSV_HEADERS.length;
  const blankRow = () => Array.from({ length: colCount }, () => "");

  const lines: string[][] = sortedMain.map((r) => inventoryRowCsvValues(r));
  if (sortedManual.length > 0) {
    if (sortedMain.length > 0) {
      lines.push(blankRow(), blankRow());
    }
    for (const r of sortedManual) {
      lines.push(inventoryRowCsvValues(r));
    }
  }
  return lines;
}
