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

export function inventoryItemToAsset(row: InventoryItemRow): Asset {
  const loc = row.location?.trim();
  return {
    id: row.id,
    computer_name: displayLabelFromInventory(row),
    location: loc ? loc : null,
    status: row.scan_status === "scanned" ? "scanned" : "pending",
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

/** CSV column order aligned with worksheet + scan fields */
export const INVENTORY_CSV_HEADERS = [
  "id",
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
    row.id,
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
