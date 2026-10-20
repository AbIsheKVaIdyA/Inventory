import { AdminOverviewClient } from "@/components/AdminOverviewClient";
import { loadAdminOverview } from "@/lib/admin-overview";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireArea } from "@/lib/supabase/session-profile";

export default async function AdminOverviewPage() {
  const profile = await requireArea("users", "/admin");
  const overview = await loadAdminOverview(await createSupabaseServerClient());

  return (
    <AdminOverviewClient
      email={profile.email}
      displayName={profile.displayName}
      role={profile.role}
      overview={overview}
    />
  );
}
