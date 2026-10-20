"use client";

import { Loader2Icon, RefreshCwIcon, SearchIcon, UsersIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import type { Department } from "@/lib/departments";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  navForRole,
  parseRole,
  type AppRole,
} from "@/lib/roles";
import { signOutAndGoToLogin } from "@/lib/sign-out";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn, errorMessage, formatDateTime } from "@/lib/utils";

type UsersAdminClientProps = {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  departments: Department[];
};

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  department_code: string | null;
  created_at: string;
};

type Draft = { role: AppRole; department_code: string };

async function fetchProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("user_profiles")
    .select("user_id, email, full_name, role, department_code, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, role: parseRole(row.role) }) as ProfileRow);
}

const selectClass =
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function UsersAdminClient({
  userId,
  email,
  displayName,
  role,
  departments,
}: UsersAdminClientProps) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "">("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfiles(await fetchProfiles());
      setDrafts({});
    } catch (e) {
      setError(errorMessage(e, "Could not load users."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchProfiles()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e, "Could not load users."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleCounts = useMemo(() => {
    const c = Object.fromEntries(ASSIGNABLE_ROLES.map((r) => [r, 0])) as Record<AppRole, number>;
    for (const p of profiles) c[p.role] += 1;
    return c;
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (roleFilter && p.role !== roleFilter) return false;
      if (!q) return true;
      return `${p.email ?? ""} ${p.full_name ?? ""}`.toLowerCase().includes(q);
    });
  }, [profiles, query, roleFilter]);

  function draftFor(p: ProfileRow): Draft {
    return drafts[p.user_id] ?? { role: p.role, department_code: p.department_code ?? "" };
  }

  function updateDraft(p: ProfileRow, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [p.user_id]: { ...draftFor(p), ...patch } }));
  }

  async function save(p: ProfileRow) {
    const draft = draftFor(p);
    if (draft.role === "department" && !draft.department_code) {
      setError(`Pick a department for ${p.email ?? "this user"}.`);
      return;
    }
    setSavingId(p.user_id);
    setError(null);
    setNotice(null);
    try {
      const departmentCode = draft.role === "department" ? draft.department_code : null;
      const { error: updateError } = await getSupabaseBrowserClient()
        .from("user_profiles")
        .update({ role: draft.role, department_code: departmentCode })
        .eq("user_id", p.user_id);
      if (updateError) throw updateError;
      setProfiles((prev) =>
        prev.map((row) =>
          row.user_id === p.user_id
            ? { ...row, role: draft.role, department_code: departmentCode }
            : row
        )
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[p.user_id];
        return next;
      });
      setNotice(`${p.email ?? "User"} is now ${ROLE_LABELS[draft.role]}.`);
    } catch (e) {
      setError(errorMessage(e, "Could not save this user."));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        title="Users"
        currentDisplayName={displayName}
        sessionEmail={email}
        onSignOut={() => void signOutAndGoToLogin()}
        nav={navForRole(role, "/admin/users")}
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-5 max-[361px]:px-3 md:max-w-3xl lg:max-w-5xl lg:px-6">
        <section className="rounded-2xl border border-border bg-card/80 p-3.5 shadow-md shadow-black/15 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <UsersIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Admin only
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">Roles &amp; departments</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Invite people from Supabase → Authentication → Users. New accounts show up here as
                “{ROLE_LABELS.pending}” until you give them a role.
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
                placeholder="Search name or email…"
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as AppRole | "")}
              className={cn(selectClass, "h-11 sm:w-56")}
              aria-label="Filter by role"
            >
              <option value="">All roles ({profiles.length})</option>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]} ({roleCounts[r]})
                </option>
              ))}
            </select>
          </div>
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

        {loading && profiles.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            No users match.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((p) => {
              const draft = draftFor(p);
              const isSelf = p.user_id === userId;
              const dirty =
                draft.role !== p.role ||
                (draft.role === "department" && draft.department_code !== (p.department_code ?? ""));
              return (
                <li
                  key={p.user_id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3 shadow-sm shadow-black/10 sm:px-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.full_name || p.email?.split("@")[0] || "Unnamed"}
                      {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      Added {formatDateTime(p.created_at)}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto] lg:w-[34rem]">
                    <select
                      value={draft.role}
                      disabled={isSelf || savingId === p.user_id}
                      onChange={(e) => updateDraft(p, { role: e.target.value as AppRole })}
                      className={selectClass}
                      aria-label={`Role for ${p.email ?? "user"}`}
                      title={isSelf ? "Another admin has to change your own role." : undefined}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draft.role === "department" ? draft.department_code : ""}
                      disabled={draft.role !== "department" || savingId === p.user_id}
                      onChange={(e) => updateDraft(p, { department_code: e.target.value })}
                      className={selectClass}
                      aria-label={`Department for ${p.email ?? "user"}`}
                    >
                      <option value="">
                        {draft.role === "department" ? "Pick department…" : "—"}
                      </option>
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      disabled={!dirty || savingId != null}
                      onClick={() => void save(p)}
                      className="h-10 rounded-xl"
                    >
                      {savingId === p.user_id ? (
                        <Loader2Icon className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Save
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
