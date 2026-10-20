"use client";

import { RoomSubmissionsClient } from "@/components/RoomSubmissionsClient";
import type { AppRole } from "@/lib/roles";
import { signOutAndGoToLogin } from "@/lib/sign-out";

export function RoomSubmissionsPageClient({
  scannerEmail,
  scannerDisplayName,
  role,
}: {
  scannerEmail: string;
  scannerDisplayName: string;
  role: AppRole;
}) {
  return (
    <RoomSubmissionsClient
      scannerEmail={scannerEmail}
      scannerDisplayName={scannerDisplayName}
      role={role}
      onSignOut={signOutAndGoToLogin}
    />
  );
}
