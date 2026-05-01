"use client";

import { Loader2Icon, LockIcon, ScanLineIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";

export default function LoginPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Loader2Icon className="size-10 animate-spin" aria-hidden />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard";
  const errParam = searchParams.get("error");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(errParam ?? null);
  const processingAuthLink = Boolean(code || (tokenHash && otpType));

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    if (typeof window === "undefined") return;
    if (!window.location.hash.startsWith("#")) return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const hashType = hash.get("type");
    if (!accessToken || !refreshToken || !hashType) return;

    const sb = getSupabaseBrowserClient();
    let active = true;

    void (async () => {
      try {
        const { error: sessionError } = await sb.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;

        window.history.replaceState(null, "", window.location.pathname + window.location.search);

        if (hashType === "invite" || hashType === "recovery") {
          router.replace(`/set-password?next=${encodeURIComponent(next)}`);
          return;
        }

        router.replace(next);
      } catch (e: unknown) {
        if (!active) return;
        const msg =
          e instanceof Error ? e.message : "Authentication link failed. Ask for a new invite.";
        setError(msg);
      }
    })();

    return () => {
      active = false;
    };
  }, [next, router]);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    if (!code && !(tokenHash && otpType)) return;

    const sb = getSupabaseBrowserClient();
    const supportedTypes = ["invite", "recovery", "magiclink", "email"] as const;

    let active = true;

    void (async () => {
      try {
        if (code) {
          router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
          return;
        }

        if (!tokenHash || !otpType || !supportedTypes.includes(otpType as (typeof supportedTypes)[number])) {
          throw new Error("Invalid invite link. Ask for a new invite.");
        }

        const { error: verifyError } = await sb.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as "invite" | "recovery" | "magiclink" | "email",
        });
        if (verifyError) throw verifyError;

        if (otpType === "invite" || otpType === "recovery") {
          router.replace(`/set-password?next=${encodeURIComponent(next)}`);
          return;
        }

        router.replace(next);
      } catch (e: unknown) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Authentication link failed.";
        setError(msg);
      }
    })();

    return () => {
      active = false;
    };
  }, [code, next, otpType, router, tokenHash]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!hasSupabaseConfig()) {
      setError("Missing Supabase environment variables.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowserClient();
      const { error: signErr } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) throw signErr;
      router.push(next);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign-in failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center px-4 py-8 pb-[calc(var(--site-footer-reserve)+1.25rem)] pt-[max(1rem,env(safe-area-inset-top))] max-[361px]:px-3">
      <div className="pointer-events-none absolute inset-x-10 top-[-10%] h-40 rounded-full bg-primary/20 blur-[64px]" aria-hidden />

      <div className="relative text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-card/90 text-primary shadow-lg shadow-black/40 ring-1 ring-border backdrop-blur-sm">
          <ScanLineIcon className="size-7" aria-hidden strokeWidth={2} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          ECS IT · Inventory scan
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight leading-tight sm:text-3xl">
          Sign in
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-sm">
          Invitation-only. Use the email address that received your invite — set your password from
          the link in that email once, then sign in here.
        </p>
      </div>

      {processingAuthLink ? (
        <section className="relative mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-6 text-sm text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" aria-hidden />
          <p>Verifying your invite link…</p>
        </section>
      ) : !hasSupabaseConfig() ? (
        <section
          role="alert"
          className="relative mt-8 rounded-2xl border border-amber-500/40 bg-amber-950/40 px-4 py-4 text-sm text-amber-50"
        >
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in{' '}
          <span className="font-mono">.env.local</span>.
        </section>
      ) : (
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
              Email
            </span>
            <input
              type="email"
              enterKeyHint="next"
              inputMode="email"
              autoComplete="email"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[3rem] w-full rounded-2xl border border-border bg-card/70 px-4 text-base leading-normal outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-[0.9375rem]"
              placeholder="name@ecs.example"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              enterKeyHint="done"
              autoComplete="current-password"
              required
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[3rem] w-full rounded-2xl border border-border bg-card/70 px-4 text-base leading-normal outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-[0.9375rem]"
              placeholder="••••••••"
            />
          </label>
          <Button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className={cn(
              "touch-manipulation mt-2 min-h-12 h-12 w-full gap-2 rounded-2xl text-base font-semibold shadow-lg shadow-black/25 active:opacity-95"
            )}
          >
            {busy ? (
              <>
                <Loader2Icon className="size-5 animate-spin shrink-0" aria-hidden />
                Signing in…
              </>
            ) : (
              <>
                <LockIcon className="size-4 shrink-0 opacity-90" aria-hidden />
                Sign in
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
