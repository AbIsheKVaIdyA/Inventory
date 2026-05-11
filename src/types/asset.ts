export type AssetStatus = "pending" | "scanned" | "not_found";

export type Asset = {
  id: string;
  computer_name: string;
  /** Physical location from inventory — where to go on site */
  location: string | null;
  /** Sticker / worksheet fields (editable when info was missing on import) */
  serial_id: string | null;
  asset_id: string | null;
  manufacturer: string | null;
  model: string | null;
  status: AssetStatus;
  scanned_by: string | null;
  scanned_at: string | null;
};
