"use client";

import { MapPinIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScanButton } from "@/components/ScanButton";
import type { Asset } from "@/types/asset";

import { cn } from "@/lib/utils";

function formatTs(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type AssetRowProps = {
  asset: Asset;
  scanning: boolean;
  onScan: (asset: Asset) => void;
};

export function AssetRow({ asset, scanning, onScan }: AssetRowProps) {
  const scanned = asset.status === "scanned";
  const locationText = asset.location?.trim();

  return (
    <li>
      <article
        className={cn(
          "overflow-hidden rounded-2xl border bg-card/90 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] backdrop-blur-sm transition-shadow",
          scanned
            ? "border-emerald-500/35 ring-emerald-500/15"
            : "border-border ring-transparent"
        )}
      >
        <div
          className={cn(
            "h-1 w-full bg-gradient-to-r",
            scanned ? "from-emerald-500 to-teal-400" : "from-muted to-transparent"
          )}
        />

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Asset / tag
              </p>
              <p className="mt-1 truncate font-mono text-lg font-semibold tracking-wide text-foreground sm:text-xl">
                {asset.computer_name}
              </p>
            </div>

            <Badge
              variant="secondary"
              className={
                scanned
                  ? "shrink-0 border-transparent bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/35"
                  : "shrink-0 border-transparent bg-muted px-3 py-1 text-sm font-medium text-muted-foreground ring-1 ring-border"
              }
            >
              {scanned ? "Scanned" : "Needs scan"}
            </Badge>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/35 px-4 py-3.5 ring-1 ring-amber-400/15">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <MapPinIcon className="size-5" aria-hidden strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-amber-400/95">
                  Visit location
                </p>
                <p className="mt-1 text-base font-semibold leading-snug text-amber-50">
                  {locationText && locationText.length > 0 ? (
                    locationText
                  ) : (
                    <span className="font-normal text-amber-200/70">
                      Not set in database — check your import column maps to{" "}
                      <span className="font-mono text-sm">location</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 rounded-xl bg-background/60 px-4 py-3 text-sm ring-1 ring-white/[0.06]">
            <div className="flex flex-wrap justify-between gap-2 gap-y-1">
              <dt className="text-muted-foreground">Last scan by</dt>
              <dd className="font-medium text-foreground">{asset.scanned_by ?? "—"}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 gap-y-1">
              <dt className="text-muted-foreground">Last scan time</dt>
              <dd className="tabular-nums font-medium text-foreground">
                {formatTs(asset.scanned_at)}
              </dd>
            </div>
          </dl>

          <ScanButton
            asset={asset}
            scanning={scanning}
            onScan={() => onScan(asset)}
          />
        </div>
      </article>
    </li>
  );
}
