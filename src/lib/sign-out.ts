import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export async function signOutAndGoToLogin(): Promise<void> {
  try {
    const res = await fetch("/auth/signout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) {
      await getSupabaseBrowserClient().auth.signOut();
    }
  } catch {
    await getSupabaseBrowserClient().auth.signOut();
  }
  window.location.assign("/login");
}
