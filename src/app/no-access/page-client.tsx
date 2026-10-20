"use client";

import { ClockIcon } from "lucide-react";

import { Header } from "@/components/Header";
import { signOutAndGoToLogin } from "@/lib/sign-out";

export function NoAccessClient({ email, displayName }: { email: string; displayName: string }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        title="Waiting for access"
        currentDisplayName={displayName}
        sessionEmail={email}
        onSignOut={() => void signOutAndGoToLogin()}
      />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-8">
        <section className="rounded-2xl border border-border bg-card/80 p-5 text-center shadow-md shadow-black/15">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-950/50 text-amber-100 ring-1 ring-amber-500/35">
            <ClockIcon className="size-6" aria-hidden />
          </span>
          <p className="mt-4 text-base font-semibold text-foreground">Your account is signed in</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            An admin still needs to give <span className="font-medium text-foreground">{email}</span>{" "}
            a role (ECS IT, department, or scan team). Ask your admin, then sign in again.
          </p>
        </section>
      </main>
    </div>
  );
}
