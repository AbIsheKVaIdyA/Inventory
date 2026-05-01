"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Loader2Icon, Undo2Icon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { Asset } from "@/types/asset";

import { cn } from "@/lib/utils";

type UndoScanAlertProps = {
  asset: Asset | null;
  busy: boolean;
  onDismiss: () => void;
  onConfirmReturn: () => void;
};

/**
 * Accessible confirmation before moving a scanned row back to the pending queue.
 */
export function UndoScanAlert({
  asset,
  busy,
  onDismiss,
  onConfirmReturn,
}: UndoScanAlertProps) {
  const open = asset !== null;
  const name = asset?.computer_name ?? "";

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
        <AlertDialog.Viewport className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <AlertDialog.Popup
            initialFocus={true}
            className={cn(
              "w-full max-w-[min(calc(100vw-2rem),22rem)] origin-bottom rounded-3xl border border-border/90 bg-card/98 p-6 shadow-2xl shadow-black/50 ring-1 ring-white/[0.08] backdrop-blur-xl",
              "transition-[opacity,transform] duration-200 ease-out sm:origin-center",
              "[&[data-starting-style]]:translate-y-3 [&[data-starting-style]]:scale-[0.96] [&[data-starting-style]]:opacity-0",
              "[&[data-ending-style]]:scale-[0.98] [&[data-ending-style]]:opacity-0"
            )}
          >
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-orange-950/55 text-orange-200 ring-1 ring-orange-500/35">
              <Undo2Icon className="size-6" aria-hidden />
            </div>
            <AlertDialog.Title className="text-center text-lg font-semibold tracking-tight text-foreground">
              Return to the queue?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              <span className="break-all font-mono font-semibold text-foreground">{name}</span>{" "}
              will move back to{" "}
              <span className="font-semibold text-foreground">&quot;To scan&quot;</span>. Anyone can mark
              it scanned again.
            </AlertDialog.Description>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <AlertDialog.Close
                disabled={busy}
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 shrink-0 gap-2 rounded-2xl border-border shadow-sm shadow-black/20"
                )}
              >
                Cancel
              </AlertDialog.Close>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busy}
                aria-busy={busy}
                className="h-12 gap-2 rounded-2xl border-orange-600/45 bg-orange-950/35 font-semibold text-orange-100 hover:bg-orange-950/65 hover:text-orange-50"
                onClick={() => {
                  if (busy || !asset) return;
                  onConfirmReturn();
                }}
              >
                {busy ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" aria-hidden />
                    Returning…
                  </>
                ) : (
                  <>
                    <Undo2Icon className="size-4 opacity-90" aria-hidden />
                    Return to queue
                  </>
                )}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
