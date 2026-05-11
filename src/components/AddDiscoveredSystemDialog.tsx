"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Loader2Icon, PackagePlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import type { LocationPickerOption } from "@/lib/location-filter";

const SEL_PICK = "__pick__";
const SEL_OTHER = "__other__";

export type DiscoveredSystemPayload = {
  serial_id: string;
  /** Resolved location string; empty means store as null in DB */
  location: string;
  manufacturer: string;
  model: string;
};

type AddDiscoveredSystemDialogProps = {
  open: boolean;
  busy: boolean;
  /** Bump when opening so the form remounts with fresh defaults */
  formMountKey: number;
  locationOptions: LocationPickerOption[];
  /** From active location filter: `null` = no preference, `""` = unset / no location on file */
  preferredLocation: string | null;
  /** Prefill serial when opening from “find on worksheet” with no match */
  initialSerial?: string | null;
  onDismiss: () => void;
  onSave: (payload: DiscoveredSystemPayload) => void;
};

function deriveInitialSelect(
  preferred: string | null,
  opts: LocationPickerOption[]
): { select: string; custom: string } {
  if (preferred === null) return { select: SEL_PICK, custom: "" };
  if (opts.some((o) => o.value === preferred)) return { select: preferred, custom: "" };
  return { select: SEL_OTHER, custom: preferred };
}

function trimOrEmpty(s: string) {
  return s.trim();
}

type FormProps = {
  busy: boolean;
  locationOptions: LocationPickerOption[];
  preferredLocation: string | null;
  initialSerial?: string | null;
  onSave: (payload: DiscoveredSystemPayload) => void;
};

function AddDiscoveredSystemForm({
  busy,
  locationOptions,
  preferredLocation,
  initialSerial,
  onSave,
}: FormProps) {
  const initial = deriveInitialSelect(preferredLocation, locationOptions);
  const [locationSelect, setLocationSelect] = useState(initial.select);
  const [locationCustom, setLocationCustom] = useState(initial.custom);
  const [serialId, setSerialId] = useState(() => (initialSerial?.trim() ? initialSerial.trim() : ""));
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();

    let resolvedLocation = "";
    if (locationSelect === SEL_PICK) {
      setFormError("Choose a location from the list, or pick “Other location”.");
      return;
    }
    if (locationSelect === SEL_OTHER) {
      resolvedLocation = trimOrEmpty(locationCustom);
      if (!resolvedLocation) {
        setFormError("Type the location when you choose “Other location”.");
        return;
      }
    } else {
      resolvedLocation = locationSelect;
    }

    const sid = trimOrEmpty(serialId);
    if (!sid) {
      setFormError("Enter a serial / service tag (or the code on the sticker).");
      return;
    }

    setFormError(null);
    onSave({
      serial_id: sid,
      location: resolvedLocation,
      manufacturer: trimOrEmpty(manufacturer),
      model: trimOrEmpty(model),
    });
  }

  return (
    <>
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-cyan-950/55 text-cyan-100 ring-1 ring-cyan-500/40">
        <PackagePlus className="size-6" aria-hidden />
      </div>
      <AlertDialog.Title className="text-center text-lg font-semibold tracking-tight text-foreground">
        Add equipment not on the worksheet
      </AlertDialog.Title>
      <AlertDialog.Description className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
        Use when you find hardware that is not on the import list. This creates a new worksheet row,
        sets the location you choose, and records serial / brand / model. It is saved as scanned.
      </AlertDialog.Description>

      <form className="mt-5 flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
        {formError ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-sm text-red-100"
          >
            {formError}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Location <span className="text-red-300">*</span>
          </span>
          <select
            value={locationSelect}
            disabled={busy}
            onChange={(e) => setLocationSelect(e.target.value)}
            className="min-h-[3rem] w-full rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
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
              enterKeyHint="next"
              autoComplete="off"
              disabled={busy}
              value={locationCustom}
              onChange={(e) => setLocationCustom(e.target.value)}
              className="min-h-[3rem] w-full rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Room, site, or area"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Serial / service tag <span className="text-red-300">*</span>
          </span>
          <input
            type="text"
            enterKeyHint="next"
            autoComplete="off"
            required
            disabled={busy}
            value={serialId}
            onChange={(e) => setSerialId(e.target.value)}
            className="min-h-[3rem] w-full rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Sticker code or serial"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Brand (manufacturer)
          </span>
          <input
            type="text"
            enterKeyHint="next"
            autoComplete="organization"
            disabled={busy}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="min-h-[3rem] w-full rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. Dell, HP, Lenovo"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            System type (model)
          </span>
          <input
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            disabled={busy}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="min-h-[3rem] w-full rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. Latitude 5540"
          />
        </label>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          <AlertDialog.Close
            type="button"
            disabled={busy}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "touch-manipulation h-12 min-h-12 rounded-2xl border-border shadow-sm shadow-black/20"
            )}
          >
            Cancel
          </AlertDialog.Close>
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            aria-busy={busy}
            className="touch-manipulation h-12 min-h-12 gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 font-semibold text-white shadow-md shadow-teal-950/35 ring-1 ring-white/10 hover:from-cyan-500 hover:to-teal-500"
          >
            {busy ? (
              <>
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Add to worksheet"
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

export function AddDiscoveredSystemDialog({
  open,
  busy,
  formMountKey,
  locationOptions,
  preferredLocation,
  initialSerial,
  onDismiss,
  onSave,
}: AddDiscoveredSystemDialogProps) {
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
              <AddDiscoveredSystemForm
                key={`${formMountKey}-${initialSerial ?? ""}`}
                busy={busy}
                locationOptions={locationOptions}
                preferredLocation={preferredLocation}
                initialSerial={initialSerial}
                onSave={onSave}
              />
            ) : null}
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
