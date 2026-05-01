"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Asset } from "@/types/asset";

import { cn } from "@/lib/utils";

type ScanButtonProps = {
  asset: Asset;
  scanning: boolean;
  onScan: () => void;
  className?: string;
};

export function ScanButton({ asset, scanning, onScan, className }: ScanButtonProps) {
  const disabled = asset.status === "scanned" || scanning;
  const scanned = asset.status === "scanned";

  return (
    <Button
      type="button"
      variant={scanned ? "secondary" : "default"}
      size="lg"
      disabled={disabled}
      onClick={onScan}
      aria-busy={scanning}
      className={cn(
        "h-14 min-h-14 w-full touch-manipulation rounded-2xl text-base font-semibold shadow-lg transition-all motion-reduce:transition-none active:scale-[0.99]",
        scanned
          ? "border-border bg-muted/80 text-muted-foreground shadow-black/15"
          : "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-emerald-900/30 ring-1 ring-emerald-400/25 hover:brightness-110 dark:shadow-black/40",
        className
      )}
    >
      {scanning ? (
        <>
          <Loader2Icon className="size-5 animate-spin" aria-hidden />
          Saving…
        </>
      ) : scanned ? (
        "Recorded"
      ) : (
        "Mark as scanned"
      )}
    </Button>
  );
}
