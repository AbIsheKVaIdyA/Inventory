"use client";

import {
  ArrowLeftIcon,
  CheckCheckIcon,
  Loader2Icon,
  PackagePlus,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";



import {
  INVENTORY_STATUS_DISCOVERED_ON_SCAN,
  INVENTORY_STATUS_NOT_FOUND,
  getInventoryItemsSelectColumns,
  inventoryItemFromRecord,
  inventoryItemToAsset,
  inventoryStatusAfterUndoScan,
  mergeInventoryRow,
  sortInventoryRows,
  type InventoryItemRow,
} from "@/lib/inventory-map";
import {
  LOCATION_FILTER_ALL,
  LOCATION_FILTER_UNSET,
  assetMatchesLocationFilter,
  buildLocationFilterOptions,
  distinctLocationPickerOptionsFromRows,
} from "@/lib/location-filter";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";
import { fetchAllInventoryItemRows } from "@/lib/supabase/fetch-all-inventory-items";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/asset";

import { AssetRow } from "@/components/AssetRow";
import { CelebrationToast } from "@/components/CelebrationToast";
import {
  AddDiscoveredSystemDialog,
  type DiscoveredSystemPayload,
} from "@/components/AddDiscoveredSystemDialog";
import { DownloadButton } from "@/components/DownloadButton";
import { FinishLocationAlert } from "@/components/FinishLocationAlert";
import { Header } from "@/components/Header";
import { LocationFilterBar } from "@/components/LocationFilterBar";
import { ScannedItemsSection } from "@/components/ScannedItemsSection";

type AssetTableProps = {
  scannerEmail: string;
  scannerDisplayName: string;
  onSignOut: () => Promise<void>;
};

export function AssetTable({
  scannerEmail,
  scannerDisplayName,
  onSignOut,
}: AssetTableProps) {
  const [inventoryRows, setInventoryRows] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [realtimeIssue, setRealtimeIssue] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notFoundId, setNotFoundId] = useState<string | null>(null);
  const [discoveredDialogOpen, setDiscoveredDialogOpen] = useState(false);
  const [discoveredFormKey, setDiscoveredFormKey] = useState(0);
  const [discoveredSaving, setDiscoveredSaving] = useState(false);
  const [unscanningId, setUnscanningId] = useState<string | null>(null);
  const [bulkScanning, setBulkScanning] = useState(false);
  const [bulkUnscanning, setBulkUnscanning] = useState(false);
  const [showFinishLocationAlert, setShowFinishLocationAlert] = useState(false);
  const [showReturnLocationAlert, setShowReturnLocationAlert] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("Location complete!");
  const [toastMessage, setToastMessage] = useState("");
  const rollbackRef = useRef<InventoryItemRow | null>(null);
  const notFoundRollbackRef = useRef<InventoryItemRow | null>(null);
  const unscanRollbackRef = useRef<InventoryItemRow | null>(null);
  const userRef = useRef(scannerEmail);
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

  /** Scanned + not-found rows (out of the pending queue); shown in Done view */
  const resolvedAssets = useMemo(() => {
    const list = assets.filter(
      (a) => a.status === "scanned" || a.status === "not_found"
    );
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

  const discoveredLocationOptions = useMemo(
    () => distinctLocationPickerOptionsFromRows(inventoryRows),
    [inventoryRows]
  );

  const preferredLocationForDiscovered = useMemo(() => {
    if (locationFilter === LOCATION_FILTER_ALL) return null;
    if (locationFilter === LOCATION_FILTER_UNSET) return "";
    return locationFilter;
  }, [locationFilter]);

  const filteredPendingAssets = useMemo(
    () =>
      pendingAssets.filter((a) =>
        assetMatchesLocationFilter(a, locationFilter)
      ),
    [pendingAssets, locationFilter]
  );

  const filteredResolvedAssets = useMemo(
    () =>
      resolvedAssets.filter((a) =>
        assetMatchesLocationFilter(a, locationFilter)
      ),
    [resolvedAssets, locationFilter]
  );

  const locationFilterActive = locationFilter !== LOCATION_FILTER_ALL;

  const filteredPendingCount = filteredPendingAssets.length;
  const selectedLocationLabel = useMemo(() => {
    if (locationFilter === LOCATION_FILTER_ALL) return "All locations";
    if (locationFilter === LOCATION_FILTER_UNSET) return "(No location set)";
    const found = locationFilterOptions.find((opt) => opt.value === locationFilter);
    return found?.label ?? locationFilter;
  }, [locationFilter, locationFilterOptions]);

  const counts = useMemo(() => {
    const scanned = inventoryRows.filter((r) => r.scan_status === "scanned").length;
    const notFound = inventoryRows.filter((r) => r.scan_status === "not_found").length;
    const pending = inventoryRows.filter((r) => r.scan_status === "pending").length;
    return {
      total: inventoryRows.length,
      scanned,
      notFound,
      resolved: scanned + notFound,
      pending,
    };
  }, [inventoryRows]);

  const canOpenScannedView = filteredResolvedAssets.length > 0;
  const doneTileTitle =
    canOpenScannedView
      ? "Open scanned-only list — use Undo scan to return rows to the queue"
      : locationFilterActive && counts.resolved > 0
        ? "No completed rows at this location. Clear the filter to see items elsewhere."
        : "Nothing completed yet";

  useEffect(() => {
    if (!toastOpen) return;
    const id = window.setTimeout(() => setToastOpen(false), 2600);
    return () => window.clearTimeout(id);
  }, [toastOpen]);

  const openScannedView = useCallback(() => {
    if (!canOpenScannedView) return;
    setInventoryView("scanned");
    queueMicrotask(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [canOpenScannedView]);

  useEffect(() => {
    if (inventoryView !== "scanned") return;
    if (loading) return;
    if (counts.total === 0 || counts.resolved === 0) {
      queueMicrotask(() => setInventoryView("queue"));
    }
  }, [inventoryView, counts.total, counts.resolved, loading]);

  useEffect(() => {
    userRef.current = scannerEmail;
  }, [scannerEmail]);

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
      if (!userNow || asset.status !== "pending") return;

      const nowIso = new Date().toISOString();

      setMutationError(null);

      setInventoryRows((curr) => {
        const prevRow = curr.find((r) => r.id === asset.id);
        if (!prevRow || prevRow.scan_status !== "pending") return curr;
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

  const handleNotFound = useCallback(async (asset: Asset) => {
    const userNow = userRef.current;
    if (!userNow || asset.status !== "pending") return;

    const nowIso = new Date().toISOString();

    setMutationError(null);

    setInventoryRows((curr) => {
      const prevRow = curr.find((r) => r.id === asset.id);
      if (!prevRow || prevRow.scan_status !== "pending") return curr;
      notFoundRollbackRef.current = { ...prevRow };
      return sortInventoryRows(
        curr.map((r) =>
          r.id === asset.id
            ? {
                ...r,
                scan_status: "not_found",
                inventory_status: INVENTORY_STATUS_NOT_FOUND,
                scanned_by: userNow,
                scanned_at: nowIso,
              }
            : r
        )
      );
    });

    setNotFoundId(asset.id);

    try {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb
        .from("inventory_items")
        .update({
          scan_status: "not_found",
          inventory_status: INVENTORY_STATUS_NOT_FOUND,
          scanned_by: userNow,
          scanned_at: nowIso,
        })
        .eq("id", asset.id);
      if (error) throw error;

      notFoundRollbackRef.current = null;
    } catch (e) {
      const prevRow = notFoundRollbackRef.current;
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
      setNotFoundId(null);
    }
  }, []);

  const handleInsertDiscoveredSystem = useCallback(
    async (payload: DiscoveredSystemPayload) => {
      const userNow = userRef.current;
      if (!userNow) return;

      const serial_id = payload.serial_id.trim();
      if (!serial_id) return;
      const locationNorm = payload.location.trim() || null;
      const manufacturerNorm = payload.manufacturer.trim() || null;
      const modelNorm = payload.model.trim() || null;
      const nowIso = new Date().toISOString();

      setMutationError(null);
      setDiscoveredSaving(true);

      try {
        const sb = getSupabaseBrowserClient();
        const insertRow = {
          serial_id,
          location: locationNorm,
          manufacturer: manufacturerNorm,
          model: modelNorm,
          scan_status: "scanned" as const,
          scanned_by: userNow,
          scanned_at: nowIso,
          inventory_status: INVENTORY_STATUS_DISCOVERED_ON_SCAN,
        };
        const { data, error } = await sb
          .from("inventory_items")
          .insert(insertRow)
          .select(getInventoryItemsSelectColumns())
          .single();
        if (error) throw error;
        if (!data || typeof data !== "object") {
          throw new Error("No row returned after insert.");
        }

        const row = inventoryItemFromRecord(data as unknown as Record<string, unknown>);
        if (!row) throw new Error("Could not read new row from database.");

        setInventoryRows((curr) => {
          if (curr.some((r) => r.id === row.id)) return sortInventoryRows(curr);
          return sortInventoryRows([...curr, row]);
        });
        setDiscoveredDialogOpen(false);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not add row — try again.";
        setMutationError(msg);
      } finally {
        setDiscoveredSaving(false);
      }
    },
    []
  );

  const handleUnscan = useCallback(async (asset: Asset) => {
    if (asset.status !== "scanned" && asset.status !== "not_found") return;

    setMutationError(null);

    setInventoryRows((curr) => {
      const prevRow = curr.find((r) => r.id === asset.id);
      if (
        !prevRow ||
        (prevRow.scan_status !== "scanned" && prevRow.scan_status !== "not_found")
      ) {
        return curr;
      }
      unscanRollbackRef.current = { ...prevRow };
      const nextInventoryStatus = inventoryStatusAfterUndoScan(prevRow);
      return sortInventoryRows(
        curr.map((r) =>
          r.id === asset.id
            ? {
                ...r,
                scan_status: "pending",
                scanned_by: null,
                scanned_at: null,
                inventory_status: nextInventoryStatus,
              }
            : r
        )
      );
    });

    setUnscanningId(asset.id);

    try {
      const sb = getSupabaseBrowserClient();
      const prevRow = unscanRollbackRef.current;
      const patch =
        prevRow?.scan_status === "not_found"
          ? {
              scan_status: "pending" as const,
              scanned_by: null as null,
              scanned_at: null as null,
              inventory_status: null as null,
            }
          : prevRow?.inventory_status === INVENTORY_STATUS_DISCOVERED_ON_SCAN
            ? {
                scan_status: "pending" as const,
                scanned_by: null as null,
                scanned_at: null as null,
                inventory_status: null as null,
              }
            : {
                scan_status: "pending" as const,
                scanned_by: null as null,
                scanned_at: null as null,
              };
      const { error } = await sb.from("inventory_items").update(patch).eq("id", asset.id);
      if (error) throw error;

      unscanRollbackRef.current = null;
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

  const handleFinishLocation = useCallback(async () => {
    if (!locationFilterActive || filteredPendingAssets.length === 0 || bulkScanning) return;

    const userNow = userRef.current;
    if (!userNow) return;

    const targetIds = filteredPendingAssets.map((asset) => asset.id);
    const targetSet = new Set(targetIds);
    const nowIso = new Date().toISOString();
    const prevRows = inventoryRows
      .filter((row) => targetSet.has(row.id))
      .map((row) => ({ ...row }));
    const prevById = new Map(prevRows.map((r) => [r.id, r] as const));

    setBulkScanning(true);
    setMutationError(null);
    setShowFinishLocationAlert(false);

    setInventoryRows((curr) =>
      sortInventoryRows(
        curr.map((r) =>
          targetSet.has(r.id)
            ? {
                ...r,
                scan_status: "scanned",
                scanned_by: userNow,
                scanned_at: nowIso,
              }
            : r
        )
      )
    );

    try {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb
        .from("inventory_items")
        .update({
          scan_status: "scanned",
          scanned_by: userNow,
          scanned_at: nowIso,
        })
        .in("id", targetIds);
      if (error) throw error;

      setToastMessage(
        `Woohoo! Marked ${targetIds.length} system(s) scanned for ${selectedLocationLabel}.`
      );
      setToastTitle("Location complete!");
      setToastOpen(true);
    } catch (e) {
      setInventoryRows((curr) =>
        sortInventoryRows(curr.map((r) => (targetSet.has(r.id) ? prevById.get(r.id) ?? r : r)))
      );
      const msg =
        e instanceof Error
          ? e.message
          : "Could not finish this location right now. Please try again.";
      setMutationError(msg);
    } finally {
      setBulkScanning(false);
    }
  }, [
    bulkScanning,
    filteredPendingAssets,
    inventoryRows,
    locationFilterActive,
    selectedLocationLabel,
  ]);

  const handleReturnLocationToQueue = useCallback(async () => {
    if (!locationFilterActive || filteredResolvedAssets.length === 0 || bulkUnscanning) return;

    const targetIds = filteredResolvedAssets.map((asset) => asset.id);
    const targetSet = new Set(targetIds);
    const prevRows = inventoryRows
      .filter((row) => targetSet.has(row.id))
      .map((row) => ({ ...row }));
    const prevById = new Map(prevRows.map((r) => [r.id, r] as const));

    setBulkUnscanning(true);
    setMutationError(null);
    setShowReturnLocationAlert(false);

    setInventoryRows((curr) =>
      sortInventoryRows(
        curr.map((r) => {
          if (!targetSet.has(r.id)) return r;
          const prev = prevById.get(r.id)!;
          return {
            ...r,
            scan_status: "pending",
            scanned_by: null,
            scanned_at: null,
            inventory_status: inventoryStatusAfterUndoScan(prev),
          };
        })
      )
    );

    try {
      const sb = getSupabaseBrowserClient();
      const results = await Promise.all(
        targetIds.map((id) => {
          const prev = prevById.get(id)!;
          const patch =
            prev.scan_status === "not_found"
              ? {
                  scan_status: "pending" as const,
                  scanned_by: null as null,
                  scanned_at: null as null,
                  inventory_status: null as null,
                }
              : prev.inventory_status === INVENTORY_STATUS_DISCOVERED_ON_SCAN
                ? {
                    scan_status: "pending" as const,
                    scanned_by: null as null,
                    scanned_at: null as null,
                    inventory_status: null as null,
                  }
                : {
                    scan_status: "pending" as const,
                    scanned_by: null as null,
                    scanned_at: null as null,
                  };
          return sb.from("inventory_items").update(patch).eq("id", id);
        })
      );
      for (const res of results) {
        if (res.error) throw res.error;
      }

      setToastTitle("Location reopened");
      setToastMessage(
        `Returned ${targetIds.length} system(s) to queue for ${selectedLocationLabel}.`
      );
      setToastOpen(true);
    } catch (e) {
      setInventoryRows((curr) =>
        sortInventoryRows(curr.map((r) => (targetSet.has(r.id) ? prevById.get(r.id) ?? r : r)))
      );
      const msg =
        e instanceof Error
          ? e.message
          : "Could not return this location to queue right now. Please try again.";
      setMutationError(msg);
    } finally {
      setBulkUnscanning(false);
    }
  }, [
    bulkUnscanning,
    filteredResolvedAssets,
    inventoryRows,
    locationFilterActive,
    selectedLocationLabel,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FinishLocationAlert
        open={showFinishLocationAlert}
        busy={bulkScanning}
        locationLabel={selectedLocationLabel}
        affectedCount={filteredPendingAssets.length}
        mode="scan"
        onDismiss={() => setShowFinishLocationAlert(false)}
        onConfirm={() => void handleFinishLocation()}
      />
      <FinishLocationAlert
        open={showReturnLocationAlert}
        busy={bulkUnscanning}
        locationLabel={selectedLocationLabel}
        affectedCount={filteredResolvedAssets.length}
        mode="unscan"
        onDismiss={() => setShowReturnLocationAlert(false)}
        onConfirm={() => void handleReturnLocationToQueue()}
      />
      <CelebrationToast
        open={toastOpen}
        title={toastTitle}
        message={toastMessage}
      />
      <AddDiscoveredSystemDialog
        open={discoveredDialogOpen}
        busy={discoveredSaving}
        formMountKey={discoveredFormKey}
        locationOptions={discoveredLocationOptions}
        preferredLocation={preferredLocationForDiscovered}
        onDismiss={() => setDiscoveredDialogOpen(false)}
        onSave={(p) => void handleInsertDiscoveredSystem(p)}
      />
      <Header
        currentDisplayName={scannerDisplayName}
        sessionEmail={scannerEmail}
        onSignOut={() => void onSignOut()}
      />

      <main
        className={cn(
          "mx-auto flex min-h-0 w-full min-w-0 max-w-lg flex-1 flex-col gap-5 overflow-x-hidden px-4 pb-6 pt-5 max-[361px]:px-3",
          inventoryView === "scanned" &&
            "max-sm:pb-[calc(var(--site-footer-reserve)+4.75rem)]"
        )}
      >
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
          <div className="relative flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-center gap-2 rounded-2xl border-border bg-card/50 px-5 shadow-md shadow-black/20 touch-manipulation max-sm:fixed max-sm:inset-x-3 max-sm:bottom-[calc(var(--site-footer-reserve)+0.625rem)] max-sm:z-[45] max-sm:border max-sm:bg-background/92 max-sm:shadow-black/35 max-sm:backdrop-blur-xl sm:static sm:w-auto sm:self-start sm:justify-start motion-reduce:transition-none"
              onClick={() => setInventoryView("queue")}
              aria-label="Back to scanning queue"
            >
              <ArrowLeftIcon className="size-5 shrink-0 opacity-90" aria-hidden />
              Back to scanning
            </Button>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="tabular-nums font-semibold text-foreground">
                {filteredResolvedAssets.length}
              </span>{" "}
              completed (scanned or not found at location)
              {locationFilterActive ? (
                <>
                  {" "}
                  for this filter (
                  <span className="tabular-nums">{counts.resolved}</span> total completed in file).
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
            {locationFilterActive && filteredResolvedAssets.length > 0 ? (
              <Button
                type="button"
                onClick={() => setShowReturnLocationAlert(true)}
                disabled={bulkUnscanning || bulkScanning}
                className="h-12 min-h-12 w-full touch-manipulation gap-2 rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-950/45 hover:bg-orange-500"
              >
                {bulkUnscanning ? (
                  <>
                    <Loader2Icon className="size-5 animate-spin shrink-0" aria-hidden />
                    Returning location to queue…
                  </>
                ) : (
                  <>
                    <RotateCcwIcon className="size-5 shrink-0" aria-hidden />
                    Return this location to queue
                  </>
                )}
              </Button>
            ) : null}
            {filteredResolvedAssets.length === 0 ? (
              <section className="rounded-2xl border border-amber-500/35 bg-amber-950/35 px-4 py-5 text-center">
                <p className="text-sm font-medium text-amber-50">
                  No completed items match this location filter.
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
                assets={filteredResolvedAssets}
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
                aria-label={`Done: ${counts.resolved} completed (scanned + not found at location). ${doneTileTitle}`}
                onClick={() => openScannedView()}
                className="rounded-2xl border border-border bg-card/80 px-3 py-4 text-center shadow-md shadow-black/20 backdrop-blur-sm outline-offset-4 transition-colors enabled:cursor-pointer enabled:hover:bg-card enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:enabled:active:scale-100"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Done
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
                  {counts.resolved}
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
            {hasSupabaseConfig() && counts.total > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={discoveredSaving}
                aria-busy={discoveredSaving}
                onClick={() => {
                  setDiscoveredFormKey((k) => k + 1);
                  setDiscoveredDialogOpen(true);
                }}
                className="h-auto min-h-12 w-full touch-manipulation flex-col gap-1 rounded-2xl border-sky-500/40 bg-sky-950/25 px-4 py-3 text-sky-50 shadow-md shadow-black/15 hover:bg-sky-950/45"
              >
                <span className="flex items-center justify-center gap-2 text-base font-semibold">
                  {discoveredSaving ? (
                    <Loader2Icon className="size-5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <PackagePlus className="size-5 shrink-0 opacity-90" aria-hidden />
                  )}
                  Add system not on worksheet
                </span>
                <span className="text-center text-xs font-normal leading-snug text-sky-200/80">
                  For extra hardware you find on site: choose location, then serial / brand / model.
                </span>
              </Button>
            ) : null}
            {locationFilterActive && filteredPendingCount > 0 ? (
              <Button
                type="button"
                onClick={() => setShowFinishLocationAlert(true)}
                disabled={bulkScanning || bulkUnscanning}
                className="h-12 min-h-12 w-full touch-manipulation gap-2 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-950/50 hover:bg-emerald-500"
              >
                {bulkScanning ? (
                  <>
                    <Loader2Icon className="size-5 animate-spin shrink-0" aria-hidden />
                    Finishing this location…
                  </>
                ) : (
                  <>
                    <CheckCheckIcon className="size-5 shrink-0" aria-hidden />
                    Finish scan for this location
                  </>
                )}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <DownloadButton fallbackRows={inventoryRows} className="min-w-0 basis-full sm:min-w-[8rem] sm:basis-auto" />
          {hasSupabaseConfig() && (
            <Button
              type="button"
              variant="outline"
              className="h-12 min-h-12 min-w-[3.25rem] flex-1 touch-manipulation rounded-2xl border-border bg-card/50 px-0 shadow-md shadow-black/20 sm:min-w-[3rem] sm:flex-none sm:px-4"
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
                      notFoundBusy={notFoundId === asset.id}
                      onScan={handleScan}
                      onNotFound={handleNotFound}
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
        resolvedAssets.length > 0 ? (
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-8 text-center shadow-inner">
            <p className="text-lg font-semibold text-emerald-100">Queue is clear</p>
            <p className="mt-2 text-sm text-emerald-200/80">
              Nothing left pending — items are scanned or marked not found at location. Tap{" "}
              <span className="font-semibold text-emerald-100">Done</span> to review — use Undo to
              return any row to the queue.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
