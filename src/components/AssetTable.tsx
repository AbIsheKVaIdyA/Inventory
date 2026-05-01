"use client";

import { ArrowLeftIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import type { StoredUserName } from "@/lib/constants";
import {
  inventoryItemFromRecord,
  inventoryItemToAsset,
  mergeInventoryRow,
  sortInventoryRows,
  type InventoryItemRow,
} from "@/lib/inventory-map";
import {
  LOCATION_FILTER_ALL,
  LOCATION_FILTER_UNSET,
  assetMatchesLocationFilter,
  buildLocationFilterOptions,
} from "@/lib/location-filter";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";
import { fetchAllInventoryItemRows } from "@/lib/supabase/fetch-all-inventory-items";
import type { Asset } from "@/types/asset";

import { AssetRow } from "@/components/AssetRow";
import { DownloadButton } from "@/components/DownloadButton";
import { Header } from "@/components/Header";
import { LocationFilterBar } from "@/components/LocationFilterBar";
import { ScannedItemsSection } from "@/components/ScannedItemsSection";

async function silentSheetsSync(rowsSnapshot: InventoryItemRow[]) {
  await fetch("/api/sync-to-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assets: rowsSnapshot.map((r) => inventoryItemToAsset(r)),
    }),
  });
}

type AssetTableProps = {
  selectedUser: StoredUserName | null;
  onSwitchUser: () => void;
};

export function AssetTable({ selectedUser, onSwitchUser }: AssetTableProps) {
  const [inventoryRows, setInventoryRows] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [realtimeIssue, setRealtimeIssue] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [unscanningId, setUnscanningId] = useState<string | null>(null);
  const rollbackRef = useRef<InventoryItemRow | null>(null);
  const unscanRollbackRef = useRef<InventoryItemRow | null>(null);
  const userRef = useRef(selectedUser);
  const [locationFilter, setLocationFilter] = useState<string>(LOCATION_FILTER_ALL);
  const [inventoryView, setInventoryView] = useState<"queue" | "scanned">("queue");

  const assets: Asset[] = useMemo(() => {
    const mapped = inventoryRows.map((r) => inventoryItemToAsset(r));
    return mapped.sort((a, b) =>
      a.computer_name.localeCompare(b.computer_name)
    );
  }, [inventoryRows]);

  const pendingAssets = useMemo(
    () => assets.filter((a) => a.status === "pending"),
    [assets]
  );

  const scannedAssets = useMemo(() => {
    const list = assets.filter((a) => a.status === "scanned");
    return [...list].sort((a, b) => {
      const ta = a.scanned_at ?? "";
      const tb = b.scanned_at ?? "";
      return tb.localeCompare(ta);
    });
  }, [assets]);

  const locationFilterOptions = useMemo(
    () => buildLocationFilterOptions(assets),
    [assets]
  );

  const filteredPendingAssets = useMemo(
    () =>
      pendingAssets.filter((a) =>
        assetMatchesLocationFilter(a, locationFilter)
      ),
    [pendingAssets, locationFilter]
  );

  const filteredScannedAssets = useMemo(
    () =>
      scannedAssets.filter((a) =>
        assetMatchesLocationFilter(a, locationFilter)
      ),
    [scannedAssets, locationFilter]
  );

  const locationFilterActive = locationFilter !== LOCATION_FILTER_ALL;

  const filteredPendingCount = filteredPendingAssets.length;

  const counts = useMemo(() => {
    const scanned = inventoryRows.filter((r) => r.scan_status === "scanned").length;
    return {
      total: inventoryRows.length,
      scanned,
      pending: inventoryRows.length - scanned,
    };
  }, [inventoryRows]);

  const canOpenScannedView = filteredScannedAssets.length > 0;
  const doneTileTitle =
    canOpenScannedView
      ? "Open scanned-only list — use Undo scan to return rows to the queue"
      : locationFilterActive && counts.scanned > 0
        ? "No scanned rows at this location. Clear the filter to see scanned items elsewhere."
        : "Nothing scanned yet";

  const openScannedView = useCallback(() => {
    if (!canOpenScannedView) return;
    setInventoryView("scanned");
    queueMicrotask(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [canOpenScannedView]);

  useEffect(() => {
    if (inventoryView !== "scanned") return;
    if (loading) return;
    if (counts.total === 0 || counts.scanned === 0) {
      queueMicrotask(() => setInventoryView("queue"));
    }
  }, [inventoryView, counts.total, counts.scanned, loading]);

  useEffect(() => {
    userRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    if (locationFilter === LOCATION_FILTER_ALL) return;
    const allowed = new Set(
      locationFilterOptions.map((o) => o.value)
    );
    const ok =
      locationFilter === LOCATION_FILTER_UNSET
        ? allowed.has(LOCATION_FILTER_UNSET)
        : allowed.has(locationFilter);
    if (!ok) {
      queueMicrotask(() => {
        setLocationFilter(LOCATION_FILTER_ALL);
      });
    }
  }, [locationFilter, locationFilterOptions]);

  const reload = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setLoadError(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (or Vercel env)."
      );
      setInventoryRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const sb = getSupabaseBrowserClient();
      const parsed = await fetchAllInventoryItemRows(sb);
      setInventoryRows(sortInventoryRows(parsed));
    } catch (e: unknown) {
      const pg = e as {
        message?: string;
        code?: string;
        details?: string;
      };
      const blob = [pg.message, pg.code, pg.details].filter(Boolean).join(" ");
      const hint404 =
        /404|could not find|schema cache|PGRST205|42P01/i.test(blob);

      const msg =
        e instanceof Error
          ? e.message
          : "Could not load inventory. Check your network.";
      const extra = hint404
        ? " Create the table inventory_items (migration 0002_inventory_sheet.sql) and import your CSV."
        : "";
      setLoadError(`${msg}${extra}`);
      setInventoryRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void reload();
    });
  }, [reload]);

  useEffect(() => {
    if (!hasSupabaseConfig()) return undefined;

    const sb = getSupabaseBrowserClient();

    const handle = (payload: {
      eventType: string;
      new: Record<string, unknown> | null;
      old: Record<string, unknown> | null;
    }) => {
      setInventoryRows((curr) => {
        const evt = payload.eventType;

        if (evt === "DELETE") {
          const oldId =
            payload.old && typeof payload.old.id === "string"
              ? payload.old.id
              : null;
          if (oldId) {
            return curr.filter((r) => r.id !== oldId);
          }
          return curr;
        }

        const id =
          payload.new?.id != null && typeof payload.new.id === "string"
            ? payload.new.id
            : null;

        if (!id) return curr;

        if (evt === "INSERT") {
          const row = inventoryItemFromRecord(payload.new ?? {});
          if (!row) return curr;
          if (curr.some((r) => r.id === id)) return curr;
          return sortInventoryRows([...curr, row]);
        }

        if (evt === "UPDATE") {
          const patched = inventoryItemFromRecord(payload.new ?? {});
          return sortInventoryRows(
            curr.map((r) => {
              if (r.id !== id) return r;
              if (patched) return patched;
              return mergeInventoryRow(r, payload.new ?? {});
            })
          );
        }

        return curr;
      });
    };

    const channel = sb
      .channel("inventory-items-realtime")
      .on(
        "postgres_changes",
        { schema: "public", table: "inventory_items", event: "*" },
        (payload) => handle(payload)
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeIssue(
            "Realtime paused — enable replication on inventory_items (Database → Replication)."
          );
        }
      });

    return () => {
      void sb.removeChannel(channel);
    };
  }, []);

  const handleScan = useCallback(
    async (asset: Asset) => {
      const userNow = userRef.current;
      if (!userNow || asset.status === "scanned") return;

      const nowIso = new Date().toISOString();

      setMutationError(null);

      setInventoryRows((curr) => {
        const prevRow = curr.find((r) => r.id === asset.id);
        if (!prevRow || prevRow.scan_status === "scanned") return curr;
        rollbackRef.current = { ...prevRow };
        return sortInventoryRows(
          curr.map((r) =>
            r.id === asset.id
              ? {
                  ...r,
                  scan_status: "scanned",
                  scanned_by: userNow,
                  scanned_at: nowIso,
                }
              : r
          )
        );
      });

      setPendingId(asset.id);

      try {
        const sb = getSupabaseBrowserClient();
        const { error } = await sb
          .from("inventory_items")
          .update({
            scan_status: "scanned",
            scanned_by: userNow,
            scanned_at: nowIso,
          })
          .eq("id", asset.id);
        if (error) throw error;

        rollbackRef.current = null;
        setInventoryRows((fresh) => {
          void silentSheetsSync(fresh);
          return fresh;
        });
      } catch (e) {
        const prevRow = rollbackRef.current;
        if (prevRow) {
          setInventoryRows((curr) =>
            sortInventoryRows(
              curr.map((r) => (r.id === asset.id ? prevRow : r))
            )
          );
        }
        const msg =
          e instanceof Error
            ? e.message
            : "Update failed — check network / Supabase.";
        setMutationError(msg);
      } finally {
        setPendingId(null);
      }
    },
    []
  );

  const handleUnscan = useCallback(async (asset: Asset) => {
    if (asset.status !== "scanned") return;

    setMutationError(null);

    setInventoryRows((curr) => {
      const prevRow = curr.find((r) => r.id === asset.id);
      if (!prevRow || prevRow.scan_status !== "scanned") return curr;
      unscanRollbackRef.current = { ...prevRow };
      return sortInventoryRows(
        curr.map((r) =>
          r.id === asset.id
            ? {
                ...r,
                scan_status: "pending",
                scanned_by: null,
                scanned_at: null,
              }
            : r
        )
      );
    });

    setUnscanningId(asset.id);

    try {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb
        .from("inventory_items")
        .update({
          scan_status: "pending",
          scanned_by: null,
          scanned_at: null,
        })
        .eq("id", asset.id);
      if (error) throw error;

      unscanRollbackRef.current = null;
      setInventoryRows((fresh) => {
        void silentSheetsSync(fresh);
        return fresh;
      });
    } catch (e) {
      const prevRow = unscanRollbackRef.current;
      if (prevRow) {
        setInventoryRows((curr) =>
          sortInventoryRows(
            curr.map((r) => (r.id === asset.id ? prevRow : r))
          )
        );
      }
      const msg =
        e instanceof Error ? e.message : "Could not undo scan — try again.";
      setMutationError(msg);
    } finally {
      setUnscanningId(null);
    }
  }, []);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Header currentUser={selectedUser} onSwitchUser={onSwitchUser} />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
        {mutationError ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-red-950/50 px-4 py-3.5 text-sm leading-snug text-red-100 backdrop-blur-sm"
          >
            {mutationError}
          </section>
        ) : null}
        {loadError ? (
          <section
            role="status"
            className="rounded-2xl border border-amber-500/35 bg-amber-950/40 px-4 py-3.5 text-sm leading-snug text-amber-50 backdrop-blur-sm"
          >
            {loadError}
          </section>
        ) : null}
        {realtimeIssue ? (
          <section
            role="status"
            className="rounded-2xl border border-amber-400/25 bg-amber-900/35 px-4 py-3.5 text-sm leading-snug text-amber-50 backdrop-blur-sm"
          >
            {realtimeIssue}
          </section>
        ) : null}

        {!loading && !loadError && counts.total > 0 && inventoryView === "scanned" ? (
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-center gap-2 rounded-2xl border-border bg-card/50 px-5 shadow-md shadow-black/20 sm:w-auto sm:justify-start"
              onClick={() => setInventoryView("queue")}
              aria-label="Back to scanning queue"
            >
              <ArrowLeftIcon className="size-5 shrink-0 opacity-90" aria-hidden />
              Back to scanning
            </Button>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="tabular-nums font-semibold text-foreground">
                {filteredScannedAssets.length}
              </span>{" "}
              scanned shown
              {locationFilterActive ? (
                <>
                  {" "}
                  for this filter (
                  <span className="tabular-nums">{counts.scanned}</span> total scanned in file).
                </>
              ) : (
                <> ({counts.total} rows in file).</>
              )}
            </p>
            <LocationFilterBar
              value={locationFilter}
              onChange={setLocationFilter}
              options={locationFilterOptions}
            />
            {filteredScannedAssets.length === 0 ? (
              <section className="rounded-2xl border border-amber-500/35 bg-amber-950/35 px-4 py-5 text-center">
                <p className="text-sm font-medium text-amber-50">
                  No scanned items match this location filter.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mx-auto mt-4 h-12 rounded-xl border-amber-500/35 text-amber-50"
                  onClick={() => setLocationFilter(LOCATION_FILTER_ALL)}
                >
                  Show all locations
                </Button>
              </section>
            ) : (
              <ScannedItemsSection
                assets={filteredScannedAssets}
                unscanningId={unscanningId}
                onUnscan={handleUnscan}
              />
            )}
          </div>
        ) : null}

        {!loading && counts.total > 0 && inventoryView === "queue" ? (
          <div className="flex flex-col gap-3">
            <section
              aria-live="polite"
              className="rounded-3xl border border-primary/35 bg-gradient-to-b from-primary/20 to-primary/5 px-5 py-6 text-center shadow-lg shadow-black/30 ring-1 ring-primary/25"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {locationFilterActive
                  ? "Pending at filtered location"
                  : "Left to scan (everywhere)"}
              </p>
              <p className="mt-2 text-5xl font-bold tabular-nums leading-none text-foreground sm:text-6xl">
                {locationFilterActive ? filteredPendingCount : counts.pending}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {locationFilterActive ? (
                  <>
                    Showing only rows whose Location matches your filter.&nbsp;
                    <span className="font-semibold text-foreground">
                      {counts.pending}
                    </span>{" "}
                    pending worldwide — drops as anyone scans anywhere.
                  </>
                ) : (
                  <>
                    Drops by 1 whenever someone taps Scanned — same tally for the whole team in real
                    time.&nbsp;
                    Use the location filter below to plan one site at a time.
                  </>
                )}
              </p>
            </section>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canOpenScannedView}
                title={doneTileTitle}
                aria-label={`Done: ${counts.scanned} scanned. ${doneTileTitle}`}
                onClick={() => openScannedView()}
                className="rounded-2xl border border-border bg-card/80 px-3 py-4 text-center shadow-md shadow-black/20 backdrop-blur-sm outline-offset-4 transition-colors enabled:cursor-pointer enabled:hover:bg-card enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:enabled:active:scale-100"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Done
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
                  {counts.scanned}
                </p>
              </button>
              <div className="rounded-2xl border border-border bg-card/80 px-3 py-4 text-center shadow-md shadow-black/20 backdrop-blur-sm">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  In file
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {counts.total}
                </p>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">total rows</p>
              </div>
            </div>
            <LocationFilterBar
              value={locationFilter}
              onChange={setLocationFilter}
              options={locationFilterOptions}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <DownloadButton fallbackRows={inventoryRows} className="min-w-[8rem]" />
          {hasSupabaseConfig() && (
            <Button
              type="button"
              variant="outline"
              className="h-12 min-h-12 min-w-[3.25rem] flex-1 rounded-2xl border-border bg-card/50 px-0 shadow-md shadow-black/20 sm:min-w-[3rem] sm:flex-none sm:px-4"
              disabled={loading}
              onClick={() => void reload()}
              aria-label={loading ? "Refreshing" : "Reload from database"}
            >
              {loading ? (
                <Loader2Icon className="size-5 animate-spin shrink-0" aria-hidden />
              ) : (
                <RefreshCwIcon className="size-5 shrink-0 opacity-90" aria-hidden />
              )}
            </Button>
          )}
        </div>

        {!loading && counts.total === 0 && !loadError ? (
          <p className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-6 text-center text-sm leading-relaxed text-muted-foreground">
            Nothing in the queue yet. Confirm the table{" "}
            <span className="font-mono text-foreground">inventory_items</span> exists and your CSV imported,
            then refresh.
          </p>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center gap-5 py-14">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/25 blur-xl" aria-hidden />
              <Loader2Icon
                className="relative size-12 animate-spin text-primary"
                aria-hidden
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Loading inventory…</span>
            <div className="flex w-full max-w-[14rem] flex-col gap-2">
              {[0.8, 0.6, 0.95].map((w, i) => (
                <div
                  key={i}
                  className="h-3 overflow-hidden rounded-full bg-muted ring-1 ring-white/[0.06]"
                  style={{ opacity: w }}
                  aria-hidden
                >
                  <div
                    className="h-full animate-pulse rounded-full bg-muted-foreground/15"
                    style={{ width: `${w * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {inventoryView === "queue" &&
            !loading &&
            pendingAssets.length > 0 &&
            filteredPendingAssets.length === 0 &&
            locationFilterActive ? (
              <section className="rounded-2xl border border-amber-500/35 bg-amber-950/35 px-4 py-5 text-center">
                <p className="text-sm font-medium text-amber-50">
                  No pending items match this location filter.
                </p>
                <p className="mt-2 text-xs text-amber-200/85">
                  {counts.pending > 0
                    ? `${counts.pending} item(s) pending at other locations — switch filter or choose All locations.`
                    : "Either change the filter or everything here is scanned."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mx-auto mt-4 h-12 rounded-xl border-amber-500/35 text-amber-50"
                  onClick={() => setLocationFilter(LOCATION_FILTER_ALL)}
                >
                  Show all locations
                </Button>
              </section>
            ) : null}

            {inventoryView === "queue" && !loading && filteredPendingAssets.length > 0 ? (
              <>
                <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  To scan
                  {locationFilterActive ? " (filtered)" : null}
                </h2>
                <ul className="flex flex-col gap-4">
                  {filteredPendingAssets.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      scanning={pendingId === asset.id}
                      onScan={handleScan}
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}

        {!loading &&
        !loadError &&
        inventoryView === "queue" &&
        counts.total > 0 &&
        pendingAssets.length === 0 &&
        scannedAssets.length > 0 ? (
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-8 text-center shadow-inner">
            <p className="text-lg font-semibold text-emerald-100">Queue is clear</p>
            <p className="mt-2 text-sm text-emerald-200/80">
              Everything still pending has been scanned. Tap{" "}
              <span className="font-semibold text-emerald-100">Done</span> to review scanned rows —
              use Undo scan to send any row back.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
