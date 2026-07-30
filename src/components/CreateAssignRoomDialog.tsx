"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import {
  CheckIcon,
  DoorOpenIcon,
  Loader2Icon,
  MapPinPlusIcon,
  SearchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { displayLabelFromInventory, type InventoryItemRow } from "@/lib/inventory-map";
import {
  buildingChipsFromLocations,
  distinctLocationsFromRows,
  findMatchingLocation,
} from "@/lib/location-rooms";
import { cn } from "@/lib/utils";

const fieldClass =
  "min-h-[3rem] w-full rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type CreateAssignRoomDialogProps = {
  open: boolean;
  busy: boolean;
  formMountKey: number;
  inventoryRows: InventoryItemRow[];
  onDismiss: () => void;
  /** Update location for selected device ids, then focus filter on that room. */
  onMoveDevices: (location: string, deviceIds: string[]) => void;
  /** Close and open Look up (match or add new) with this room as preferred location. */
  onAddNewInRoom: (location: string) => void;
  /** Focus location filter on this room without moving devices. */
  onUseRoomOnly: (location: string) => void;
  /** Fired when operator introduces a room name that was not already on file. */
  onRoomCreated?: (location: string) => void;
};

function rowSearchBlob(row: InventoryItemRow): string {
  return [
    displayLabelFromInventory(row),
    row.serial_id,
    row.tag_number,
    row.asset_id,
    row.manufacturer,
    row.model,
    row.location,
  ]
    .map((v) => (v ?? "").toString().toLowerCase())
    .join(" ");
}

function CreateAssignRoomForm({
  busy,
  inventoryRows,
  onMoveDevices,
  onAddNewInRoom,
  onUseRoomOnly,
  onRoomCreated,
}: Omit<CreateAssignRoomDialogProps, "open" | "formMountKey" | "onDismiss">) {
  const [roomName, setRoomName] = useState("");
  const [step, setStep] = useState<"name" | "assign">("name");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [existingRoom, setExistingRoom] = useState<string | null>(null);

  const resolvedRoom = roomName.trim();

  const existingLocations = useMemo(
    () => distinctLocationsFromRows(inventoryRows),
    [inventoryRows]
  );

  const buildingChips = useMemo(
    () => buildingChipsFromLocations(existingLocations),
    [existingLocations]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...inventoryRows].sort((a, b) =>
      displayLabelFromInventory(a).localeCompare(displayLabelFromInventory(b))
    );
    if (q.length < 1) return list.slice(0, 80);
    return list.filter((r) => rowSearchBlob(r).includes(q)).slice(0, 80);
  }, [inventoryRows, query]);

  const applyBuildingChip = (building: string) => {
    setExistingRoom(null);
    setRoomName((prev) => {
      const t = prev.trim();
      if (!t) return `${building} `;
      // Strip any known ECS* prefix (longer first) before applying the chip.
      const replaced = t.replace(/^(?:ECSW|ECSN|ECSE|ECSS|ECS)\s*/i, "");
      return `${building} ${replaced}`.trimStart();
    });
  };

  const markCreatedIfNew = (loc: string) => {
    if (!findMatchingLocation(loc, existingLocations)) {
      onRoomCreated?.(loc);
    }
  };

  const goAssign = () => {
    if (!resolvedRoom) {
      setFormError("Enter a room name (same format as Location on the list).");
      return;
    }
    const match = findMatchingLocation(resolvedRoom, existingLocations);
    if (match) {
      setExistingRoom(match);
      setRoomName(match);
      setFormError(null);
      return;
    }
    setExistingRoom(null);
    setFormError(null);
    setStep("assign");
  };

  const toggleId = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveMoves = () => {
    if (!resolvedRoom) return;
    if (selected.size === 0) {
      setFormError("Select at least one device to move, or use another action below.");
      return;
    }
    setFormError(null);
    markCreatedIfNew(resolvedRoom);
    onMoveDevices(resolvedRoom, [...selected]);
  };

  return (
    <>
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-950/55 text-violet-100 ring-1 ring-violet-500/40">
        <DoorOpenIcon className="size-6" aria-hidden />
      </div>
      <AlertDialog.Title className="text-center text-lg font-semibold tracking-tight text-foreground">
        {step === "name" ? "Create or assign room" : "Put devices in this room"}
      </AlertDialog.Title>
      <AlertDialog.Description className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
        {step === "name"
          ? "Use the same building prefix as locations already on file. If the room exists, we’ll mark it."
          : `Room: ${resolvedRoom}. Tap devices to select, then move them here.`}
      </AlertDialog.Description>

      {formError ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-sm text-red-100"
        >
          {formError}
        </p>
      ) : null}

      {step === "name" ? (
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Buildings on file
            </p>
            {buildingChips.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Type the room as it appears on file (e.g. ECS 3.502).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {buildingChips.map((b) => (
                  <button
                    key={b}
                    type="button"
                    disabled={busy}
                    onClick={() => applyBuildingChip(b)}
                    className="h-10 rounded-xl border border-violet-400/35 bg-violet-950/40 px-3 text-sm font-semibold text-violet-50 touch-manipulation hover:bg-violet-950/60"
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Room name <span className="text-red-300">*</span>
            </span>
            <input
              type="text"
              enterKeyHint="done"
              autoComplete="off"
              disabled={busy}
              value={roomName}
              onChange={(e) => {
                setExistingRoom(null);
                setRoomName(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goAssign();
                }
              }}
              className={fieldClass}
              placeholder={
                buildingChips[0] ? `e.g. ${buildingChips[0]} 3.502` : "e.g. ECS 3.502"
              }
            />
            <span className="text-[0.7rem] leading-snug text-muted-foreground">
              Must match Location column spelling (chips use prefixes already in your file).
            </span>
          </label>

          {existingRoom ? (
            <div
              role="status"
              className="rounded-2xl border border-amber-500/40 bg-amber-950/35 px-4 py-3 text-sm"
            >
              <p className="font-semibold text-amber-50">Room already exists</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/85">
                On file as{" "}
                <span className="font-mono font-semibold text-amber-50">{existingRoom}</span>. Don’t
                create a duplicate — open it or assign devices to this name.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={busy}
                  className="h-11 w-full rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-500"
                  onClick={() => onUseRoomOnly(existingRoom)}
                >
                  Open existing room
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="h-11 w-full rounded-xl border-cyan-400/40 bg-cyan-950/30 text-cyan-50"
                  onClick={() => onAddNewInRoom(existingRoom)}
                >
                  <SearchIcon className="size-4 shrink-0" aria-hidden />
                  Look up / add in this room
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="h-11 w-full rounded-xl"
                  onClick={() => {
                    setExistingRoom(null);
                    setStep("assign");
                  }}
                >
                  Continue — move devices here
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <AlertDialog.Close
              type="button"
              disabled={busy}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "touch-manipulation h-12 min-h-12 rounded-2xl border-border"
              )}
            >
              Cancel
            </AlertDialog.Close>
            <Button
              type="button"
              size="lg"
              disabled={busy || Boolean(existingRoom)}
              className="touch-manipulation h-12 min-h-12 gap-2 rounded-2xl bg-violet-600 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              onClick={goAssign}
            >
              Continue
              <MapPinPlusIcon className="size-4 shrink-0 opacity-90" aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <label className="relative block">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              disabled={busy}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(fieldClass, "pl-10")}
              placeholder="Search serial, tag, asset ID…"
            />
          </label>

          <p className="text-xs text-muted-foreground">
            {selected.size} selected
            {query.trim() ? ` · showing matches` : ` · first ${matches.length} of roster`}
          </p>

          <ul className="max-h-[min(40vh,16rem)] overflow-y-auto overscroll-y-contain rounded-2xl border border-border bg-background/60">
            {matches.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No devices match.
              </li>
            ) : (
              matches.map((row) => {
                const id = row.id;
                const on = selected.has(id);
                const loc = row.location?.trim();
                return (
                  <li key={id} className="border-b border-border/60 last:border-b-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleId(id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-2.5 text-left touch-manipulation",
                        on ? "bg-violet-950/45" : "hover:bg-muted/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                          on
                            ? "border-violet-400 bg-violet-500 text-white"
                            : "border-border bg-background"
                        )}
                        aria-hidden
                      >
                        {on ? <CheckIcon className="size-3.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {displayLabelFromInventory(row)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {[row.serial_id, row.tag_number, loc ? `now: ${loc}` : "no location"]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <Button
            type="button"
            size="lg"
            disabled={busy || selected.size === 0}
            aria-busy={busy}
            className="touch-manipulation h-12 min-h-12 gap-2 rounded-2xl bg-violet-600 font-semibold text-white hover:bg-violet-500"
            onClick={saveMoves}
          >
            {busy ? (
              <>
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                Moving…
              </>
            ) : (
              <>Move {selected.size || ""} device{selected.size === 1 ? "" : "s"} here</>
            )}
          </Button>

          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              className="touch-manipulation h-12 min-h-12 gap-2 rounded-2xl border-cyan-400/40 bg-cyan-950/30 text-cyan-50 hover:bg-cyan-950/50"
              onClick={() => {
                markCreatedIfNew(resolvedRoom);
                onAddNewInRoom(resolvedRoom);
              }}
            >
              <SearchIcon className="size-4 shrink-0" aria-hidden />
              Look up / add in this room
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              className="touch-manipulation h-12 min-h-12 gap-2 rounded-2xl"
              onClick={() => {
                markCreatedIfNew(resolvedRoom);
                onUseRoomOnly(resolvedRoom);
              }}
            >
              <MapPinPlusIcon className="size-4 shrink-0 opacity-90" aria-hidden />
              Just use this room (filter)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={busy}
              className="touch-manipulation h-11 rounded-2xl"
              onClick={() => {
                setFormError(null);
                setExistingRoom(null);
                setStep("name");
              }}
            >
              Back to room name
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function CreateAssignRoomDialog({
  open,
  busy,
  formMountKey,
  inventoryRows,
  onDismiss,
  onMoveDevices,
  onAddNewInRoom,
  onUseRoomOnly,
  onRoomCreated,
}: CreateAssignRoomDialogProps) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          className={cn(
            "fixed inset-0 z-[100] bg-black/70 backdrop-blur-md",
            "transition-[opacity] duration-200 ease-out",
            "[&[data-starting-style]]:opacity-0 [&[data-ending-style]]:opacity-0"
          )}
        />
        <AlertDialog.Viewport className="fixed inset-0 z-[100] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-10 sm:items-center sm:p-4">
          <AlertDialog.Popup
            initialFocus={true}
            className={cn(
              "max-h-[min(88dvh,calc(100svh-2rem))] w-full max-w-[min(calc(100vw-1.5rem),24rem)] overflow-y-auto overscroll-y-contain rounded-3xl border border-border/90 bg-card/98 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/[0.08] backdrop-blur-xl sm:p-6",
              "transition-[opacity,transform] duration-200 ease-out sm:origin-center",
              "[&[data-starting-style]]:translate-y-3 [&[data-starting-style]]:scale-[0.96] [&[data-starting-style]]:opacity-0",
              "[&[data-ending-style]]:scale-[0.98] [&[data-ending-style]]:opacity-0"
            )}
          >
            {open ? (
              <CreateAssignRoomForm
                key={formMountKey}
                busy={busy}
                inventoryRows={inventoryRows}
                onMoveDevices={onMoveDevices}
                onAddNewInRoom={onAddNewInRoom}
                onUseRoomOnly={onUseRoomOnly}
                onRoomCreated={onRoomCreated}
              />
            ) : null}
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
