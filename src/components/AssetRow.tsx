"use client";

import { Loader2Icon, MapPinIcon, SearchXIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanButton } from "@/components/ScanButton";
import type { Asset } from "@/types/asset";

import { cn } from "@/lib/utils";

type AssetRowProps = {
  asset: Asset;
  scanning: boolean;
  notFoundBusy: boolean;
  onScan: (asset: Asset) => void;
  onNotFound: (asset: Asset) => void;
};

export function AssetRow({
  asset,
  scanning,
  notFoundBusy,
  onScan,
  onNotFound,
}: AssetRowProps) {
  const scanned = asset.status === "scanned";
  const notFound = asset.status === "not_found";
  const rowBusy = scanning || notFoundBusy;
  const locationText = asset.location?.trim();
  const serialText = asset.serial_id?.trim();
  const assetIdText = asset.asset_id?.trim();
  const brandText = asset.manufacturer?.trim();
  const modelText = asset.model?.trim();

  return (
    <li>
      <article
        className={cn(
          "overflow-hidden rounded-2xl border bg-card/90 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] backdrop-blur-sm transition-shadow",
          scanned
            ? "border-emerald-500/35 ring-emerald-500/15"
            : notFound
              ? "border-violet-500/35 ring-violet-500/15"
              : "border-border ring-transparent"
        )}
      >
        <div
          className={cn(
            "h-1 w-full bg-gradient-to-r",
            scanned
              ? "from-emerald-500 to-teal-400"
              : notFound
                ? "from-violet-500 to-fuchsia-500/80"
                : "from-muted to-transparent"
          )}
        />

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Asset / tag
              </p>
              <p className="mt-1 break-words font-mono text-base font-semibold tracking-wide text-foreground sm:text-lg sm:tracking-wide">
                {asset.computer_name}
              </p>
            </div>

            <Badge
              variant="secondary"
              className={
                scanned
                  ? "shrink-0 border-transparent bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/35"
                  : notFound
                    ? "shrink-0 border-transparent bg-violet-500/20 px-3 py-1 text-sm font-semibold text-violet-200 ring-1 ring-violet-400/35"
                    : "shrink-0 border-transparent bg-muted px-3 py-1 text-sm font-medium text-muted-foreground ring-1 ring-border"
              }
            >
              {scanned ? "Scanned" : notFound ? "Not found at location" : "Needs scan"}
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
              <dt className="text-muted-foreground">Serial / tag on file</dt>
              <dd className="max-w-[65%] text-right font-mono text-xs font-medium text-foreground break-all">
                {serialText && serialText.length > 0 ? serialText : "—"}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 gap-y-1">
              <dt className="text-muted-foreground">Asset ID</dt>
              <dd className="max-w-[65%] text-right font-mono text-xs font-medium text-foreground break-all">
                {assetIdText && assetIdText.length > 0 ? assetIdText : "—"}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 gap-y-1">
              <dt className="text-muted-foreground">Brand (manufacturer)</dt>
              <dd className="max-w-[65%] text-right font-medium text-foreground break-words">
                {brandText && brandText.length > 0 ? brandText : "—"}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 gap-y-1">
              <dt className="text-muted-foreground">System type (model)</dt>
              <dd className="max-w-[65%] text-right font-medium text-foreground break-words">
                {modelText && modelText.length > 0 ? modelText : "—"}
              </dd>
            </div>
          </dl>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ScanButton
              asset={asset}
              scanning={scanning}
              siblingBusy={notFoundBusy}
              onScan={() => onScan(asset)}
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={asset.status !== "pending" || rowBusy}
              aria-busy={notFoundBusy}
              onClick={() => onNotFound(asset)}
              className="h-14 min-h-14 w-full touch-manipulation gap-2 rounded-2xl border-violet-500/40 bg-violet-950/35 text-base font-semibold text-violet-100 shadow-md shadow-black/20 hover:bg-violet-950/55 hover:text-violet-50"
            >
              {notFoundBusy ? (
                <>
                  <Loader2Icon className="size-5 shrink-0 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <SearchXIcon className="size-5 shrink-0 opacity-90" aria-hidden />
                  Not found at location
                </>
              )}
            </Button>
          </div>
        </div>
      </article>
    </li>
  );
}
