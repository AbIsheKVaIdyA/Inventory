import { DashboardClient } from "@/app/dashboard/dashboard-client";

import { requireArea } from "@/lib/supabase/session-profile";

export default async function DashboardPage() {
  const profile = await requireArea("scan", "/dashboard");

  return (
    <DashboardClient
      scannerEmail={profile.email}
      scannerDisplayName={profile.displayName}
      role={profile.role}
    />
  );
}
