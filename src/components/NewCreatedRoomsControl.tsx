"use client";

import { ChevronDownIcon, DoorOpenIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { InventoryItemRow } from "@/lib/inventory-map";
import {
  loadCreatedRooms,
  normalizeLocationKey,
  type CreatedRoomRecord,
} from "@/lib/location-rooms";

import { cn } from "@/lib/utils";

type NewCreatedRoomsControlProps = {
  /** Bump when rooms are created so the list refreshes. */
  roomsVersion: number;
  inventoryRows: InventoryItemRow[];
  onSelectRoom: (locationValue: string) => void;
  className?: string;
};

/** Count of all created rooms (history) + click to expand full list. */
export function NewCreatedRoomsControl({
  roomsVersion,
  inventoryRows,
  onSelectRoom,
  className,
}: NewCreatedRoomsControlProps) {
  const [open, setOpen] = useState(false);
  const [createdRooms, setCreatedRooms] = useState<CreatedRoomRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadCreatedRooms(inventoryRows).then((list) => {
      if (cancelled) return;
      setCreatedRooms(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [roomsVersion, inventoryRows]);

  const count = createdRooms.length;

  const deviceCountByRoom = (() => {
    const map = new Map<string, number>();
    for (const r of inventoryRows) {
      const loc = r.location?.trim() ?? "";
      if (!loc) continue;
      const key = normalizeLocationKey(loc);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  })();

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-11 w-full items-center gap-2 rounded-2xl border border-violet-400/35 bg-violet-950/30 px-3 text-left text-sm font-semibold text-violet-50 transition-colors hover:bg-violet-950/50"
      >
        <DoorOpenIcon className="size-4 shrink-0 opacity-90" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Newly created rooms</span>
        <span className="rounded-lg bg-violet-500/30 px-2 py-0.5 text-xs font-bold tabular-nums text-violet-100">
          {loading ? "…" : count}
        </span>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 opacity-80 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-2 rounded-2xl border border-violet-400/25 bg-violet-950/20 p-2 shadow-inner">
          {loading && count === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Loading…</p>
          ) : count === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              None yet — create a room and it will show here permanently.
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {createdRooms.map((r) => {
                const devices = deviceCountByRoom.get(normalizeLocationKey(r.name)) ?? 0;
                const showDate = Boolean(r.at && !r.at.startsWith("1970-"));
                return (
                  <li key={normalizeLocationKey(r.name)}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRoom(r.name);
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-violet-950/50"
                    >
                      <span className="min-w-0 truncate font-medium text-violet-50">{r.name}</span>
                      <span className="shrink-0 text-[0.65rem] tabular-nums text-violet-200/80">
                        {devices > 0 ? `${devices} devices` : null}
                        {devices > 0 && showDate ? " · " : null}
                        {showDate ? new Date(r.at).toLocaleDateString() : null}
                        {!showDate && devices === 0 ? "new" : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
