import { redirect } from "next/navigation";

import { canAccess, homePathForRole, parseRole, type AppArea, type AppRole } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type SessionProfile = {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  departmentCode: string | null;
};

/** Postgres "undefined table" / PostgREST "table not in schema cache". */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const md = user.user_metadata as Record<string, unknown> | undefined;
  const metaName = typeof md?.full_name === "string" ? md.full_name.trim() : "";

  const { data, error } = await supabase
    .from("user_profiles")
    .select("role, department_code, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  // Until migration 0010 is applied there are no roles yet: keep the original scan-team access.
  const role: AppRole =
    error && MISSING_TABLE_CODES.has(error.code ?? "") ? "scanner" : parseRole(data?.role);
  const profileName = typeof data?.full_name === "string" ? data.full_name.trim() : "";

  return {
    userId: user.id,
    email: user.email,
    displayName: profileName || metaName || user.email.split("@")[0] || user.email,
    role,
    departmentCode: typeof data?.department_code === "string" ? data.department_code : null,
  };
}

/** Server-page guard: sends signed-out users to login and other roles to their own home page. */
export async function requireArea(area: AppArea, nextPath: string): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!canAccess(profile.role, area)) {
    redirect(homePathForRole(profile.role));
  }
  return profile;
}
