import { RoomSubmissionsPageClient } from "@/app/dashboard/room-submissions/page-client";
import { requireArea } from "@/lib/supabase/session-profile";

export default async function RoomSubmissionsPage() {
  const profile = await requireArea("scan", "/dashboard/room-submissions");

  return (
    <RoomSubmissionsPageClient
      scannerEmail={profile.email}
      scannerDisplayName={profile.displayName}
      role={profile.role}
    />
  );
}
