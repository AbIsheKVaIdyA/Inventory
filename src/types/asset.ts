export type AssetStatus = "pending" | "scanned";

export type Asset = {
  id: string;
  computer_name: string;
  /** Physical location from inventory — where to go on site */
  location: string | null;
  status: AssetStatus;
  scanned_by: string | null;
  scanned_at: string | null;
};
