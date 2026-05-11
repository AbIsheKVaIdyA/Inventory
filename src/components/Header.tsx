"use client";

import { ChevronDownIcon, LogOutIcon, UserRoundIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type HeaderProps = {
  title?: string;
  currentDisplayName: string;
  sessionEmail: string;
  onSignOut?: () => void;
};

const userCardClass =
  "flex min-h-[3rem] w-full items-center gap-3 rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-sm sm:gap-2";

export function Header({
  title = "Scan queue",
  currentDisplayName,
  sessionEmail,
  onSignOut,
}: HeaderProps) {
  const userInner = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25 sm:size-9">
        <UserRoundIcon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden text-left">
        <p className="truncate text-sm font-semibold leading-tight">{currentDisplayName}</p>
        <p className="truncate text-[0.7rem] leading-tight text-muted-foreground">{sessionEmail}</p>
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-4 max-[361px]:px-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 shrink pt-0.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Inventory
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        </div>

        <div className="w-full sm:w-auto sm:max-w-[13rem] sm:items-end">
          {onSignOut ? (
            <details className="group relative w-full">
              <summary
                className={cn(
                  userCardClass,
                  "list-none cursor-pointer touch-manipulation outline-offset-2 marker:content-none [&::-webkit-details-marker]:hidden",
                  "hover:bg-card focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                )}
                aria-label={`Account menu for ${currentDisplayName}`}
              >
                {userInner}
                <ChevronDownIcon
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-full min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg shadow-black/25 ring-1 ring-white/[0.06]">
                <button
                  type="button"
                  className="flex h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium text-foreground hover:bg-muted/80 active:bg-muted touch-manipulation"
                  onClick={() => void onSignOut()}
                >
                  <LogOutIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                  Sign out
                </button>
              </div>
            </details>
          ) : (
            <div className={userCardClass}>{userInner}</div>
          )}
        </div>
      </div>
    </header>
  );
}
