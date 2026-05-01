"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { UserSelector } from "@/components/UserSelector";

import { useSelectedUser } from "@/hooks/use-selected-user";

export default function HomePage() {
  const router = useRouter();
  const { user, hydrated, setSelectedUser } = useSelectedUser();

  useEffect(() => {
    if (hydrated && user) {
      router.replace("/dashboard");
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-muted-foreground">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" aria-hidden />
          <Loader2Icon className="relative size-11 animate-spin text-primary" aria-hidden />
        </div>
        <span className="text-sm font-medium">Starting…</span>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex flex-1 flex-col">
      <UserSelector
        onSelect={(name) => {
          setSelectedUser(name);
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
