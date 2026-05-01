"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AssetTable } from "@/components/AssetTable";

import { useSelectedUser } from "@/hooks/use-selected-user";

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated, clearUser } = useSelectedUser();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/");
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 px-6 text-muted-foreground">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" aria-hidden />
          <Loader2Icon className="relative size-11 animate-spin text-primary" aria-hidden />
        </div>
        <span className="text-sm font-medium">Opening queue…</span>
      </div>
    );
  }

  return <AssetTable selectedUser={user} onSwitchUser={clearUser} />;
}
