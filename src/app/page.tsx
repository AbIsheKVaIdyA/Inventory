import { redirect } from "next/navigation";

import { homePathForRole } from "@/lib/roles";
import { getSessionProfile } from "@/lib/supabase/session-profile";

export default async function HomePage() {
  const profile = await getSessionProfile();
  redirect(profile ? homePathForRole(profile.role) : "/login");
}
