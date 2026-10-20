import { RequestsClient } from "@/components/RequestsClient";
import { fetchDepartments } from "@/lib/departments";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireArea } from "@/lib/supabase/session-profile";

export default async function RequestsPage() {
  const profile = await requireArea("requests", "/requests");
  const departments = await fetchDepartments(await createSupabaseServerClient());

  return (
    <RequestsClient
      email={profile.email}
      displayName={profile.displayName}
      role={profile.role}
      departments={departments}
    />
  );
}
