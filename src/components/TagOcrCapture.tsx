"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { CameraIcon, Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

type TagOcrCaptureProps = {
  disabled?: boolean;
  onCaptured: (text: string) => void;
  className?: string;
  /** Compact icon button vs labeled */
  variant?: "icon" | "labeled";
};

const MIN_DIGITS = 3;
const MAX_DIGITS = 20;

/** Pull digit-only runs from OCR text (letters ignored). */
export function extractNumberCandidates(raw: string): string[] {
  const runs = raw.match(/\d+/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const run of runs) {
    if (run.length < MIN_DIGITS || run.length > MAX_DIGITS) continue;
    if (seen.has(run)) continue;
    seen.add(run);
    out.push(run);
  }

  // Prefer longer / more tag-like numbers first
  return out.sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export function TagOcrCapture({
  disabled,
  onCaptured,
  className,
  variant = "icon",
}: TagOcrCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function clearPreview() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function closePicker() {
    setCandidates(null);
    clearPreview();
  }

  function choose(num: string) {
    closePicker();
    onCaptured(num);
  }

  async function runOcr(file: File) {
    setBusy(true);
    setError(null);
    closePicker();

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: () => undefined,
      });
      try {
        // Digits only — ignore letters on the sticker / background
        await worker.setParameters({
          tessedit_char_whitelist: "0123456789",
        });
        const {
          data: { text },
        } = await worker.recognize(file);

        const nums = extractNumberCandidates(text);
        if (nums.length === 0) {
          setError("No number found — try a closer photo of the tag digits.");
          clearPreview();
          return;
        }
        if (nums.length === 1) {
          clearPreview();
          onCaptured(nums[0]!);
          return;
        }
        // Multiple numbers — let the user tap the right one
        setCandidates(nums);
      } finally {
        await worker.terminate();
      }
    } catch {
      setError("Camera OCR failed. Check permission and try again.");
      clearPreview();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void runOcr(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        aria-busy={busy}
        aria-label={busy ? "Reading numbers from photo" : "Scan tag number with camera"}
        title="Scan tag number with camera"
        onClick={() => inputRef.current?.click()}
        className={cn(
          variant === "icon"
            ? "size-11 shrink-0 rounded-xl border-teal-400/40 bg-teal-950/30 px-0 text-teal-100 hover:bg-teal-950/50"
            : "h-11 gap-2 rounded-xl border-teal-400/40 bg-teal-950/30 px-3 text-teal-50 hover:bg-teal-950/50"
        )}
      >
        {busy ? (
          <Loader2Icon className="size-5 animate-spin" aria-hidden />
        ) : (
          <CameraIcon className="size-5" aria-hidden />
        )}
        {variant === "labeled" ? (
          <span className="text-sm font-semibold">{busy ? "Reading…" : "Camera"}</span>
        ) : null}
      </Button>
      {error ? (
        <p
          role="alert"
          className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg bg-red-950/95 px-2 py-1 text-[0.65rem] text-red-100 shadow-lg"
        >
          {error}
        </p>
      ) : null}

      <AlertDialog.Root
        open={candidates !== null}
        onOpenChange={(next) => {
          if (!next) closePicker();
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm" />
          <AlertDialog.Viewport className="fixed inset-0 z-[110] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-10 sm:items-center sm:p-4">
            <AlertDialog.Popup className="max-h-[min(90dvh,calc(100svh-1.5rem))] w-full max-w-md overflow-y-auto rounded-3xl border border-border/90 bg-card p-5 shadow-2xl">
              <AlertDialog.Title className="text-center text-lg font-semibold text-foreground">
                Which number?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1.5 text-center text-sm text-muted-foreground">
                Several numbers were found — tap the tag number you want.
              </AlertDialog.Description>

              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob preview from camera capture
                <img
                  src={previewUrl}
                  alt="Captured tag photo"
                  className="mt-4 max-h-40 w-full rounded-2xl border border-border object-contain bg-black/40"
                />
              ) : null}

              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(candidates ?? []).map((num) => (
                  <li key={num}>
                    <button
                      type="button"
                      onClick={() => choose(num)}
                      className="flex h-14 w-full items-center justify-center rounded-2xl border border-teal-400/45 bg-teal-950/40 font-mono text-xl font-semibold tracking-wide text-teal-50 transition-colors hover:bg-teal-900/55 active:scale-[0.98]"
                    >
                      {num}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  onClick={() => {
                    closePicker();
                    inputRef.current?.click();
                  }}
                >
                  Retake
                </Button>
                <AlertDialog.Close
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 flex-1 rounded-xl")}
                >
                  Cancel
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
