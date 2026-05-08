"use client";

import { PartyPopperIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type CelebrationToastProps = {
  open: boolean;
  title: string;
  message: string;
};

export function CelebrationToast({ open, title, message }: CelebrationToastProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-3 z-[95] transition-all duration-300 sm:inset-x-auto sm:right-4 sm:w-[24rem]",
        "bottom-[calc(var(--site-footer-reserve)+0.75rem)] sm:bottom-4",
        open
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      )}
    >
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/90 px-4 py-3 text-emerald-50 shadow-xl shadow-black/40 ring-1 ring-emerald-500/25 backdrop-blur-md">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PartyPopperIcon className="size-4 shrink-0" aria-hidden />
          {title}
        </p>
        <p className="mt-1 text-sm text-emerald-100/90">{message}</p>
      </div>
    </div>
  );
}
