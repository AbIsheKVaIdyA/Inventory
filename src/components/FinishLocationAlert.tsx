"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { CheckCheckIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FinishLocationAlertProps = {
  open: boolean;
  busy: boolean;
  locationLabel: string;
  affectedCount: number;
  mode: "scan" | "unscan";
  onDismiss: () => void;
  onConfirm: () => void;
};

export function FinishLocationAlert({
  open,
  busy,
  locationLabel,
  affectedCount,
  mode,
  onDismiss,
  onConfirm,
}: FinishLocationAlertProps) {
  const isScan = mode === "scan";
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
              "w-full max-w-[min(calc(100vw-1.5rem),22rem)] rounded-3xl border border-border/90 bg-card/98 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/[0.08] backdrop-blur-xl sm:p-6",
              "transition-[opacity,transform] duration-200 ease-out",
              "[&[data-starting-style]]:translate-y-3 [&[data-starting-style]]:scale-[0.96] [&[data-starting-style]]:opacity-0",
              "[&[data-ending-style]]:scale-[0.98] [&[data-ending-style]]:opacity-0"
            )}
          >
            <div
              className={cn(
                "mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl ring-1",
                isScan
                  ? "bg-emerald-950/60 text-emerald-200 ring-emerald-500/35"
                  : "bg-orange-950/60 text-orange-200 ring-orange-500/35"
              )}
            >
              {isScan ? (
                <CheckCheckIcon className="size-6" aria-hidden />
              ) : (
                <RotateCcwIcon className="size-6" aria-hidden />
              )}
            </div>
            <AlertDialog.Title className="text-center text-lg font-semibold tracking-tight text-foreground">
              {isScan ? "Finish this location?" : "Undo this location?"}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              This will{" "}
              <span className="font-semibold text-foreground">
                {isScan ? "mark scanned" : "return to queue"}
              </span>{" "}
              for all{" "}
              <span className="font-semibold text-foreground tabular-nums">{affectedCount}</span>{" "}
              system(s) in <span className="font-semibold text-foreground">{locationLabel}</span>.
            </AlertDialog.Description>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                type="button"
                size="lg"
                disabled={busy}
                aria-busy={busy}
                className={cn(
                  "touch-manipulation h-12 min-h-12 w-full gap-2 rounded-2xl font-semibold text-white",
                  isScan
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-orange-600 hover:bg-orange-500"
                )}
                onClick={() => {
                  if (busy) return;
                  onConfirm();
                }}
              >
                {busy ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" aria-hidden />
                    {isScan ? "Finishing…" : "Returning…"}
                  </>
                ) : (
                  <>
                    {isScan ? (
                      <CheckCheckIcon className="size-4" aria-hidden />
                    ) : (
                      <RotateCcwIcon className="size-4" aria-hidden />
                    )}
                    {isScan ? "Mark all scanned" : "Return all to queue"}
                  </>
                )}
              </Button>
              <AlertDialog.Close
                disabled={busy}
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "touch-manipulation h-12 min-h-12 w-full rounded-2xl border-border shadow-sm shadow-black/20"
                )}
              >
                Cancel
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
