import { RoomMappingClient } from "@/components/RoomMappingClient";
import { fetchDepartments } from "@/lib/departments";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireArea } from "@/lib/supabase/session-profile";

export default async function AdminRoomsPage() {
  const profile = await requireArea("users", "/admin/rooms");
  const departments = await fetchDepartments(await createSupabaseServerClient());

  return (
    <RoomMappingClient
      email={profile.email}
      displayName={profile.displayName}
      role={profile.role}
      departments={departments}
    />
  );
}
