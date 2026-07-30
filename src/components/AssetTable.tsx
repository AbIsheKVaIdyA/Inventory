"use client";

import {
  ArrowLeftIcon,
  BarChart3Icon,
  CheckCheckIcon,
  CheckCircle2Icon,
  DoorOpenIcon,
  Loader2Icon,
  PackagePlus,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
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
import { textMatchesQuery } from "@/lib/inventory-search";
import { recordScanActivity, getDailyAnomalies } from "@/lib/scan-activity";
import { getLastAdd, saveLastAdd } from "@/lib/last-add";
import {
  isLocationDone,
  loadDoneRooms,
  markRoomDone,
  unmarkRoomDone,
  type DoneRoomRecord,
} from "@/lib/done-rooms";
import { recordCreatedRoom, findMatchingLocation } from "@/lib/location-rooms";
import {
  getMostRecentLocation,
  recordLocationVisit,
  suggestNextLocations,
} from "@/lib/scan-path";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";
import { fetchAllInventoryItemRows } from "@/lib/supabase/fetch-all-inventory-items";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/asset";

import { AssetRow } from "@/components/AssetRow";
import { InventoryAnalyticsView } from "@/components/InventoryAnalyticsView";
import { NewCreatedRoomsControl } from "@/components/NewCreatedRoomsControl";
import { DoneRoomsControl } from "@/components/DoneRoomsControl";
import { CelebrationToast } from "@/components/CelebrationToast";
import {
  AddDiscoveredSystemDialog,
  type DiscoveredSystemPayload,
} from "@/components/AddDiscoveredSystemDialog";
import { CreateAssignRoomDialog } from "@/components/CreateAssignRoomDialog";
import { DownloadButton } from "@/components/DownloadButton";
import { FinishLocationAlert } from "@/components/FinishLocationAlert";
import { Header } from "@/components/Header";
import { LocationFilterBar } from "@/components/LocationFilterBar";
import { ScannedItemsSection } from "@/components/ScannedItemsSection";
import { SerialLookupDialog } from "@/components/SerialLookupDialog";

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
  const [discoveredPrefillTag, setDiscoveredPrefillTag] = useState<string | null>(null);
  const [discoveredPrefillManufacturer, setDiscoveredPrefillManufacturer] = useState<
    string | null
  >(null);
  const [discoveredPrefillModel, setDiscoveredPrefillModel] = useState<string | null>(null);
  const [discoveredCloneMode, setDiscoveredCloneMode] = useState(false);
  const [discoveredLocationOverride, setDiscoveredLocationOverride] = useState<string | null>(
    null
  );
  const [discoveredSaving, setDiscoveredSaving] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomFormKey, setRoomFormKey] = useState(0);
  const [roomBusy, setRoomBusy] = useState(false);
  const [queueRoomSearch, setQueueRoomSearch] = useState("");
  const [lookupDraft, setLookupDraft] = useState("");
  const [findInitialQuery, setFindInitialQuery] = useState<string | null>(null);
  const [pathVersion, setPathVersion] = useState(0);
  const [activityVersion, setActivityVersion] = useState(0);
  const [roomsVersion, setRoomsVersion] = useState(0);
  const [doneRoomsVersion, setDoneRoomsVersion] = useState(0);
  const [doneRooms, setDoneRooms] = useState<DoneRoomRecord[]>([]);
  const [lastAddVersion, setLastAddVersion] = useState(0);
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [findDialogMountKey, setFindDialogMountKey] = useState(0);
  const [findLookupBusy, setFindLookupBusy] = useState(false);
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
  const lookupRollbackRef = useRef<InventoryItemRow | null>(null);
  const unscanRollbackRef = useRef<InventoryItemRow | null>(null);
  const userRef = useRef(scannerEmail);
  const [locationFilter, setLocationFilter] = useState<string>(LOCATION_FILTER_ALL);
  const [inventoryView, setInventoryView] = useState<"queue" | "scanned" | "analytics">(
    "queue"
  );

  const assets: Asset[] = useMemo(
    () => sortInventoryRows(inventoryRows).map((r) => inventoryItemToAsset(r)),
    [inventoryRows]
  );

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

  const locationFilterOptionsAll = useMemo(
    () => buildLocationFilterOptions(assets),
    [assets]
  );

  /** Pick a room / switch room: hide rooms marked done (keep current if already open). */
  const locationFilterOptions = useMemo(() => {
    const pending = locationFilterOptionsAll.filter((o) => {
      if (o.value === LOCATION_FILTER_UNSET) return true;
      return !isLocationDone(o.value, doneRooms);
    });
    if (
      locationFilter !== LOCATION_FILTER_ALL &&
      !pending.some((o) => o.value === locationFilter)
    ) {
      const cur = locationFilterOptionsAll.find((o) => o.value === locationFilter);
      if (cur) return [cur, ...pending];
    }
    return pending;
  }, [locationFilterOptionsAll, doneRooms, locationFilter]);

  useEffect(() => {
    let cancelled = false;
    void loadDoneRooms().then((list) => {
      if (!cancelled) setDoneRooms(list);
    });
    return () => {
      cancelled = true;
    };
  }, [doneRoomsVersion]);

  const discoveredLocationOptions = useMemo(
    () => distinctLocationPickerOptionsFromRows(inventoryRows),
    [inventoryRows]
  );

  const preferredLocationForDiscovered = useMemo(() => {
    if (discoveredLocationOverride !== null) return discoveredLocationOverride;
    if (locationFilter === LOCATION_FILTER_ALL) {
      void pathVersion;
      return getMostRecentLocation();
    }
    if (locationFilter === LOCATION_FILTER_UNSET) return "";
    return locationFilter;
  }, [discoveredLocationOverride, locationFilter, pathVersion]);

  const filteredPendingAssets = useMemo(
    () =>
      pendingAssets.filter((a) =>
        assetMatchesLocationFilter(a, locationFilter)
      ),
    [pendingAssets, locationFilter]
  );

  const roomQueueAssets = useMemo(() => {
    const q = queueRoomSearch.trim();
    if (!q) return filteredPendingAssets;
    return filteredPendingAssets.filter((a) => {
      const blob = [
        a.computer_name,
        a.serial_id,
        a.asset_id,
        a.manufacturer,
        a.model,
        a.location,
      ]
        .map((v) => v ?? "")
        .join(" ");
      return textMatchesQuery(blob, q);
    });
  }, [filteredPendingAssets, queueRoomSearch]);

  const setLocationFilterAndClearRoomSearch = useCallback((next: string) => {
    setQueueRoomSearch("");
    setLocationFilter(next);
    if (next !== LOCATION_FILTER_ALL && next !== LOCATION_FILTER_UNSET) {
      recordLocationVisit(next);
      setPathVersion((v) => v + 1);
    }
  }, []);

  const openLookUp = useCallback((prefill?: string) => {
    const q = (prefill ?? lookupDraft).trim();
    setFindInitialQuery(q.length > 0 ? q : null);
    setFindDialogMountKey((k) => k + 1);
    setFindDialogOpen(true);
  }, [lookupDraft]);

  const openAddNewFresh = useCallback(() => {
    setDiscoveredCloneMode(false);
    setDiscoveredPrefillTag(null);
    setDiscoveredPrefillManufacturer(null);
    setDiscoveredPrefillModel(null);
    setDiscoveredLocationOverride(null);
    setDiscoveredFormKey((k) => k + 1);
    setDiscoveredDialogOpen(true);
  }, []);

  const openCloneLastAdd = useCallback(() => {
    const last = getLastAdd();
    if (!last) return;
    setDiscoveredCloneMode(true);
    setDiscoveredPrefillTag(null);
    setDiscoveredPrefillManufacturer(last.manufacturer || null);
    setDiscoveredPrefillModel(last.model || null);
    setDiscoveredLocationOverride(last.location.trim() ? last.location : null);
    setDiscoveredFormKey((k) => k + 1);
    setDiscoveredDialogOpen(true);
  }, []);

  const canCloneLastAdd = useMemo(() => {
    void lastAddVersion;
    return getLastAdd() !== null;
  }, [lastAddVersion]);

  const nextRoomSuggestions = useMemo(() => {
    void pathVersion;
    const available = locationFilterOptions
      .map((o) => o.value)
      .filter((v) => v !== LOCATION_FILTER_ALL && v !== LOCATION_FILTER_UNSET && v.trim());
    const current =
      locationFilter === LOCATION_FILTER_ALL || locationFilter === LOCATION_FILTER_UNSET
        ? null
        : locationFilter;
    return suggestNextLocations(current, available, 3);
  }, [locationFilter, locationFilterOptions, pathVersion]);

  const filteredResolvedAssets = useMemo(
    () =>
      resolvedAssets.filter((a) =>
        assetMatchesLocationFilter(a, locationFilter)
      ),
    [resolvedAssets, locationFilter]
  );

  const locationFilterActive = locationFilter !== LOCATION_FILTER_ALL;

  const filteredPendingCount = filteredPendingAssets.length;

  const currentRoomIsDone =
    locationFilterActive &&
    locationFilter !== LOCATION_FILTER_UNSET &&
    isLocationDone(locationFilter, doneRooms);

  const handleMarkRoomDone = useCallback(() => {
    if (
      locationFilter === LOCATION_FILTER_ALL ||
      locationFilter === LOCATION_FILTER_UNSET
    ) {
      return;
    }
    markRoomDone(locationFilter, scannerEmail);
    setDoneRoomsVersion((v) => v + 1);
    setLocationFilterAndClearRoomSearch(LOCATION_FILTER_ALL);
    setToastTitle("Room done");
    setToastMessage(`${locationFilter} moved to Done rooms. It won’t show in Pick a room.`);
    setToastOpen(true);
  }, [locationFilter, scannerEmail, setLocationFilterAndClearRoomSearch]);

  const handleReopenRoom = useCallback(() => {
    if (
      locationFilter === LOCATION_FILTER_ALL ||
      locationFilter === LOCATION_FILTER_UNSET
    ) {
      return;
    }
    unmarkRoomDone(locationFilter);
    setDoneRoomsVersion((v) => v + 1);
    setToastTitle("Room reopened");
    setToastMessage(`${locationFilter} is back on Pick a room.`);
    setToastOpen(true);
  }, [locationFilter]);

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

  const openAnalyticsView = useCallback(() => {
    setInventoryView("analytics");
    queueMicrotask(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, []);

  const insightNoteCount = useMemo(() => {
    void activityVersion;
    return getDailyAnomalies().length;
  }, [activityVersion]);

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
        setLocationFilterAndClearRoomSearch(LOCATION_FILTER_ALL);
      });
    }
  }, [locationFilter, locationFilterOptions, setLocationFilterAndClearRoomSearch]);

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
        if (asset.location?.trim()) {
          recordLocationVisit(asset.location);
          setPathVersion((v) => v + 1);
        }
        recordScanActivity({ type: "scan", location: asset.location });
        setActivityVersion((v) => v + 1);
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
      recordScanActivity({ type: "not_found", location: asset.location });
      setActivityVersion((v) => v + 1);
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

      const serial_id = payload.serial_id.trim() || null;
      const locationNorm = payload.location.trim() || null;
      const manufacturerNorm = payload.manufacturer.trim() || null;
      const modelNorm = payload.model.trim() || null;
      const tagNorm = payload.tag_number.trim() || null;
      const nowIso = new Date().toISOString();

      setMutationError(null);
      setDiscoveredSaving(true);

      try {
        const sb = getSupabaseBrowserClient();
        const insertRow = {
          serial_id,
          tag_number: tagNorm,
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
        if (locationNorm) {
          recordLocationVisit(locationNorm);
          setPathVersion((v) => v + 1);
          const knownBefore = inventoryRows
            .map((r) => r.location?.trim() ?? "")
            .filter(Boolean);
          if (!findMatchingLocation(locationNorm, knownBefore)) {
            recordCreatedRoom(locationNorm, userNow);
            setRoomsVersion((v) => v + 1);
          }
        }
        recordScanActivity({ type: "add", location: locationNorm });
        setActivityVersion((v) => v + 1);
        saveLastAdd({
          location: locationNorm ?? "",
          manufacturer: manufacturerNorm ?? "",
          model: modelNorm ?? "",
        });
        setLastAddVersion((v) => v + 1);
        setDiscoveredDialogOpen(false);
        setDiscoveredPrefillTag(null);
        setDiscoveredPrefillManufacturer(null);
        setDiscoveredPrefillModel(null);
        setDiscoveredCloneMode(false);
        setDiscoveredLocationOverride(null);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not add row — try again.";
        setMutationError(msg);
      } finally {
        setDiscoveredSaving(false);
      }
    },
    [inventoryRows]
  );

  const handleMoveDevicesToRoom = useCallback(
    async (location: string, deviceIds: string[]) => {
      const loc = location.trim();
      if (!loc || deviceIds.length === 0) return;

      setMutationError(null);
      setRoomBusy(true);
      const prevById = new Map(
        inventoryRows.filter((r) => deviceIds.includes(r.id)).map((r) => [r.id, { ...r }])
      );

      setInventoryRows((curr) =>
        sortInventoryRows(
          curr.map((r) => (deviceIds.includes(r.id) ? { ...r, location: loc } : r))
        )
      );

      try {
        const sb = getSupabaseBrowserClient();
        const { error } = await sb
          .from("inventory_items")
          .update({ location: loc })
          .in("id", deviceIds);
        if (error) throw error;

        setRoomDialogOpen(false);
        setLocationFilterAndClearRoomSearch(loc);
        setToastTitle("Room assigned");
        setToastMessage(
          `Moved ${deviceIds.length} device${deviceIds.length === 1 ? "" : "s"} to ${loc}.`
        );
        setToastOpen(true);
        queueMicrotask(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      } catch (e) {
        setInventoryRows((curr) =>
          sortInventoryRows(
            curr.map((r) => (prevById.has(r.id) ? prevById.get(r.id)! : r))
          )
        );
        const msg =
          e instanceof Error ? e.message : "Could not update locations — try again.";
        setMutationError(msg);
      } finally {
        setRoomBusy(false);
      }
    },
    [inventoryRows, setLocationFilterAndClearRoomSearch]
  );

  const handleLookupConfirm = useCallback(async (rowId: string, locationResolved: string) => {
    const userNow = userRef.current;
    if (!userNow) return;

    const locationNorm = locationResolved.trim() || null;
    const nowIso = new Date().toISOString();

    setMutationError(null);
    setFindLookupBusy(true);

    setInventoryRows((curr) => {
      const prev = curr.find((r) => r.id === rowId);
      if (!prev) return curr;
      lookupRollbackRef.current = { ...prev };

      if (prev.scan_status === "scanned") {
        return sortInventoryRows(
          curr.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  location: locationNorm,
                  scanned_by: userNow,
                  scanned_at: nowIso,
                }
              : r
          )
        );
      }

      return sortInventoryRows(
        curr.map((r) =>
          r.id === rowId
            ? {
                ...r,
                location: locationNorm,
                scan_status: "scanned",
                scanned_by: userNow,
                scanned_at: nowIso,
                inventory_status:
                  prev.scan_status === "not_found" ? null : prev.inventory_status ?? null,
              }
            : r
        )
      );
    });

    try {
      const sb = getSupabaseBrowserClient();
      const prev = lookupRollbackRef.current;
      if (!prev) throw new Error("Missing row.");

      let patch: Record<string, unknown>;
      if (prev.scan_status === "scanned") {
        patch = {
          location: locationNorm,
          scanned_by: userNow,
          scanned_at: nowIso,
        };
      } else {
        patch = {
          location: locationNorm,
          scan_status: "scanned",
          scanned_by: userNow,
          scanned_at: nowIso,
        };
        if (prev.scan_status === "not_found") {
          patch.inventory_status = null;
        }
      }

      const { error } = await sb.from("inventory_items").update(patch).eq("id", rowId);
      if (error) throw error;

      lookupRollbackRef.current = null;
      setFindDialogOpen(false);
      recordLocationVisit(locationNorm);
      setPathVersion((v) => v + 1);
      const prevLoc = prev.location?.trim() || null;
      if (prevLoc && locationNorm && prevLoc !== locationNorm) {
        recordScanActivity({
          type: "relocate",
          location: locationNorm,
          fromLocation: prevLoc,
        });
      } else {
        recordScanActivity({ type: "scan", location: locationNorm });
      }
      setActivityVersion((v) => v + 1);
      setToastTitle("Saved");
      setToastMessage("Location updated and row marked scanned.");
      setToastOpen(true);
    } catch (e) {
      const rb = lookupRollbackRef.current;
      if (rb) {
        setInventoryRows((curr) =>
          sortInventoryRows(curr.map((r) => (r.id === rowId ? rb : r)))
        );
      }
      setMutationError(e instanceof Error ? e.message : "Update failed — try again.");
    } finally {
      setFindLookupBusy(false);
    }
  }, []);

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

      const locForActivity =
        locationFilter === LOCATION_FILTER_UNSET
          ? null
          : locationFilter === LOCATION_FILTER_ALL
            ? null
            : locationFilter;
      recordScanActivity({
        type: "scan",
        location: locForActivity,
        count: targetIds.length,
      });
      setActivityVersion((v) => v + 1);

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
    locationFilter,
    locationFilterActive,
    selectedLocationLabel,
  ]);

  const handleBulkNotFoundLocation = useCallback(async () => {
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
                scan_status: "not_found",
                inventory_status: INVENTORY_STATUS_NOT_FOUND,
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
          scan_status: "not_found",
          inventory_status: INVENTORY_STATUS_NOT_FOUND,
          scanned_by: userNow,
          scanned_at: nowIso,
        })
        .in("id", targetIds);
      if (error) throw error;

      const locForActivity =
        locationFilter === LOCATION_FILTER_UNSET || locationFilter === LOCATION_FILTER_ALL
          ? null
          : locationFilter;
      recordScanActivity({
        type: "not_found",
        location: locForActivity,
        count: targetIds.length,
      });
      setActivityVersion((v) => v + 1);

      setToastTitle("Marked not found");
      setToastMessage(
        `${targetIds.length} device(s) marked not found for ${selectedLocationLabel}.`
      );
      setToastOpen(true);
    } catch (e) {
      setInventoryRows((curr) =>
        sortInventoryRows(curr.map((r) => (targetSet.has(r.id) ? prevById.get(r.id) ?? r : r)))
      );
      const msg =
        e instanceof Error
          ? e.message
          : "Could not mark not found for this location. Please try again.";
      setMutationError(msg);
    } finally {
      setBulkScanning(false);
    }
  }, [
    bulkScanning,
    filteredPendingAssets,
    inventoryRows,
    locationFilter,
    locationFilterActive,
    selectedLocationLabel,
  ]);

  const handleLeaveRoomForLater = useCallback(() => {
    setShowFinishLocationAlert(false);
    setLocationFilterAndClearRoomSearch(LOCATION_FILTER_ALL);
    setToastTitle("Left for later");
    setToastMessage(
      `${filteredPendingCount} pending device(s) stay in queue for ${selectedLocationLabel}.`
    );
    setToastOpen(true);
    queueMicrotask(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [
    filteredPendingCount,
    selectedLocationLabel,
    setLocationFilterAndClearRoomSearch,
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
        onMarkNotFound={() => void handleBulkNotFoundLocation()}
        onLeaveForLater={handleLeaveRoomForLater}
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
      <SerialLookupDialog
        key={findDialogMountKey}
        open={findDialogOpen}
        busy={findLookupBusy}
        inventoryRows={inventoryRows}
        locationOptions={discoveredLocationOptions}
        preferredLocation={preferredLocationForDiscovered}
        initialQuery={findInitialQuery}
        onDismiss={() => {
          setFindDialogOpen(false);
          setFindInitialQuery(null);
        }}
        onConfirmMatch={(id, loc) => void handleLookupConfirm(id, loc)}
        onRequestManualAdd={(prefill) => {
          setDiscoveredCloneMode(false);
          setDiscoveredPrefillTag(prefill.length > 0 ? prefill : null);
          setDiscoveredPrefillManufacturer(null);
          setDiscoveredPrefillModel(null);
          setDiscoveredLocationOverride(null);
          setDiscoveredFormKey((k) => k + 1);
          setDiscoveredDialogOpen(true);
        }}
      />
      <AddDiscoveredSystemDialog
        open={discoveredDialogOpen}
        busy={discoveredSaving}
        formMountKey={discoveredFormKey}
        locationOptions={discoveredLocationOptions}
        preferredLocation={preferredLocationForDiscovered}
        initialTagNumber={discoveredPrefillTag}
        initialManufacturer={discoveredPrefillManufacturer}
        initialModel={discoveredPrefillModel}
        cloneMode={discoveredCloneMode}
        onDismiss={() => {
          setDiscoveredPrefillTag(null);
          setDiscoveredPrefillManufacturer(null);
          setDiscoveredPrefillModel(null);
          setDiscoveredCloneMode(false);
          setDiscoveredLocationOverride(null);
          setDiscoveredDialogOpen(false);
        }}
        onSave={(p) => void handleInsertDiscoveredSystem(p)}
      />
      <CreateAssignRoomDialog
        open={roomDialogOpen}
        busy={roomBusy}
        formMountKey={roomFormKey}
        inventoryRows={inventoryRows}
        onDismiss={() => setRoomDialogOpen(false)}
        onMoveDevices={(loc, ids) => void handleMoveDevicesToRoom(loc, ids)}
        onAddNewInRoom={(loc) => {
          setRoomDialogOpen(false);
          setDiscoveredPrefillTag(null);
          setDiscoveredLocationOverride(loc);
          setFindInitialQuery(null);
          setFindDialogMountKey((k) => k + 1);
          setFindDialogOpen(true);
        }}
        onUseRoomOnly={(loc) => {
          setRoomDialogOpen(false);
          setLocationFilterAndClearRoomSearch(loc);
          setToastTitle("Room ready");
          setToastMessage(`Filter set to ${loc}. Add or scan devices there.`);
          setToastOpen(true);
          queueMicrotask(() => window.scrollTo({ top: 0, behavior: "smooth" }));
        }}
        onRoomCreated={(loc) => {
          recordCreatedRoom(loc);
          setRoomsVersion((v) => v + 1);
        }}
      />
      <Header
        currentDisplayName={scannerDisplayName}
        sessionEmail={scannerEmail}
        onSignOut={() => void onSignOut()}
      />

      <main
        className={cn(
          "mx-auto flex min-h-0 w-full min-w-0 max-w-lg flex-1 flex-col gap-4 overflow-x-hidden px-4 pb-6 pt-5 max-[361px]:px-3 md:max-w-3xl lg:max-w-7xl lg:gap-4 lg:px-6",
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

        {!loading && !loadError && counts.total > 0 && inventoryView === "analytics" ? (
          <InventoryAnalyticsView
            inventoryRows={inventoryRows}
            activityVersion={activityVersion}
            onBack={() => setInventoryView("queue")}
          />
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
              onChange={setLocationFilterAndClearRoomSearch}
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
                  onClick={() => setLocationFilterAndClearRoomSearch(LOCATION_FILTER_ALL)}
                >
                  Show all locations
                </Button>
              </section>
            ) : locationFilterActive ? (
              <ScannedItemsSection
                assets={filteredResolvedAssets}
                unscanningId={unscanningId}
                onUnscan={handleUnscan}
              />
            ) : (
              <section className="rounded-2xl border border-border bg-muted/30 px-4 py-5 text-center shadow-inner ring-1 ring-white/[0.04]">
                <p className="text-sm font-medium text-foreground">
                  {counts.resolved} completed across every site
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  The full list is hidden while <span className="font-medium text-foreground">All locations</span>{" "}
                  is selected so this page stays short. Choose a site in the filter above to review and
                  undo scans for that place only.
                </p>
              </section>
            )}
          </div>
        ) : null}

        {!loading && counts.total > 0 && inventoryView === "queue" ? (
          <div className="flex flex-col gap-4">
            {/* Counts — big on every screen; on PC they sit in a row with Done / In file */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
              <section
                aria-live="polite"
                className="rounded-3xl border border-primary/35 bg-gradient-to-b from-primary/20 to-primary/5 px-5 py-5 text-center shadow-lg shadow-black/30 ring-1 ring-primary/25 sm:col-span-2 lg:col-span-1 lg:py-6"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  {locationFilterActive ? "Left in this room" : "Left to scan (all rooms)"}
                </p>
                <p className="mt-2 text-5xl font-bold tabular-nums leading-none text-foreground sm:text-6xl">
                  {locationFilterActive ? filteredPendingCount : counts.pending}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {locationFilterActive ? (
                    <>
                      Still pending in{" "}
                      <span className="font-semibold text-foreground">{selectedLocationLabel}</span>.
                    </>
                  ) : (
                    <>Pick a room to open its list, or start from Look up.</>
                  )}
                </p>
              </section>

              <button
                type="button"
                disabled={!canOpenScannedView}
                title={doneTileTitle}
                aria-label={`Done: ${counts.resolved} completed. ${doneTileTitle}`}
                onClick={() => openScannedView()}
                className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/80 px-3 py-4 text-center shadow-md shadow-black/20 backdrop-blur-sm outline-offset-4 transition-colors enabled:cursor-pointer enabled:hover:bg-card enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:enabled:active:scale-100"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Done
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-400 lg:text-4xl">
                  {counts.resolved}
                </p>
              </button>

              {locationFilterActive ? (
                <button
                  type="button"
                  title="Clear location filter — overview for all sites"
                  aria-label={`In file: ${counts.total} total rows. Clear location filter.`}
                  onClick={() => {
                    setLocationFilterAndClearRoomSearch(LOCATION_FILTER_ALL);
                    queueMicrotask(() => window.scrollTo({ top: 0, behavior: "smooth" }));
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/80 px-3 py-4 text-center shadow-md shadow-black/20 backdrop-blur-sm outline-offset-4 transition-colors cursor-pointer hover:bg-card active:scale-[0.98] touch-manipulation motion-reduce:active:scale-100"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    In file
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-foreground lg:text-4xl">
                    {counts.total}
                  </p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">clear room filter</p>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/80 px-3 py-4 text-center shadow-md shadow-black/20 backdrop-blur-sm">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    In file
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-foreground lg:text-4xl">
                    {counts.total}
                  </p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">total rows</p>
                </div>
              )}
            </div>

            {/* Look up first — primary work surface */}
            {hasSupabaseConfig() ? (
              <section
                aria-labelledby="lookup-heading"
                className={cn(
                  "rounded-2xl border border-teal-400/40 bg-gradient-to-br from-teal-950/70 via-cyan-950/40 to-card/80 p-3.5 shadow-lg shadow-teal-950/25 ring-1 ring-teal-400/15 sm:p-4",
                  (discoveredSaving || findLookupBusy || roomBusy) && "pointer-events-none opacity-70"
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
                  <div className="min-w-0 flex-1">
                    <h2
                      id="lookup-heading"
                      className="text-sm font-semibold tracking-tight text-teal-50"
                    >
                      Look up
                    </h2>
                    <p className="mt-0.5 text-xs text-teal-200/75">
                      Tag → match or add new.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        value={lookupDraft}
                        onChange={(e) => setLookupDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            openLookUp();
                          }
                        }}
                        placeholder="Tag number…"
                        className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background/90 px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Button
                        type="button"
                        disabled={discoveredSaving || findLookupBusy || roomBusy}
                        aria-busy={findLookupBusy}
                        onClick={() => openLookUp()}
                        className="h-11 shrink-0 gap-2 rounded-xl bg-teal-600 px-4 font-semibold text-white hover:bg-teal-500"
                      >
                        {findLookupBusy ? (
                          <Loader2Icon className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <SearchIcon className="size-4" aria-hidden />
                        )}
                        Search
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:w-[28rem] lg:shrink-0 lg:grid-cols-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={discoveredSaving || findLookupBusy || roomBusy}
                      onClick={openAddNewFresh}
                      className="h-11 gap-1.5 rounded-xl border-cyan-400/35 bg-cyan-950/25 text-cyan-50"
                    >
                      <PackagePlus className="size-4 shrink-0" aria-hidden />
                      Add new
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        discoveredSaving || findLookupBusy || roomBusy || !canCloneLastAdd
                      }
                      title={
                        canCloneLastAdd
                          ? "Reuse last brand, model, and room — enter a new tag"
                          : "Add a device once to enable clone"
                      }
                      onClick={openCloneLastAdd}
                      className="h-11 gap-1.5 rounded-xl border-amber-400/35 bg-amber-950/25 text-amber-50 disabled:opacity-40"
                    >
                      Clone last
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={discoveredSaving || findLookupBusy || roomBusy}
                      onClick={() => {
                        setRoomFormKey((k) => k + 1);
                        setRoomDialogOpen(true);
                      }}
                      className="h-11 gap-1.5 rounded-xl border-violet-400/35 bg-violet-950/25 text-violet-50"
                    >
                      <DoorOpenIcon className="size-4 shrink-0" aria-hidden />
                      Room
                    </Button>
                    {locationFilterActive && filteredPendingCount > 0 ? (
                      <Button
                        type="button"
                        onClick={() => setShowFinishLocationAlert(true)}
                        disabled={bulkScanning || bulkUnscanning}
                        className="h-11 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        {bulkScanning ? (
                          <Loader2Icon className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckCheckIcon className="size-4 shrink-0" aria-hidden />
                        )}
                        Finish room
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canOpenScannedView}
                        onClick={() => openScannedView()}
                        className="h-11 rounded-xl border-border bg-card/50"
                      >
                        View done
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-end border-t border-teal-400/15 pt-2">
                  <button
                    type="button"
                    onClick={openAnalyticsView}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-teal-200/70 transition-colors hover:bg-teal-950/40 hover:text-teal-50"
                  >
                    <BarChart3Icon className="size-3.5 opacity-80" aria-hidden />
                    Analytics
                    {insightNoteCount > 0 ? (
                      <span className="rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[0.6rem] font-semibold tabular-nums text-amber-100">
                        {insightNoteCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </section>
            ) : null}

            <NewCreatedRoomsControl
              roomsVersion={roomsVersion}
              inventoryRows={inventoryRows}
              onSelectRoom={(loc) => setLocationFilterAndClearRoomSearch(loc)}
              className="mt-3"
            />
            <DoneRoomsControl
              roomsVersion={doneRoomsVersion}
              onOpenRoom={(loc) => setLocationFilterAndClearRoomSearch(loc)}
              onChanged={() => setDoneRoomsVersion((v) => v + 1)}
              className="mt-2"
            />

            {/* PC: room tools + list side by side */}
            <div
              className={cn(
                "flex flex-col gap-4",
                "lg:grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-5"
              )}
            >
              <div className="flex flex-col gap-3">
                <LocationFilterBar
                  value={locationFilter}
                  onChange={setLocationFilterAndClearRoomSearch}
                  options={locationFilterOptions}
                />

                {locationFilterActive && locationFilter !== LOCATION_FILTER_UNSET ? (
                  currentRoomIsDone ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReopenRoom}
                      className="h-11 w-full gap-2 rounded-xl border-emerald-400/40 bg-emerald-950/30 text-emerald-50"
                    >
                      <RotateCcwIcon className="size-4 shrink-0" aria-hidden />
                      Reopen room
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleMarkRoomDone}
                      className="h-11 w-full gap-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-600"
                    >
                      <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />
                      Room done
                    </Button>
                  )
                ) : null}

                {nextRoomSuggestions.length > 0 ? (
                  <section aria-label="Suggested next rooms" className="flex flex-col gap-2">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Likely next
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nextRoomSuggestions.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocationFilterAndClearRoomSearch(loc)}
                          className="h-9 max-w-full truncate rounded-xl border border-border bg-card/70 px-3 text-sm font-medium text-foreground touch-manipulation hover:border-primary/40 hover:bg-primary/10"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div className="hidden gap-2 lg:flex lg:flex-col">
                  <DownloadButton
                    fallbackRows={inventoryRows}
                    className="w-full"
                  />
                  {hasSupabaseConfig() ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full rounded-xl"
                      disabled={loading}
                      onClick={() => void reload()}
                    >
                      <RefreshCwIcon className="size-4 shrink-0 opacity-90" aria-hidden />
                      Refresh
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                {locationFilterActive ? (
                  <>
                    {pendingAssets.length > 0 && filteredPendingAssets.length === 0 ? (
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
                          className="mx-auto mt-4 h-11 rounded-xl border-amber-500/35 text-amber-50"
                          onClick={() => setLocationFilterAndClearRoomSearch(LOCATION_FILTER_ALL)}
                        >
                          Show all locations
                        </Button>
                      </section>
                    ) : null}

                    {filteredPendingAssets.length > 0 ? (
                      <section className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                              To scan in this room
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {queueRoomSearch.trim()
                                ? `${roomQueueAssets.length} match${roomQueueAssets.length === 1 ? "" : "es"}`
                                : `${filteredPendingAssets.length} device${filteredPendingAssets.length === 1 ? "" : "s"} · ${selectedLocationLabel}`}
                            </p>
                          </div>
                          <label className="relative block w-full sm:max-w-xs">
                            <SearchIcon
                              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                              aria-hidden
                            />
                            <input
                              type="search"
                              enterKeyHint="search"
                              autoComplete="off"
                              value={queueRoomSearch}
                              onChange={(e) => setQueueRoomSearch(e.target.value)}
                              placeholder="Search in this room…"
                              className="h-10 w-full rounded-xl border border-border bg-card/80 pl-9 pr-3 text-sm shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            />
                          </label>
                        </div>
                        {roomQueueAssets.length === 0 ? (
                          <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
                            No devices in this room match that search.
                          </p>
                        ) : (
                          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {roomQueueAssets.map((asset) => (
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
                        )}
                      </section>
                    ) : null}
                  </>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground lg:py-10">
                    Select a room on the left to see its devices here — or keep scanning from Look up.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 lg:hidden">
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
        ) : null}

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
