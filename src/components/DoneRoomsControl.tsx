"use client";

import { CheckCircle2Icon, ChevronDownIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  loadDoneRooms,
  unmarkRoomDone,
  type DoneRoomRecord,
} from "@/lib/done-rooms";
import { normalizeLocationKey } from "@/lib/location-rooms";

import { cn } from "@/lib/utils";

type DoneRoomsControlProps = {
  roomsVersion: number;
  onOpenRoom: (locationValue: string) => void;
  onChanged: () => void;
  className?: string;
};

/** Done rooms count + list; reopen puts a room back on Pick a room. */
export function DoneRoomsControl({
  roomsVersion,
  onOpenRoom,
  onChanged,
  className,
}: DoneRoomsControlProps) {
  const [open, setOpen] = useState(false);
  const [doneRooms, setDoneRooms] = useState<DoneRoomRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadDoneRooms().then((list) => {
      if (cancelled) return;
      setDoneRooms(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [roomsVersion]);

  const count = doneRooms.length;

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-11 w-full items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-950/25 px-3 text-left text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-950/40"
      >
        <CheckCircle2Icon className="size-4 shrink-0 opacity-90" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Done rooms</span>
        <span className="rounded-lg bg-emerald-500/25 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-100">
          {loading ? "…" : count}
        </span>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 opacity-80 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-2 rounded-2xl border border-emerald-400/25 bg-emerald-950/15 p-2 shadow-inner">
          {loading && count === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Loading…</p>
          ) : count === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No rooms marked done yet. Use <span className="font-medium">Room done</span> while
              working in a room.
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {doneRooms.map((r) => (
                <li
                  key={normalizeLocationKey(r.name)}
                  className="flex items-center gap-1 rounded-xl hover:bg-emerald-950/40"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRoom(r.name);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm font-medium text-emerald-50"
                  >
                    {r.name}
                  </button>
                  <button
                    type="button"
                    title="Reopen — show in Pick a room again"
                    onClick={() => {
                      unmarkRoomDone(r.name);
                      onChanged();
                    }}
                    className="mr-1 flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[0.65rem] font-semibold text-emerald-200/90 hover:bg-emerald-900/50"
                  >
                    <RotateCcwIcon className="size-3.5" aria-hidden />
                    Reopen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
