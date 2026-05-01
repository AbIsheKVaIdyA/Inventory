"use client";

import { ArrowRightIcon, ScanLineIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { USERS, type StoredUserName } from "@/lib/constants";

import { cn } from "@/lib/utils";

type UserSelectorProps = {
  onSelect: (name: StoredUserName) => void;
};

function Initial({ name }: { name: StoredUserName }) {
  const letter = name.slice(0, 1).toUpperCase();
  return (
    <span
      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 text-lg font-bold text-primary ring-2 ring-primary/20"
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function UserSelector({ onSelect }: UserSelectorProps) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-x-10 top-[-5%] h-40 rounded-full bg-primary/20 blur-[64px]" aria-hidden />

      <div className="relative mb-10 text-center">
        <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-card/90 text-primary shadow-lg shadow-black/40 ring-1 ring-border backdrop-blur-sm">
          <ScanLineIcon className="size-7" aria-hidden strokeWidth={2} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Floor mode
        </p>
        <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-[2rem]">
          Who&apos;s scanning?
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          Saved only on this phone or tablet. Switch person anytime after you sign in.
        </p>
      </div>

      <ul className="relative grid grid-cols-1 gap-3">
        {USERS.map((name) => (
          <li key={name}>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-auto min-h-[4.25rem] w-full justify-between gap-4 rounded-2xl border-border bg-card/80 px-5 py-4 text-left shadow-md shadow-black/20 backdrop-blur-sm transition-colors active:scale-[0.99]",
                "border hover:border-primary/40 hover:bg-accent/80"
              )}
              onClick={() => onSelect(name)}
            >
              <Initial name={name} />
              <span className="flex-1 text-lg font-semibold tracking-tight">{name}</span>
              <ArrowRightIcon className="size-6 shrink-0 text-muted-foreground" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
