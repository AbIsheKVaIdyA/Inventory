import type { SupabaseClient } from "@supabase/supabase-js";

export type DepartmentDevice = {
  id: string;
  tag_number: string | null;
  serial_id: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  description: string | null;
  scan_status: string;
  scanned_at: string | null;
};

const SELECT =
  "id, tag_number, serial_id, location, manufacturer, model, description, scan_status, scanned_at";

/** Same paging as the scan queue: PostgREST caps each response at ~1000 rows. */
const PAGE_SIZE = 1000;

export async function fetchDepartmentDevices(
  sb: SupabaseClient,
  departmentCode: string
): Promise<DepartmentDevice[]> {
  const acc: DepartmentDevice[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from("inventory_items")
      .select(SELECT)
      .eq("department_code", departmentCode)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as DepartmentDevice[];
    acc.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return acc.sort(
    (a, b) =>
      (a.location ?? "").localeCompare(b.location ?? "", undefined, { numeric: true }) ||
      (a.tag_number ?? "").localeCompare(b.tag_number ?? "", undefined, { numeric: true })
  );
}
