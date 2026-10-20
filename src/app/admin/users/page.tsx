import { UsersAdminClient } from "@/components/UsersAdminClient";
import { fetchDepartments } from "@/lib/departments";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireArea } from "@/lib/supabase/session-profile";

export default async function AdminUsersPage() {
  const profile = await requireArea("users", "/admin/users");
  const departments = await fetchDepartments(await createSupabaseServerClient());

  return (
    <UsersAdminClient
      userId={profile.userId}
      email={profile.email}
      displayName={profile.displayName}
      role={profile.role}
      departments={departments}
    />
  );
}
