import { redirect } from "next/navigation";

import { RoomSubmissionsPageClient } from "@/app/dashboard/room-submissions/page-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function RoomSubmissionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?next=/dashboard/room-submissions");
  }

  const md = user.user_metadata as Record<string, unknown> | undefined;
  const full = typeof md?.full_name === "string" ? md.full_name.trim() : "";
  const label = full.length > 0 ? full : user.email.split("@")[0] ?? user.email;

  return (
    <RoomSubmissionsPageClient scannerEmail={user.email} scannerDisplayName={label} />
  );
}
