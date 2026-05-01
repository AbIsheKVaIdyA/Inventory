"use client";

import { LogOutIcon, UserRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type HeaderProps = {
  title?: string;
  currentDisplayName: string;
  sessionEmail: string;
  onSignOut?: () => void;
};

export function Header({
  title = "Scan queue",
  currentDisplayName,
  sessionEmail,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-4 max-[361px]:px-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 shrink pt-0.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Inventory
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-[13rem] sm:items-end">
          <div className="flex min-h-[3rem] w-full items-center gap-3 rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-sm sm:gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25 sm:size-9">
              <UserRoundIcon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 overflow-hidden text-left">
              <p className="truncate text-sm font-semibold leading-tight">{currentDisplayName}</p>
              <p className="truncate text-[0.7rem] leading-tight text-muted-foreground">
                {sessionEmail}
              </p>
            </div>
          </div>

          {onSignOut ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full gap-2 rounded-2xl border-border bg-card/60 text-sm font-medium backdrop-blur-sm touch-manipulation sm:h-12 sm:min-h-12 sm:min-w-[8.5rem]"
              onClick={onSignOut}
            >
              <LogOutIcon className="size-4 shrink-0 opacity-80" aria-hidden />
              Sign out
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
