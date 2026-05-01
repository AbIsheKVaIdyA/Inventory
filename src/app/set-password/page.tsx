"use client";

import { Loader2Icon, LockIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";

const PASSWORD_POLICY_MESSAGE =
  "Use at least 12 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol.";
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Loader2Icon className="size-10 animate-spin" aria-hidden />
          </div>
        }
      >
        <SetPasswordForm />
      </Suspense>
    </div>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(() => hasSupabaseConfig());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return;
    }

    let mounted = true;
    const sb = getSupabaseBrowserClient();

    void sb.auth.getUser().then(({ data, error: userError }) => {
      if (!mounted) return;
      if (userError || !data.user) {
        const login = new URL("/login", window.location.origin);
        login.searchParams.set("error", "Invite link expired. Please request a new invite.");
        login.searchParams.set("next", next);
        router.replace(`${login.pathname}${login.search}`);
        return;
      }
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
    };
  }, [next, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!hasSupabaseConfig()) {
      setError("Missing Supabase environment variables.");
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const sb = getSupabaseBrowserClient();
      const { error: updateError } = await sb.auth.updateUser({ password });
      if (updateError) throw updateError;

      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not set your password.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2Icon className="size-10 animate-spin" aria-hidden />
        <p className="text-sm">Preparing secure setup…</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center px-4 py-8 pb-[calc(var(--site-footer-reserve)+1.25rem)] pt-[max(1rem,env(safe-area-inset-top))] max-[361px]:px-3">
      <div className="pointer-events-none absolute inset-x-10 top-[-10%] h-40 rounded-full bg-primary/20 blur-[64px]" aria-hidden />

      <div className="relative text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-card/90 text-primary shadow-lg shadow-black/40 ring-1 ring-border backdrop-blur-sm">
          <ShieldCheckIcon className="size-7" aria-hidden strokeWidth={2} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          ECS IT · Inventory scan
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight leading-tight sm:text-3xl">
          Set your password
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-sm">
          Finish your invite by creating a password, then you&apos;ll continue to the dashboard.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-pretty text-xs leading-relaxed text-muted-foreground">
          {PASSWORD_POLICY_MESSAGE}
        </p>
      </div>

      <form className="relative mt-8 flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-500/45 bg-red-950/45 px-4 py-3 text-sm text-red-100"
          >
            {error}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            New password
          </span>
          <input
            type="password"
            enterKeyHint="next"
            autoComplete="new-password"
            required
            minLength={12}
            pattern={STRONG_PASSWORD_REGEX.source}
            title={PASSWORD_POLICY_MESSAGE}
            disabled={busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[3rem] w-full rounded-2xl border border-border bg-card/70 px-4 text-base leading-normal outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-[0.9375rem]"
            placeholder="At least 8 characters"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confirm password
          </span>
          <input
            type="password"
            enterKeyHint="done"
            autoComplete="new-password"
            required
            minLength={12}
            pattern={STRONG_PASSWORD_REGEX.source}
            title={PASSWORD_POLICY_MESSAGE}
            disabled={busy}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="min-h-[3rem] w-full rounded-2xl border border-border bg-card/70 px-4 text-base leading-normal outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-[0.9375rem]"
            placeholder="Repeat password"
          />
        </label>

        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className={cn(
            "touch-manipulation mt-2 h-12 min-h-12 w-full gap-2 rounded-2xl text-base font-semibold shadow-lg shadow-black/25 active:opacity-95"
          )}
        >
          {busy ? (
            <>
              <Loader2Icon className="size-5 animate-spin shrink-0" aria-hidden />
              Saving password…
            </>
          ) : (
            <>
              <LockIcon className="size-4 shrink-0 opacity-90" aria-hidden />
              Save password
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
