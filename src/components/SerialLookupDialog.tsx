"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { displayLabelFromInventory, type InventoryItemRow } from "@/lib/inventory-map";
import {
  inventorySearchMinQueryLength,
  searchInventoryWorksheetHits,
  type InventorySearchHit,
} from "@/lib/inventory-search";
import type { LocationPickerOption } from "@/lib/location-filter";

import { cn } from "@/lib/utils";

const SEL_PICK = "__pick__";
const SEL_OTHER = "__other__";

function trimOrEmpty(s: string) {
  return s.trim();
}

function statusLabel(scan: string): string {
  if (scan === "scanned") return "Scanned";
  if (scan === "not_found") return "Not found at location";
  return "Pending";
}

function deriveInitialSelect(
  preferred: string | null,
  opts: LocationPickerOption[]
): { select: string; custom: string } {
  if (preferred === null) return { select: SEL_PICK, custom: "" };
  if (opts.some((o) => o.value === preferred)) return { select: preferred, custom: "" };
  return { select: SEL_OTHER, custom: preferred };
}

type SerialLookupDialogProps = {
  open: boolean;
  busy: boolean;
  inventoryRows: InventoryItemRow[];
  locationOptions: LocationPickerOption[];
  preferredLocation: string | null;
  /** Prefill + auto-search when dialog opens from the Look up bar. */
  initialQuery?: string | null;
  onDismiss: () => void;
  onConfirmMatch: (rowId: string, location: string) => void | Promise<void>;
  /** When no worksheet row matches — parent opens manual add with this tag number prefilled */
  onRequestManualAdd: (prefillTagNumber: string) => void;
};

export function SerialLookupDialog({
  open,
  busy,
  inventoryRows,
  locationOptions,
  preferredLocation,
  initialQuery = null,
  onDismiss,
  onConfirmMatch,
  onRequestManualAdd,
}: SerialLookupDialogProps) {
  const seed = initialQuery?.trim() ?? "";
  const seededHits =
    seed.length >= inventorySearchMinQueryLength()
      ? searchInventoryWorksheetHits(inventoryRows, seed)
      : null;
  const seededLoc = deriveInitialSelect(preferredLocation, locationOptions);

  const [query, setQuery] = useState(seed);
  const [lastSearch, setLastSearch] = useState(seededHits ? seed : "");
  const [hits, setHits] = useState<InventorySearchHit[] | null>(seededHits);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationSelect, setLocationSelect] = useState(seededLoc.select);
  const [locationCustom, setLocationCustom] = useState(seededLoc.custom);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForClose() {
    setQuery("");
    setLastSearch("");
    setHits(null);
    setSelectedId(null);
    setLocationSelect(SEL_PICK);
    setLocationCustom("");
    setFormError(null);
  }

  function runSearch(override?: string) {
    setFormError(null);
    const q = trimOrEmpty(override ?? query);
    if (q.length < inventorySearchMinQueryLength()) {
      setFormError(
        `Enter at least ${inventorySearchMinQueryLength()} characters (tag number, serial, asset ID…).`
      );
      return;
    }
    setQuery(q);
    setLastSearch(q);
    setHits(searchInventoryWorksheetHits(inventoryRows, q));
    setSelectedId(null);
    const initial = deriveInitialSelect(preferredLocation, locationOptions);
    setLocationSelect(initial.select);
    setLocationCustom(initial.custom);
  }

  function resolveLocation(): { ok: true; value: string } | { ok: false; message: string } {
    if (locationSelect === SEL_PICK) {
      return { ok: false, message: "Choose where the equipment is now (or Other location)." };
    }
    if (locationSelect === SEL_OTHER) {
      const t = trimOrEmpty(locationCustom);
      if (!t) return { ok: false, message: "Type the location for “Other location”." };
      return { ok: true, value: t };
    }
    return { ok: true, value: locationSelect };
  }

  async function submitConfirm(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    const loc = resolveLocation();
    if (!loc.ok) {
      setFormError(loc.message);
      return;
    }
    setFormError(null);
    await onConfirmMatch(selectedId, loc.value);
  }

  function openManualAdd() {
    const prefill = trimOrEmpty(lastSearch) || trimOrEmpty(query);
    resetForClose();
    onDismiss();
    onRequestManualAdd(prefill);
  }

  const exactHits = hits?.filter((h) => !h.fuzzy) ?? [];
  const fuzzyHits = hits?.filter((h) => h.fuzzy) ?? [];
  const resultList = hits ?? [];

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetForClose();
          onDismiss();
        }
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
              "max-h-[min(90dvh,calc(100svh-1.5rem))] w-full max-w-[min(calc(100vw-1.25rem),28rem)] overflow-y-auto overscroll-y-contain rounded-3xl border border-border/90 bg-card/98 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/[0.08] backdrop-blur-xl sm:max-w-lg sm:p-6 lg:max-w-xl",
              "transition-[opacity,transform] duration-200 ease-out sm:origin-center",
              "[&[data-starting-style]]:translate-y-3 [&[data-starting-style]]:scale-[0.96] [&[data-starting-style]]:opacity-0",
              "[&[data-ending-style]]:scale-[0.98] [&[data-ending-style]]:opacity-0"
            )}
          >
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-teal-950/55 text-teal-100 ring-1 ring-teal-500/40">
              <SearchIcon className="size-5" aria-hidden />
            </div>
            <AlertDialog.Title className="text-center text-lg font-semibold tracking-tight text-foreground">
              Look up device
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              Start here: enter a tag number. Match it, or add it as new with the same number.
            </AlertDialog.Description>

            <div className="mt-4 flex flex-col gap-3">
              {formError ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-sm text-red-100"
                >
                  {formError}
                </p>
              ) : null}

              <div className="flex gap-2">
                <input
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  disabled={busy}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runSearch();
                    }
                  }}
                  placeholder="Tag number…"
                  className="min-h-12 min-w-0 flex-1 rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => runSearch()}
                  className="h-12 shrink-0 rounded-2xl bg-teal-600 px-4 font-semibold text-white hover:bg-teal-500"
                >
                  Search
                </Button>
              </div>

              {hits !== null ? (
                <>
                  {resultList.length === 0 ? (
                    <div className="rounded-2xl border border-amber-500/35 bg-amber-950/30 px-4 py-4 text-center">
                      <p className="text-sm font-medium text-amber-50">
                        No worksheet row matched{" "}
                        <span className="font-mono text-amber-100">“{lastSearch}”</span>.
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-amber-200/85">
                        If this is new equipment not on the import, add it — your search stays as the
                        tag number.
                      </p>
                      <Button
                        type="button"
                        className="mt-4 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 font-semibold text-white shadow-md ring-1 ring-white/10 hover:from-cyan-500 hover:to-teal-500"
                        onClick={() => openManualAdd()}
                      >
                        Add as new device
                      </Button>
                    </div>
                  ) : (
                    <>
                      {fuzzyHits.length > 0 && exactHits.length === 0 ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                          Close matches (typo-tolerant) — tap one
                        </p>
                      ) : (
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {resultList.length} match{resultList.length === 1 ? "" : "es"}
                          {fuzzyHits.length > 0 ? " · includes close matches" : ""} — tap one
                        </p>
                      )}
                      <ul className="max-h-48 space-y-2 overflow-y-auto pr-0.5 sm:max-h-56">
                        {resultList.map((h) => {
                          const r = h.row;
                          const label = displayLabelFromInventory(r);
                          const active = selectedId === r.id;
                          const serial = r.serial_id?.trim();
                          const assetId = r.asset_id?.trim();
                          const tag = r.tag_number?.trim();
                          const idLine = [
                            serial ? `Serial ${serial}` : null,
                            assetId ? `Asset ID ${assetId}` : null,
                            tag && tag !== label ? `Tag ${tag}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <li key={r.id}>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setSelectedId(r.id);
                                  setFormError(null);
                                }}
                                className={cn(
                                  "w-full rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                                  active
                                    ? "border-teal-500/60 bg-teal-950/45 ring-1 ring-teal-400/35"
                                    : "border-border bg-background/50 hover:bg-muted/50"
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-foreground">
                                    {label}
                                  </span>
                                  {h.fuzzy ? (
                                    <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-100">
                                      Close
                                    </span>
                                  ) : null}
                                </span>
                                {idLine ? (
                                  <span className="mt-0.5 block font-mono text-[0.65rem] leading-snug text-muted-foreground">
                                    {idLine}
                                  </span>
                                ) : null}
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Location on file:{" "}
                                  <span className="text-foreground">
                                    {r.location?.trim() ? r.location : "—"}
                                  </span>
                                  {" · "}
                                  <span
                                    className={cn(
                                      r.scan_status === "scanned" && "text-emerald-400",
                                      r.scan_status === "not_found" && "text-violet-300",
                                      r.scan_status === "pending" && "text-amber-200/90"
                                    )}
                                  >
                                    {statusLabel(r.scan_status)}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      {selectedId ? (
                        <form
                          className="mt-2 space-y-3 rounded-2xl border border-border/80 bg-muted/25 p-4"
                          onSubmit={(e) => void submitConfirm(e)}
                        >
                          <p className="text-xs font-bold uppercase tracking-wide text-teal-600 dark:text-teal-300">
                            Where is it now?
                          </p>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Location <span className="text-red-300">*</span>
                            </span>
                            <select
                              value={locationSelect}
                              disabled={busy}
                              onChange={(e) => setLocationSelect(e.target.value)}
                              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value={SEL_PICK}>Select location…</option>
                              {locationOptions.map((o) => (
                                <option
                                  key={o.value === "" ? "__loc_empty__" : o.value}
                                  value={o.value}
                                >
                                  {o.label}
                                </option>
                              ))}
                              <option value={SEL_OTHER}>Other location…</option>
                            </select>
                          </label>
                          {locationSelect === SEL_OTHER ? (
                            <label className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Type location <span className="text-red-300">*</span>
                              </span>
                              <input
                                type="text"
                                disabled={busy}
                                value={locationCustom}
                                onChange={(e) => setLocationCustom(e.target.value)}
                                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Room, site, or area"
                              />
                            </label>
                          ) : null}
                          <Button
                            type="submit"
                            disabled={busy}
                            aria-busy={busy}
                            className="h-12 w-full rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-500"
                          >
                            {busy ? (
                              <>
                                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                                Saving…
                              </>
                            ) : (
                              "Confirm location & mark scanned"
                            )}
                          </Button>
                        </form>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              <AlertDialog.Close
                type="button"
                disabled={busy}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full rounded-2xl"
                )}
              >
                Close
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
