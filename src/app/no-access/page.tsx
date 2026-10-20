import { redirect } from "next/navigation";

import { NoAccessClient } from "@/app/no-access/page-client";
import { homePathForRole } from "@/lib/roles";
import { getSessionProfile } from "@/lib/supabase/session-profile";

export default async function NoAccessPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "pending") redirect(homePathForRole(profile.role));

  return <NoAccessClient email={profile.email} displayName={profile.displayName} />;
}
