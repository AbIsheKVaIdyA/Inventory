"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { MANUFACTURER_PRESETS } from "@/lib/device-presets";
import { emptyToNull, type DeviceRequestInsert } from "@/lib/device-requests";
import { cn } from "@/lib/utils";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

const DEVICE_TYPES = ["Desktop", "Laptop", "Workstation", "Monitor", "Printer", "Other"] as const;

type DeviceRequestFormProps = {
  departmentCode: string;
  departmentName: string;
  /** Rooms already known for this department (suggestions only). */
  knownRooms: string[];
  busy: boolean;
  onSubmit: (payload: DeviceRequestInsert) => void;
  onCancel: () => void;
};

export function DeviceRequestForm({
  departmentCode,
  departmentName,
  knownRooms,
  busy,
  onSubmit,
  onCancel,
}: DeviceRequestFormProps) {
  const [location, setLocation] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [serialId, setSerialId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!location.trim()) {
      setFormError("Enter the room the device is in (e.g. ECS 3.502).");
      return;
    }
    if (!tagNumber.trim() && !serialId.trim()) {
      setFormError("Enter the tag number or the serial number.");
      return;
    }
    setFormError(null);
    onSubmit({
      department_code: departmentCode,
      location: location.trim(),
      tag_number: emptyToNull(tagNumber),
      serial_id: emptyToNull(serialId),
      manufacturer: emptyToNull(manufacturer),
      model: emptyToNull(model),
      description: emptyToNull(deviceType),
      notes: emptyToNull(notes),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl border border-cyan-500/30 bg-card/80 p-4 shadow-md shadow-black/15"
    >
      <div>
        <p className="text-base font-semibold text-foreground">Register a device</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          For <span className="font-medium text-foreground">{departmentName}</span>. ECS IT reviews the
          request; once approved the device is added to your department&apos;s list.
        </p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-sm text-red-100"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>
            Room <span className="text-red-300">*</span>
          </span>
          <input
            type="text"
            list="device-request-rooms"
            autoComplete="off"
            disabled={busy}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={fieldClass}
            placeholder="e.g. ECS 3.502"
          />
          <datalist id="device-request-rooms">
            {knownRooms.map((room) => (
              <option key={room} value={room} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tag number</span>
          <input
            type="text"
            autoComplete="off"
            disabled={busy}
            value={tagNumber}
            onChange={(e) => setTagNumber(e.target.value)}
            className={fieldClass}
            placeholder="Asset tag"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Serial number</span>
          <input
            type="text"
            autoComplete="off"
            disabled={busy}
            value={serialId}
            onChange={(e) => setSerialId(e.target.value)}
            className={fieldClass}
            placeholder="Service tag / S/N"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Brand</span>
          <input
            type="text"
            list="device-request-brands"
            autoComplete="off"
            disabled={busy}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className={fieldClass}
            placeholder="e.g. Dell"
          />
          <datalist id="device-request-brands">
            {MANUFACTURER_PRESETS.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Model</span>
          <input
            type="text"
            autoComplete="off"
            disabled={busy}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={fieldClass}
            placeholder="e.g. OptiPlex 7090"
          />
        </label>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Type</span>
          <div className="flex flex-wrap gap-1.5">
            {DEVICE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={busy}
                onClick={() => setDeviceType((cur) => (cur === t ? "" : t))}
                className={cn(
                  "h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                  deviceType === t
                    ? "border-cyan-400/55 bg-cyan-950/50 text-cyan-50"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Notes for ECS IT</span>
          <textarea
            disabled={busy}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={cn(fieldClass, "py-2")}
            placeholder="Anything IT should know (new purchase, moved from another room…)"
          />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
          className="h-11 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="h-11 gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 font-semibold text-white hover:from-cyan-500 hover:to-teal-500"
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <SendIcon className="size-4" aria-hidden />
          )}
          Send to ECS IT
        </Button>
      </div>
    </form>
  );
}
