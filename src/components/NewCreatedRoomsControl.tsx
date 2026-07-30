"use client";

import { ChevronDownIcon, DoorOpenIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { getCreatedRooms } from "@/lib/location-rooms";

import { cn } from "@/lib/utils";

type NewCreatedRoomsControlProps = {
  /** Bump when rooms are created so the count refreshes. */
  roomsVersion: number;
  onSelectRoom: (locationValue: string) => void;
  className?: string;
};

/** Count badge + click to expand list of rooms created in this browser. */
export function NewCreatedRoomsControl({
  roomsVersion,
  onSelectRoom,
  className,
}: NewCreatedRoomsControlProps) {
  const [open, setOpen] = useState(false);

  const createdRooms = useMemo(() => {
    void roomsVersion;
    return getCreatedRooms();
  }, [roomsVersion]);

  const count = createdRooms.length;

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
          {count}
        </span>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 opacity-80 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-2 rounded-2xl border border-violet-400/25 bg-violet-950/20 p-2 shadow-inner">
          {count === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              None yet — create a room and it will show here.
            </p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {createdRooms.map((r) => (
                <li key={`${r.name}-${r.at}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRoom(r.name);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-violet-950/50"
                  >
                    <span className="min-w-0 truncate font-medium text-violet-50">{r.name}</span>
                    <span className="shrink-0 text-[0.6rem] text-violet-200/70">
                      {new Date(r.at).toLocaleDateString()}
                    </span>
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
