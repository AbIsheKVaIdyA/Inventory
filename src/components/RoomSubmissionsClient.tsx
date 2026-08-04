"use client";

import {
  ArrowLeftIcon,
  Building2Icon,
  DownloadIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Header } from "@/components/Header";
import { Button, buttonVariants } from "@/components/ui/button";
import { downloadRoomAssignmentsSpreadsheet } from "@/lib/download-room-assignments-xlsx";
import type { RoomAssignmentRow } from "@/lib/room-assignments";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

type RoomSubmissionsClientProps = {
  scannerEmail: string;
  scannerDisplayName: string;
  onSignOut: () => Promise<void>;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function RoomSubmissionsClient({
  scannerEmail,
  scannerDisplayName,
  onSignOut,
}: RoomSubmissionsClientProps) {
  const [rows, setRows] = useState<RoomAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("");

  const fetchRows = useCallback(async (): Promise<RoomAssignmentRow[]> => {
    const sb = getSupabaseBrowserClient();
    const { data, error: qErr } = await sb
      .from("room_assignments")
      .select(
        "id, department, building, room_number, firstname, lastname, netid, job_title, created_at"
      )
      .order("created_at", { ascending: false });
    if (qErr) throw qErr;
    return (data ?? []).filter(
      (r): r is RoomAssignmentRow =>
        Boolean(r && typeof r.id === "string" && typeof r.created_at === "string")
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchRows());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load room submissions.";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchRows]);

  useEffect(() => {
    let cancelled = false;
    void fetchRows()
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Could not load room submissions.";
        setError(msg);
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRows]);

  const buildings = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const b = r.building?.trim();
      if (b) set.add(b);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (buildingFilter && r.building.trim() !== buildingFilter) return false;
      if (!q) return true;
      const blob = [
        r.department,
        r.building,
        r.room_number,
        r.firstname,
        r.lastname,
        r.netid,
        r.job_title,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, query, buildingFilter]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadRoomAssignmentsSpreadsheet(
      filtered.map((r) => ({
        department: r.department,
        building: r.building,
        room_number: r.room_number,
        firstname: r.firstname,
        lastname: r.lastname,
        netid: r.netid,
        job_title: r.job_title,
      })),
      `room-submissions-${stamp}.xlsx`
    );
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        title="Room submissions"
        currentDisplayName={scannerDisplayName}
        sessionEmail={scannerEmail}
        onSignOut={() => void onSignOut()}
        nav={[
          { href: "/dashboard", label: "Scan queue" },
          { href: "/dashboard/room-submissions", label: "Room submissions", active: true },
        ]}
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-5 max-[361px]:px-3 md:max-w-3xl lg:max-w-5xl lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex h-10 items-center gap-2 rounded-xl"
            )}
          >
            <ArrowLeftIcon className="size-4 opacity-80" aria-hidden />
            Back to scan
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
            className="h-10 rounded-xl"
          >
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCwIcon className="size-4 opacity-80" aria-hidden />
            )}
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={filtered.length === 0}
            onClick={handleExport}
            className="h-10 rounded-xl"
          >
            <DownloadIcon className="size-4 opacity-80" aria-hidden />
            Export Excel
          </Button>
        </div>

        <section className="rounded-2xl border border-border bg-card/80 p-3.5 shadow-md shadow-black/15 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-950/50 text-violet-100 ring-1 ring-violet-500/35">
              <Building2Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Signed-in only
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                Submissions from the public rooms form
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The share link{" "}
                <code className="rounded bg-muted/60 px-1 py-0.5 text-[0.7rem]">/rooms</code> stays
                open for anyone to fill in. Only accounts that sign in can view this list.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, netid, room…"
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-40"
              aria-label="Filter by building"
            >
              <option value="">All buildings</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span>
            {filtered.length !== rows.length ? (
              <>
                {" "}
                of <span className="tabular-nums">{rows.length}</span>
              </>
            ) : null}{" "}
            submission{filtered.length === 1 ? "" : "s"}
          </p>
        </section>

        {error ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-red-950/45 px-4 py-3 text-sm text-red-100"
          >
            {error}
          </section>
        ) : null}

        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
            Loading submissions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "No room submissions yet. Share /rooms so people can fill the form."
              : "No submissions match this search."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3 shadow-sm shadow-black/10",
                  "sm:px-4"
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {r.building} · {r.room_number}
                  </p>
                  <p className="text-[0.7rem] tabular-nums text-muted-foreground">
                    {formatWhen(r.created_at)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {r.firstname} {r.lastname}
                  <span className="text-muted-foreground"> · {r.netid}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.department}
                  {r.job_title ? ` · ${r.job_title}` : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
