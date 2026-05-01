"use client";

import { LogOutIcon, UserRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StoredUserName } from "@/lib/constants";

type HeaderProps = {
  title?: string;
  currentUser: StoredUserName | null;
  onSwitchUser?: () => void;
};

export function Header({ title = "Scan queue", currentUser, onSwitchUser }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-lg items-start justify-between gap-3 px-4 pb-4">
        <div className="min-w-0 pt-0.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Inventory
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex max-w-[11rem] items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <UserRoundIcon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold leading-tight">
                {currentUser ?? "—"}
              </p>
              <p className="text-muted-foreground truncate text-[0.7rem] leading-tight">
                This device
              </p>
            </div>
          </div>

          {onSwitchUser && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 min-w-[8.5rem] gap-2 rounded-2xl border-border bg-card/60 text-sm font-medium backdrop-blur-sm"
              onClick={onSwitchUser}
            >
              <LogOutIcon className="size-4 opacity-80" aria-hidden />
              Switch
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
