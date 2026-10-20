"use client";

import { Loader2Icon, PresentationIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { cn } from "@/lib/utils";

export function DemoSignIn({ disabled }: { disabled?: boolean }) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Browser Back restores this page from the back/forward cache with the old "signing in" state.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setBusyKey(null);
        setError(null);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function signIn(key: string) {
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch("/api/demo-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const body = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string };
      if (!res.ok || !body.redirect) throw new Error(body.error ?? "Demo sign-in failed.");
      window.location.assign(body.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo sign-in failed.");
      setBusyKey(null);
    }
  }

  return (
    <section className="relative mt-8 rounded-2xl border border-violet-500/35 bg-violet-950/25 p-4 shadow-md shadow-black/20">
      <div className="flex items-center gap-2">
        <PresentationIcon className="size-4 text-violet-200" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-100">Demo sign in</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-violet-100/75">
        One click per role, using real demo accounts — each sees exactly what that role is allowed to.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-sm text-red-100"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={disabled || busyKey != null}
            onClick={() => void signIn(a.key)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border border-violet-500/30 bg-card/70 px-3 py-2 text-left transition-colors",
              "hover:border-violet-400/60 hover:bg-violet-950/40 disabled:opacity-60 touch-manipulation"
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{a.label}</span>
              <span className="block text-[0.7rem] leading-snug text-muted-foreground">
                {a.description}
              </span>
              <span className="mt-0.5 block text-[0.65rem] font-semibold text-violet-200">
                Opens: {a.opens} →
              </span>
            </span>
            {busyKey === a.key ? (
              <Loader2Icon className="size-4 shrink-0 animate-spin text-violet-200" aria-hidden />
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
