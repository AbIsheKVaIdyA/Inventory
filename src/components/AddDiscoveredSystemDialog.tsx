"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Loader2Icon, PackagePlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  applyModelLine,
  applyModelNumber,
  MANUFACTURER_PRESETS,
  MODEL_LINE_PRESETS,
  MODEL_NUMBER_PRESETS,
} from "@/lib/device-presets";

import { cn } from "@/lib/utils";

import type { LocationPickerOption } from "@/lib/location-filter";

const SEL_PICK = "__pick__";
const SEL_OTHER = "__other__";

const fieldClass =
  "min-h-[3rem] w-full rounded-2xl border border-border bg-background/80 px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export type DiscoveredSystemPayload = {
  serial_id: string;
  tag_number: string;
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
  /** Prefill tag number when opening from Look up with no match */
  initialTagNumber?: string | null;
  /** Prefill brand when cloning last add */
  initialManufacturer?: string | null;
  /** Prefill model when cloning last add */
  initialModel?: string | null;
  /** Show clone hint in the form */
  cloneMode?: boolean;
  onDismiss: () => void;
  onSave: (payload: DiscoveredSystemPayload) => void;
};

function deriveInitialSelect(
  preferred: string | null,
  opts: LocationPickerOption[]
): { select: string; custom: string } {
  if (preferred === null) return { select: SEL_PICK, custom: "" };
  if (preferred === "") {
    const empty = opts.find((o) => o.value === "");
    if (empty) return { select: "", custom: "" };
  }
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
  initialTagNumber?: string | null;
  initialManufacturer?: string | null;
  initialModel?: string | null;
  cloneMode?: boolean;
  onSave: (payload: DiscoveredSystemPayload) => void;
};

function AddDiscoveredSystemForm({
  busy,
  locationOptions,
  preferredLocation,
  initialTagNumber,
  initialManufacturer,
  initialModel,
  cloneMode,
  onSave,
}: FormProps) {
  const initial = deriveInitialSelect(preferredLocation, locationOptions);
  const [locationSelect, setLocationSelect] = useState(initial.select);
  const [locationCustom, setLocationCustom] = useState(initial.custom);
  const [tagNumber, setTagNumber] = useState(() =>
    initialTagNumber?.trim() ? initialTagNumber.trim() : ""
  );
  const [manufacturer, setManufacturer] = useState(() =>
    initialManufacturer?.trim() ? initialManufacturer.trim() : ""
  );
  const [model, setModel] = useState(() =>
    initialModel?.trim() ? initialModel.trim() : ""
  );
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

    setFormError(null);
    onSave({
      serial_id: "",
      tag_number: trimOrEmpty(tagNumber),
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
        {cloneMode ? "Clone last add" : "Add new device"}
      </AlertDialog.Title>
      <AlertDialog.Description className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
        {cloneMode
          ? "Brand, model, and room are filled from your last add — enter the new tag number."
          : "Hardware missing from the import. Saved as scanned at the location you pick."}
      </AlertDialog.Description>

      <form className="mt-5 flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        {formError ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-sm text-red-100"
          >
            {formError}
          </p>
        ) : null}

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
          <legend className="px-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Where
          </legend>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Location <span className="text-red-300">*</span>
            </span>
            <select
              value={locationSelect}
              disabled={busy}
              onChange={(e) => setLocationSelect(e.target.value)}
              className={fieldClass}
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
              <span className={labelClass}>
                Type location <span className="text-red-300">*</span>
              </span>
              <input
                type="text"
                enterKeyHint="next"
                autoComplete="off"
                disabled={busy}
                value={locationCustom}
                onChange={(e) => setLocationCustom(e.target.value)}
                className={fieldClass}
                placeholder="e.g. ECS 3.502"
              />
            </label>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
          <legend className="px-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Identity
          </legend>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Tag number</span>
            <input
              type="text"
              enterKeyHint="next"
              autoComplete="off"
              disabled={busy}
              value={tagNumber}
              onChange={(e) => setTagNumber(e.target.value)}
              className={fieldClass}
              placeholder="Scan or type the tag number"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
          <legend className="px-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Details
          </legend>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Brand (manufacturer)</span>
            <div className="flex flex-wrap gap-1.5">
              {MANUFACTURER_PRESETS.map((brand) => {
                const active = manufacturer.toLowerCase() === brand.toLowerCase();
                return (
                  <button
                    key={brand}
                    type="button"
                    disabled={busy}
                    onClick={() => setManufacturer(brand)}
                    className={cn(
                      "h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                      active
                        ? "border-cyan-400/55 bg-cyan-950/50 text-cyan-50"
                        : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {brand}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              enterKeyHint="next"
              autoComplete="organization"
              disabled={busy}
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className={fieldClass}
              placeholder="Or type brand…"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>System type (model)</span>
            <p className="text-[0.65rem] text-muted-foreground">
              Tap a line, then a number — or type freely.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MODEL_LINE_PRESETS.map((line) => {
                const active = model.toLowerCase().startsWith(line.toLowerCase());
                return (
                  <button
                    key={line}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setModel((prev) => applyModelLine(prev, line));
                      if (line === "OptiPlex" || line === "Precision" || line === "Latitude" || line === "XPS") {
                        setManufacturer((m) => (m.trim() ? m : "Dell"));
                      }
                      if (line.startsWith("Think")) {
                        setManufacturer((m) => (m.trim() ? m : "Lenovo"));
                      }
                      if (line === "EliteDesk" || line === "ProDesk") {
                        setManufacturer((m) => (m.trim() ? m : "HP"));
                      }
                      if (line === "Mac mini" || line === "iMac") {
                        setManufacturer((m) => (m.trim() ? m : "Apple"));
                      }
                    }}
                    className={cn(
                      "h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                      active
                        ? "border-teal-400/55 bg-teal-950/50 text-teal-50"
                        : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {line}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MODEL_NUMBER_PRESETS.map((num) => {
                const active = new RegExp(`\\b${num}\\b`, "i").test(model);
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={busy}
                    onClick={() => setModel((prev) => applyModelNumber(prev, num))}
                    className={cn(
                      "h-8 rounded-lg border px-2 text-xs font-mono font-medium transition-colors",
                      active
                        ? "border-violet-400/55 bg-violet-950/45 text-violet-50"
                        : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              enterKeyHint="done"
              autoComplete="off"
              disabled={busy}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={fieldClass}
              placeholder="e.g. OptiPlex 9020"
            />
          </label>
        </fieldset>

        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
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
  initialTagNumber,
  initialManufacturer,
  initialModel,
  cloneMode,
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
                key={`${formMountKey}-${initialTagNumber ?? ""}-${preferredLocation ?? ""}-${initialManufacturer ?? ""}-${initialModel ?? ""}-${cloneMode ? "c" : "n"}`}
                busy={busy}
                locationOptions={locationOptions}
                preferredLocation={preferredLocation}
                initialTagNumber={initialTagNumber}
                initialManufacturer={initialManufacturer}
                initialModel={initialModel}
                cloneMode={cloneMode}
                onSave={onSave}
              />
            ) : null}
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
