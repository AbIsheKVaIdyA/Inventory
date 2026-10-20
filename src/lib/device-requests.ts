import type { SupabaseClient } from "@supabase/supabase-js";

export type DeviceRequestStatus = "pending" | "approved" | "rejected";

export type DeviceRequestInsert = {
  department_code: string;
  location: string;
  tag_number: string | null;
  serial_id: string | null;
  manufacturer: string | null;
  model: string | null;
  description: string | null;
  notes: string | null;
};

export type DeviceRequest = DeviceRequestInsert & {
  id: string;
  status: DeviceRequestStatus;
  requested_by: string | null;
  requested_by_email: string | null;
  requested_by_name: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export const DEVICE_REQUEST_STATUS_LABELS: Record<DeviceRequestStatus, string> = {
  pending: "Waiting for IT",
  approved: "Approved",
  rejected: "Rejected",
};

export const DEVICE_REQUEST_STATUS_CLASSES: Record<DeviceRequestStatus, string> = {
  pending: "border-amber-500/40 bg-amber-950/45 text-amber-100",
  approved: "border-emerald-500/40 bg-emerald-950/45 text-emerald-100",
  rejected: "border-red-500/40 bg-red-950/45 text-red-100",
};

const SELECT =
  "id, department_code, location, tag_number, serial_id, manufacturer, model, description, notes, status, requested_by, requested_by_email, requested_by_name, reviewed_by_email, reviewed_at, review_note, created_at";

export async function fetchDeviceRequests(
  sb: SupabaseClient,
  departmentCode?: string
): Promise<DeviceRequest[]> {
  let query = sb.from("device_requests").select(SELECT).order("created_at", { ascending: false });
  if (departmentCode) query = query.eq("department_code", departmentCode);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DeviceRequest[];
}

/** Best label for a request/device: tag, then serial. */
export function deviceRequestLabel(r: Pick<DeviceRequest, "tag_number" | "serial_id">): string {
  return r.tag_number?.trim() || (r.serial_id?.trim() ? `S/N ${r.serial_id.trim()}` : "Unlabelled");
}

export function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}
