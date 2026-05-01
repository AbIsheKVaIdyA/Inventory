"use client";

import { ChevronDownIcon, Loader2Icon, MapPinIcon, Undo2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { UndoScanAlert } from "@/components/UndoScanAlert";
import type { Asset } from "@/types/asset";

import { cn } from "@/lib/utils";

const NO_LOCATION_SENTINEL = "__no_location__";

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

function groupAssetsByLocation(assets: Asset[]): { label: string; items: Asset[] }[] {
  const map = new Map<string, Asset[]>();
  for (const a of assets) {
    const raw = a.location?.trim() ?? "";
    const key = raw.length > 0 ? raw : NO_LOCATION_SENTINEL;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  const entries = [...map.entries()].sort(([ka], [kb]) => {
    if (ka === NO_LOCATION_SENTINEL) return 1;
    if (kb === NO_LOCATION_SENTINEL) return -1;
    return ka.localeCompare(kb, undefined, { sensitivity: "base", numeric: true });
  });

  return entries.map(([key, items]) => ({
    label: key === NO_LOCATION_SENTINEL ? "No location" : key,
    items: [...items].sort((x, y) =>
      (y.scanned_at ?? "").localeCompare(x.scanned_at ?? "")
    ),
  }));
}

function ScannedItemRow({
  asset,
  busy,
  onRequestUndo,
  showLocation = true,
}: {
  asset: Asset;
  busy: boolean;
  onRequestUndo: () => void;
  showLocation?: boolean;
}) {
  const locationText = asset.location?.trim();

  return (
    <li className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 ring-1 ring-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-foreground">{asset.computer_name}</p>
          {showLocation ? (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0 mt-0.5 text-amber-500/90" aria-hidden />
              <span>{locationText && locationText.length > 0 ? locationText : "—"}</span>
            </div>
          ) : null}
        </div>
      </div>
      <p className={cn("text-xs text-muted-foreground", showLocation ? "mt-2" : "mt-1")}>
        By <span className="font-medium text-foreground">{asset.scanned_by ?? "—"}</span>
        {" · "}
        <span className="tabular-nums">{formatTs(asset.scanned_at)}</span>
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        aria-busy={busy}
        onClick={() => {
          if (!busy) onRequestUndo();
        }}
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

type ListMode = "recent" | "by_location";

/** Full list of scanned rows with undo → back to pending queue. */
export function ScannedItemsSection({
  assets,
  unscanningId,
  onUnscan,
}: ScannedItemsSectionProps) {
  const [listMode, setListMode] = useState<ListMode>("recent");
  const [undoTarget, setUndoTarget] = useState<Asset | null>(null);

  const locationGroups = useMemo(
    () => (listMode === "by_location" ? groupAssetsByLocation(assets) : null),
    [assets, listMode]
  );

  return (
    <>
      <UndoScanAlert
        asset={undoTarget}
        busy={undoTarget !== null && unscanningId === undoTarget.id}
        onDismiss={() => setUndoTarget(null)}
        onConfirmReturn={() => {
          if (!undoTarget) return;
          void onUnscan(undoTarget);
          setUndoTarget(null);
        }}
      />
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
        <div
          role="radiogroup"
          aria-label="How to list scanned rows"
          className="mt-3 flex rounded-2xl border border-border bg-background/60 p-1 shadow-inner shadow-black/20"
        >
          <button
            type="button"
            role="radio"
            aria-checked={listMode === "recent"}
            className={cn(
              "min-h-[2.75rem] flex-1 rounded-xl px-3 text-xs font-semibold uppercase tracking-wide transition-colors",
              listMode === "recent"
                ? "bg-card text-foreground shadow-sm ring-1 ring-white/10"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setListMode("recent")}
          >
            Recent
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={listMode === "by_location"}
            className={cn(
              "min-h-[2.75rem] flex-1 rounded-xl px-3 text-xs font-semibold uppercase tracking-wide transition-colors",
              listMode === "by_location"
                ? "bg-card text-foreground shadow-sm ring-1 ring-white/10"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setListMode("by_location")}
          >
            By location
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        {listMode === "recent" ? (
          <ul className="flex max-h-[min(70vh,32rem)] flex-col gap-3 overflow-y-auto pr-1 sm:max-h-[min(75vh,40rem)]">
            {assets.map((asset) => (
              <ScannedItemRow
                key={asset.id}
                asset={asset}
                busy={unscanningId === asset.id}
                onRequestUndo={() => setUndoTarget(asset)}
                showLocation
              />
            ))}
          </ul>
        ) : (
          <div className="flex max-h-[min(70vh,32rem)] flex-col gap-2 overflow-y-auto pr-1 sm:max-h-[min(75vh,40rem)]">
            {locationGroups?.map((group) => (
              <details
                key={group.label}
                className="rounded-2xl border border-border/80 bg-background/40 [&[open]_summary_.chevron-ic]:rotate-180"
                open
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left marker:content-none hover:bg-accent/30 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <MapPinIcon
                      className="size-4 shrink-0 text-amber-500/90"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate font-medium text-sm text-foreground">
                      {group.label}
                    </span>
                  </span>
                  <span className="tabular-nums text-xs font-semibold text-muted-foreground">
                    {group.items.length}
                  </span>
                  <ChevronDownIcon
                    className="chevron-ic size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                    aria-hidden
                  />
                </summary>
                <ul className="flex flex-col gap-3 px-2 pb-2 pt-1">
                  {group.items.map((asset) => (
                    <ScannedItemRow
                      key={asset.id}
                      asset={asset}
                      busy={unscanningId === asset.id}
                      onRequestUndo={() => setUndoTarget(asset)}
                      showLocation={false}
                    />
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
    </>
  );
}
