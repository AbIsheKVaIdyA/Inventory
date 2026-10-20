"use client";

import { Loader2Icon, MapPinIcon, PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { departmentName, type Department } from "@/lib/departments";
import {
  fetchRoomMappings,
  fetchRoomSummaries,
  roomKey,
  type RoomMapping,
  type RoomSummary,
} from "@/lib/room-department-map";
import { navForRole, type AppRole } from "@/lib/roles";
import { signOutAndGoToLogin } from "@/lib/sign-out";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn, errorMessage } from "@/lib/utils";

type RoomMappingClientProps = {
  email: string;
  displayName: string;
  role: AppRole;
  departments: Department[];
};

type View = "unlinked" | "linked";

type MappingData = { mappings: RoomMapping[]; summaries: RoomSummary[] };

async function loadMappingData(): Promise<MappingData> {
  const sb = getSupabaseBrowserClient();
  const [mappings, summaries] = await Promise.all([fetchRoomMappings(sb), fetchRoomSummaries(sb)]);
  return { mappings, summaries };
}

const selectClass =
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function RoomMappingClient({ email, displayName, role, departments }: RoomMappingClientProps) {
  const [data, setData] = useState<MappingData>({ mappings: [], summaries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<View>("unlinked");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState("");
  const [newDept, setNewDept] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadMappingData());
    } catch (e) {
      setError(errorMessage(e, "Could not load rooms."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadMappingData()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e, "Could not load rooms."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const devicesByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.summaries) {
      const k = roomKey(s.location);
      m.set(k, (m.get(k) ?? 0) + s.deviceCount);
    }
    return m;
  }, [data.summaries]);

  const mappedKeys = useMemo(
    () => new Set(data.mappings.map((m) => roomKey(m.location))),
    [data.mappings]
  );

  const q = query.trim().toLowerCase();

  const unlinked = useMemo(
    () =>
      data.summaries.filter(
        (s) => !mappedKeys.has(roomKey(s.location)) && (!q || s.location.toLowerCase().includes(q))
      ),
    [data.summaries, mappedKeys, q]
  );

  const linked = useMemo(
    () =>
      data.mappings.filter(
        (m) =>
          !q ||
          m.location.toLowerCase().includes(q) ||
          departmentName(departments, m.department_code).toLowerCase().includes(q)
      ),
    [data.mappings, departments, q]
  );

  const unlinkedTotal = data.summaries.filter((s) => !mappedKeys.has(roomKey(s.location))).length;

  async function saveMapping(location: string, departmentCode: string) {
    setBusyRoom(location);
    setError(null);
    setNotice(null);
    try {
      const { error: upsertError } = await getSupabaseBrowserClient()
        .from("room_department_map")
        .upsert({ location, department_code: departmentCode }, { onConflict: "location" });
      if (upsertError) throw upsertError;
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[location];
        return next;
      });
      setNotice(`${location} → ${departmentName(departments, departmentCode)}.`);
      await reload();
    } catch (e) {
      setError(errorMessage(e, "Could not save the room."));
    } finally {
      setBusyRoom(null);
    }
  }

  async function removeMapping(location: string) {
    setBusyRoom(location);
    setError(null);
    setNotice(null);
    try {
      const { error: deleteError } = await getSupabaseBrowserClient()
        .from("room_department_map")
        .delete()
        .eq("location", location);
      if (deleteError) throw deleteError;
      setNotice(`${location} is no longer linked to a department.`);
      await reload();
    } catch (e) {
      setError(errorMessage(e, "Could not remove the room."));
    } finally {
      setBusyRoom(null);
    }
  }

  function addRoom(e: FormEvent) {
    e.preventDefault();
    const room = newRoom.trim();
    if (!room || !newDept) {
      setError("Type a room and pick a department.");
      return;
    }
    setNewRoom("");
    void saveMapping(room, newDept);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        title="Room mapping"
        currentDisplayName={displayName}
        sessionEmail={email}
        onSignOut={() => void signOutAndGoToLogin()}
        nav={navForRole(role, "/admin/rooms")}
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-5 max-[361px]:px-3 md:max-w-3xl lg:max-w-5xl lg:px-6">
        <section className="rounded-2xl border border-border bg-card/80 p-3.5 shadow-md shadow-black/15 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-950/50 text-teal-100 ring-1 ring-teal-500/35">
              <MapPinIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Admin only
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">Rooms → departments</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Every device in a linked room belongs to that department, so the department sees it.
                New devices added to a linked room are assigned automatically.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void reload()}
              className="h-10 shrink-0 rounded-xl"
              aria-label="Refresh"
            >
              {loading ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCwIcon className="size-4 opacity-80" aria-hidden />
              )}
            </Button>
          </div>

          <form onSubmit={addRoom} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_16rem_auto]">
            <input
              type="text"
              list="room-mapping-rooms"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="Room, e.g. ECS 3.502"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Room"
            />
            <datalist id="room-mapping-rooms">
              {data.summaries.map((s) => (
                <option key={s.location} value={s.location} />
              ))}
            </datalist>
            <select
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className={selectClass}
              aria-label="Department"
            >
              <option value="">Department…</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={busyRoom != null} className="h-10 gap-1.5 rounded-xl">
              <PlusIcon className="size-4" aria-hidden />
              Link room
            </Button>
          </form>
        </section>

        {error ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-red-950/45 px-4 py-3 text-sm text-red-100"
          >
            {error}
          </section>
        ) : null}

        {notice ? (
          <section
            role="status"
            className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100"
          >
            {notice}
          </section>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2" role="tablist" aria-label="Rooms">
            {(
              [
                ["unlinked", `Not linked (${unlinkedTotal})`],
                ["linked", `Linked (${data.mappings.length})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "h-10 flex-1 rounded-xl border px-3 text-sm font-semibold transition-colors sm:flex-none",
                  view === value
                    ? "border-primary/40 bg-primary/15 text-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block min-w-0 flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search room or department…"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>

        {loading && data.summaries.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
            Loading rooms…
          </div>
        ) : view === "unlinked" ? (
          unlinked.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              {unlinkedTotal === 0 ? "Every room with devices is linked." : "No rooms match."}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {unlinked.map((s) => (
                <li
                  key={s.location}
                  className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3 sm:flex-row sm:items-center sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{s.location}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.deviceCount} device{s.deviceCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-[24rem]">
                    <select
                      value={drafts[s.location] ?? ""}
                      disabled={busyRoom === s.location}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [s.location]: e.target.value }))
                      }
                      className={selectClass}
                      aria-label={`Department for ${s.location}`}
                    >
                      <option value="">Department…</option>
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      disabled={!drafts[s.location] || busyRoom != null}
                      onClick={() => void saveMapping(s.location, drafts[s.location])}
                      className="h-10 rounded-xl"
                    >
                      {busyRoom === s.location ? (
                        <Loader2Icon className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Link
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : linked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            {data.mappings.length === 0 ? "No rooms linked yet." : "No rooms match."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {linked.map((m) => {
              const count = devicesByKey.get(roomKey(m.location)) ?? 0;
              return (
                <li
                  key={m.location}
                  className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3 sm:flex-row sm:items-center sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{m.location}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} device{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-[24rem]">
                    <select
                      value={m.department_code}
                      disabled={busyRoom != null}
                      onChange={(e) => void saveMapping(m.location, e.target.value)}
                      className={selectClass}
                      aria-label={`Department for ${m.location}`}
                    >
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busyRoom != null}
                      onClick={() => void removeMapping(m.location)}
                      className="h-10 rounded-xl"
                    >
                      {busyRoom === m.location ? (
                        <Loader2Icon className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Unlink
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
