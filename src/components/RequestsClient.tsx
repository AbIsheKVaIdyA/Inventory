"use client";

import {
  BarChart3Icon,
  CheckIcon,
  InboxIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChartCard,
  DonutChart,
  HorizontalBars,
  Kpi,
  VerticalBars,
  countBy,
  countPerDay,
} from "@/components/charts";
import { DeviceRequestCard } from "@/components/DeviceRequestCard";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { departmentName, type Department } from "@/lib/departments";
import {
  DEVICE_REQUEST_STATUS_LABELS,
  fetchDeviceRequests,
  type DeviceRequest,
  type DeviceRequestStatus,
} from "@/lib/device-requests";
import { navForRole, type AppRole } from "@/lib/roles";
import { signOutAndGoToLogin } from "@/lib/sign-out";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn, errorMessage } from "@/lib/utils";

type RequestsClientProps = {
  email: string;
  displayName: string;
  role: AppRole;
  departments: Department[];
};

type StatusFilter = DeviceRequestStatus | "all";

const STATUS_FILTERS: StatusFilter[] = ["pending", "approved", "rejected", "all"];

export function RequestsClient({ email, displayName, role, departments }: RequestsClientProps) {
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await fetchDeviceRequests(getSupabaseBrowserClient()));
    } catch (e) {
      setError(errorMessage(e, "Could not load device requests."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchDeviceRequests(getSupabaseBrowserClient())
      .then((list) => {
        if (!cancelled) setRequests(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e, "Could not load device requests."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { pending: 0, approved: 0, rejected: 0, all: 0 };
    for (const r of requests) {
      if (departmentFilter && r.department_code !== departmentFilter) continue;
      c[r.status] += 1;
      c.all += 1;
    }
    return c;
  }, [requests, departmentFilter]);

  const insights = useMemo(() => {
    const scoped = departmentFilter
      ? requests.filter((r) => r.department_code === departmentFilter)
      : requests;
    const reviewed = scoped.filter((r) => r.reviewed_at);
    const reviewHours = reviewed.map(
      (r) => (new Date(r.reviewed_at!).getTime() - new Date(r.created_at).getTime()) / 3_600_000
    );
    const avgHours =
      reviewHours.length > 0 ? reviewHours.reduce((a, b) => a + b, 0) / reviewHours.length : null;
    const approved = scoped.filter((r) => r.status === "approved").length;
    return {
      byStatus: [
        { label: DEVICE_REQUEST_STATUS_LABELS.pending, value: counts.pending, tone: "amber" as const },
        { label: DEVICE_REQUEST_STATUS_LABELS.approved, value: counts.approved, tone: "emerald" as const },
        { label: DEVICE_REQUEST_STATUS_LABELS.rejected, value: counts.rejected, tone: "red" as const },
      ],
      byDepartment: countBy(scoped, (r) => departmentName(departments, r.department_code)),
      perDay: countPerDay(
        scoped.map((r) => r.created_at),
        14
      ),
      avgReview:
        avgHours == null ? "—" : avgHours < 24 ? `${avgHours.toFixed(1)} h` : `${(avgHours / 24).toFixed(1)} d`,
      approvalRate: reviewed.length > 0 ? `${Math.round((approved / reviewed.length) * 100)}%` : "—",
    };
  }, [requests, departmentFilter, departments, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (departmentFilter && r.department_code !== departmentFilter) return false;
      if (!q) return true;
      return [
        r.tag_number,
        r.serial_id,
        r.location,
        r.manufacturer,
        r.model,
        r.requested_by_email,
        r.requested_by_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [requests, statusFilter, departmentFilter, query]);

  async function review(r: DeviceRequest, decision: "approve" | "reject") {
    setActingId(r.id);
    setError(null);
    setNotice(null);
    try {
      const { error: rpcError } = await getSupabaseBrowserClient().rpc(
        decision === "approve" ? "approve_device_request" : "reject_device_request",
        { p_request_id: r.id, p_note: notes[r.id]?.trim() || null }
      );
      if (rpcError) throw rpcError;
      setNotice(
        decision === "approve"
          ? `Approved — ${r.tag_number || r.serial_id} added to ${departmentName(departments, r.department_code)}.`
          : `Rejected request for ${r.tag_number || r.serial_id}.`
      );
      setNotes((prev) => {
        const next = { ...prev };
        delete next[r.id];
        return next;
      });
      await reload();
    } catch (e) {
      setError(errorMessage(e, "Could not update the request."));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        title="Device requests"
        currentDisplayName={displayName}
        sessionEmail={email}
        onSignOut={() => void signOutAndGoToLogin()}
        nav={navForRole(role, "/requests")}
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-5 max-[361px]:px-3 md:max-w-3xl lg:max-w-5xl lg:px-6">
        <section className="rounded-2xl border border-border bg-card/80 p-3.5 shadow-md shadow-black/15 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-950/50 text-violet-100 ring-1 ring-violet-500/35">
              <InboxIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                ECS IT
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                Devices registered by departments
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Approving adds the device to the inventory under that department (not scanned yet).
                Rejecting sends your note back to the department.
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

          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Request status">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "h-9 rounded-xl border px-3 text-xs font-semibold transition-colors",
                  statusFilter === s
                    ? "border-primary/40 bg-primary/15 text-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : DEVICE_REQUEST_STATUS_LABELS[s]} ({counts[s]})
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tag, serial, room, requester…"
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setShowCharts((v) => !v)}
          aria-expanded={showCharts}
          className="flex h-10 items-center gap-2 self-start rounded-xl border border-border bg-card/60 px-3 text-sm font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        >
          <BarChart3Icon className="size-4 text-violet-300" aria-hidden />
          {showCharts ? "Hide charts" : "Show charts"}
        </button>

        {showCharts ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label="Total requests" value={counts.all} />
              <Kpi label="Waiting" value={counts.pending} tone="amber" />
              <Kpi label="Approval rate" value={insights.approvalRate} tone="emerald" />
              <Kpi label="Avg review time" value={insights.avgReview} tone="violet" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Requests by status">
                <DonutChart
                  data={insights.byStatus}
                  centerLabel="requests"
                  emptyMessage="No requests yet."
                />
              </ChartCard>
              <ChartCard title="Requests by department">
                <HorizontalBars
                  data={insights.byDepartment}
                  tone="violet"
                  emptyMessage="No requests yet."
                />
              </ChartCard>
            </div>
            <ChartCard title="New requests per day" subtitle="Last 14 days">
              <VerticalBars data={insights.perDay} tone="violet" />
            </ChartCard>
          </>
        ) : null}

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

        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
            Loading requests…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            {statusFilter === "pending" ? "No requests waiting. All caught up." : "No requests match."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((r) => (
              <DeviceRequestCard
                key={r.id}
                request={r}
                departmentName={departmentName(departments, r.department_code)}
              >
                {r.status === "pending" ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      disabled={actingId === r.id}
                      placeholder="Note to department (optional)"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={actingId != null}
                        onClick={() => void review(r, "reject")}
                        className="h-10 gap-1.5 rounded-xl border-red-500/40 text-red-100 hover:bg-red-950/40"
                      >
                        <XIcon className="size-4" aria-hidden />
                        Reject
                      </Button>
                      <Button
                        type="button"
                        disabled={actingId != null}
                        onClick={() => void review(r, "approve")}
                        className="h-10 gap-1.5 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                      >
                        {actingId === r.id ? (
                          <Loader2Icon className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckIcon className="size-4" aria-hidden />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                ) : null}
              </DeviceRequestCard>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
