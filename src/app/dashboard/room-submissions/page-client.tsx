"use client";

import { RoomSubmissionsClient } from "@/components/RoomSubmissionsClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function RoomSubmissionsPageClient({
  scannerEmail,
  scannerDisplayName,
}: {
  scannerEmail: string;
  scannerDisplayName: string;
}) {
  async function onSignOut() {
    try {
      const res = await fetch("/auth/signout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const sb = getSupabaseBrowserClient();
        await sb.auth.signOut();
      }
    } catch {
      const sb = getSupabaseBrowserClient();
      await sb.auth.signOut();
    }
    window.location.assign("/login");
  }

  return (
    <RoomSubmissionsClient
      scannerEmail={scannerEmail}
      scannerDisplayName={scannerDisplayName}
      onSignOut={onSignOut}
    />
  );
}
