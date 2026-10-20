import { DepartmentClient } from "@/components/DepartmentClient";
import { fetchDepartments } from "@/lib/departments";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireArea } from "@/lib/supabase/session-profile";

export default async function DepartmentPage() {
  const profile = await requireArea("department", "/department");
  const departments = await fetchDepartments(await createSupabaseServerClient());

  return (
    <DepartmentClient
      userId={profile.userId}
      email={profile.email}
      displayName={profile.displayName}
      role={profile.role}
      ownDepartmentCode={profile.departmentCode}
      departments={departments}
    />
  );
}
