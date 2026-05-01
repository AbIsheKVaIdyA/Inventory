"use client";

import { useRouter } from "next/navigation";

import { AssetTable } from "@/components/AssetTable";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function DashboardClient({
  scannerEmail,
  scannerDisplayName,
}: {
  scannerEmail: string;
  scannerDisplayName: string;
}) {
  const router = useRouter();

  async function onSignOut() {
    const sb = getSupabaseBrowserClient();
    await sb.auth.signOut();
    router.refresh();
    router.replace("/login");
  }

  return (
    <AssetTable
      scannerEmail={scannerEmail}
      scannerDisplayName={scannerDisplayName}
      onSignOut={onSignOut}
    />
  );
}
