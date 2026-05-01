import { Loader2Icon, ScanLineIcon } from "lucide-react";

type AuthInviteProcessingOverlayProps = {
  title?: string;
  subtitle?: string;
};

/** Full-screen branded loader while invite / auth links are processed (avoids sign-in flash). */
export function AuthInviteProcessingOverlay({
  title = "Verifying your invite",
  subtitle = "Please wait — this only takes a moment.",
}: AuthInviteProcessingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/85 px-6 backdrop-blur-md pb-[env(safe-area-inset-bottom)] pt-[max(1.5rem,env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-x-[-20%] top-[-30%] h-[55%] rounded-full bg-primary/15 blur-[80px]" aria-hidden />
      <div className="relative flex max-w-sm flex-col items-center text-center">
        <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-card/95 text-primary shadow-xl shadow-black/30 ring-1 ring-border">
          <ScanLineIcon className="size-8" aria-hidden strokeWidth={2} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          ECS IT · Inventory scan
        </p>
        <h1 className="mt-3 text-balance text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        <Loader2Icon
          className="mt-8 size-10 animate-spin text-primary"
          aria-hidden
        />
      </div>
    </div>
  );
}
