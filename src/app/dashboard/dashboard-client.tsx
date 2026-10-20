"use client";

import { AssetTable } from "@/components/AssetTable";
import type { AppRole } from "@/lib/roles";
import { signOutAndGoToLogin } from "@/lib/sign-out";

export function DashboardClient({
  scannerEmail,
  scannerDisplayName,
  role,
}: {
  scannerEmail: string;
  scannerDisplayName: string;
  role: AppRole;
}) {
  return (
    <AssetTable
      scannerEmail={scannerEmail}
      scannerDisplayName={scannerDisplayName}
      role={role}
      onSignOut={signOutAndGoToLogin}
    />
  );
}
