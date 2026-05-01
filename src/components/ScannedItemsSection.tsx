"use client";

import { Loader2Icon, MapPinIcon, Undo2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Asset } from "@/types/asset";

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

function ScannedItemRow({
  asset,
  busy,
  onUnscan,
}: {
  asset: Asset;
  busy: boolean;
  onUnscan: () => void;
}) {
  const locationText = asset.location?.trim();

  return (
    <li className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 ring-1 ring-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-foreground">{asset.computer_name}</p>
          <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPinIcon className="size-3.5 shrink-0 mt-0.5 text-amber-500/90" aria-hidden />
            <span>{locationText && locationText.length > 0 ? locationText : "—"}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        By <span className="font-medium text-foreground">{asset.scanned_by ?? "—"}</span>
        {" · "}
        <span className="tabular-nums">{formatTs(asset.scanned_at)}</span>
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void onUnscan()}
        className="mt-3 h-12 w-full rounded-xl border-orange-700/35 bg-transparent text-orange-200 hover:bg-orange-950/60 hover:text-orange-50"
      >
        {busy ? (
          <>
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
            Undoing…
          </>
        ) : (
          <>
            <Undo2Icon className="size-4" aria-hidden />
            Undo scan
          </>
        )}
      </Button>
    </li>
  );
}

type ScannedItemsSectionProps = {
  assets: Asset[];
  unscanningId: string | null;
  onUnscan: (asset: Asset) => void;
};

/** Full list of scanned rows with undo → back to pending queue. */
export function ScannedItemsSection({
  assets,
  unscanningId,
  onUnscan,
}: ScannedItemsSectionProps) {
  return (
    <section
      id="scanned-items-panel"
      className="rounded-2xl border border-border bg-card/50 shadow-md shadow-black/20 backdrop-blur-sm"
      aria-labelledby="scanned-heading"
    >
      <div className="border-b border-border/80 px-4 py-3 sm:py-4">
        <p
          id="scanned-heading"
          className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Scanned items
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {assets.length} shown — Undo scan sends a machine back to the queue.
        </p>
      </div>

      <div className="px-4 pb-4 pt-3">
        <ul className="flex max-h-[min(70vh,32rem)] flex-col gap-3 overflow-y-auto pr-1 sm:max-h-[min(75vh,40rem)]">
          {assets.map((asset) => (
            <ScannedItemRow
              key={asset.id}
              asset={asset}
              busy={unscanningId === asset.id}
              onUnscan={() => onUnscan(asset)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
