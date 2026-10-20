import type { SupabaseClient } from "@supabase/supabase-js";

export type Department = {
  code: string;
  name: string;
  sort_order: number;
};

export async function fetchDepartments(sb: SupabaseClient): Promise<Department[]> {
  const { data, error } = await sb
    .from("departments")
    .select("code, name, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).filter(
    (d): d is Department => typeof d?.code === "string" && typeof d?.name === "string"
  );
}

export function departmentName(departments: Department[], code: string | null | undefined): string {
  if (!code) return "No department";
  return departments.find((d) => d.code === code)?.name ?? code;
}
