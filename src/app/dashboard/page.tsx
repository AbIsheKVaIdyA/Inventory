import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { DashboardClient } from "@/app/dashboard/dashboard-client";

import { DEMO_ACCESS_COOKIE, hasDemoAccessCookie } from "@/lib/demo-access";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const cookieStore = await cookies();
    const hasDemoAccess = hasDemoAccessCookie(cookieStore.get(DEMO_ACCESS_COOKIE)?.value);
    if (!hasDemoAccess) redirect("/login");
    return (
      <DashboardClient
        scannerEmail="demo@inventory.local"
        scannerDisplayName="Demo User"
      />
    );
  }

  const md = user.user_metadata as Record<string, unknown> | undefined;
  const full =
    typeof md?.full_name === "string" ? md.full_name.trim() : "";
  const label = full.length > 0 ? full : user.email.split("@")[0] ?? user.email;

  return (
    <DashboardClient scannerEmail={user.email} scannerDisplayName={label} />
  );
}
