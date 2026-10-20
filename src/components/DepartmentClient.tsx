"use client";

import {
  Building2Icon,
  Loader2Icon,
  PackagePlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChartCard,
  DonutChart,
  HorizontalBars,
  ProgressBars,
  countBy,
  type ProgressRow,
} from "@/components/charts";
import { DeviceRequestCard } from "@/components/DeviceRequestCard";
import { DeviceRequestForm } from "@/components/DeviceRequestForm";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { fetchDepartmentDevices, type DepartmentDevice } from "@/lib/department-devices";
import { departmentName, type Department } from "@/lib/departments";
import {
  fetchDeviceRequests,
  type DeviceRequest,
  type DeviceRequestInsert,
} from "@/lib/device-requests";
import { navForRole, type AppRole } from "@/lib/roles";
import { signOutAndGoToLogin } from "@/lib/sign-out";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn, errorMessage } from "@/lib/utils";

type DepartmentClientProps = {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  ownDepartmentCode: string | null;
  departments: Department[];
};

type Tab = "systems" | "requests" | "insights";

type DepartmentData = { devices: DepartmentDevice[]; requests: DeviceRequest[] };

const SCAN_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  scanned: { label: "Scanned", className: "border-emerald-500/40 bg-emerald-950/45 text-emerald-100" },
  not_found: { label: "Not found", className: "border-red-500/40 bg-red-950/45 text-red-100" },
  pending: { label: "Not scanned yet", className: "border-border bg-muted/40 text-muted-foreground" },
};

async function loadDepartmentData(code: string): Promise<DepartmentData> {
  const sb = getSupabaseBrowserClient();
  const [devices, requests] = await Promise.all([
    fetchDepartmentDevices(sb, code),
    fetchDeviceRequests(sb, code),
  ]);
  return { devices, requests };
}

export function DepartmentClient({
  userId,
  email,
  displayName,
  role,
  ownDepartmentCode,
  departments,
}: DepartmentClientProps) {
  const isAdmin = role === "admin";
  const [selectedCode, setSelectedCode] = useState<string | null>(
    isAdmin ? (departments[0]?.code ?? null) : ownDepartmentCode
  );
  const [data, setData] = useState<DepartmentData>({ devices: [], requests: [] });
  const [loading, setLoading] = useState(selectedCode != null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("systems");
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const deptName = departmentName(departments, selectedCode);

  const reload = useCallback(async () => {
    if (!selectedCode) return;
    setLoading(true);
    setError(null);
    try {
      setData(await loadDepartmentData(selectedCode));
    } catch (e) {
      setError(errorMessage(e, "Could not load department data."));
    } finally {
      setLoading(false);
    }
  }, [selectedCode]);

  useEffect(() => {
    if (!selectedCode) return;
    let cancelled = false;
    void loadDepartmentData(selectedCode)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e, "Could not load department data."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  function switchDepartment(code: string) {
    setSelectedCode(code);
    setData({ devices: [], requests: [] });
    setLoading(true);
    setError(null);
    setNotice(null);
    setRoomFilter("");
    setFormOpen(false);
  }

  const rooms = useMemo(() => {
    const set = new Set<string>();
    for (const d of data.devices) {
      const loc = d.location?.trim();
      if (loc) set.add(loc);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data.devices]);

  const filteredDevices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.devices.filter((d) => {
      if (roomFilter && d.location?.trim() !== roomFilter) return false;
      if (!q) return true;
      return [d.tag_number, d.serial_id, d.location, d.manufacturer, d.model, d.description]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data.devices, query, roomFilter]);

  const pendingRequests = data.requests.filter((r) => r.status === "pending").length;
  const scannedCount = data.devices.filter((d) => d.scan_status === "scanned").length;

  const insights = useMemo(() => {
    const byRoom = new Map<string, ProgressRow>();
    let notFound = 0;
    for (const d of data.devices) {
      if (d.scan_status === "not_found") notFound += 1;
      const room = d.location?.trim() || "No room on file";
      const entry = byRoom.get(room) ?? { label: room, done: 0, total: 0 };
      entry.total += 1;
      if (d.scan_status !== "pending") entry.done += 1;
      byRoom.set(room, entry);
    }
    const statusCount = (s: DeviceRequest["status"]) =>
      data.requests.filter((r) => r.status === s).length;
    return {
      scanStatus: [
        { label: "Scanned", value: scannedCount, tone: "emerald" as const },
        { label: "Not found", value: notFound, tone: "red" as const },
        {
          label: "Not scanned yet",
          value: data.devices.length - scannedCount - notFound,
          tone: "amber" as const,
        },
      ],
      rooms: [...byRoom.values()].sort((a, b) => b.total - a.total).slice(0, 10),
      brands: countBy(data.devices, (d) => d.manufacturer?.trim() || "Unknown brand", 6),
      models: countBy(data.devices, (d) => d.model?.trim() || "Unknown model", 8),
      requests: [
        { label: "Waiting for IT", value: statusCount("pending"), tone: "amber" as const },
        { label: "Approved", value: statusCount("approved"), tone: "emerald" as const },
        { label: "Rejected", value: statusCount("rejected"), tone: "red" as const },
      ],
    };
  }, [data, scannedCount]);

  async function submitRequest(payload: DeviceRequestInsert) {
    setBusy(true);
    setError(null);
    try {
      const { error: insertError } = await getSupabaseBrowserClient()
        .from("device_requests")
        .insert(payload);
      if (insertError) throw insertError;
      setFormOpen(false);
      setTab("requests");
      setNotice("Request sent to ECS IT. You'll see it here once they review it.");
      await reload();
    } catch (e) {
      setError(errorMessage(e, "Could not send the request."));
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest(id: string) {
    setCancellingId(id);
    setError(null);
    try {
      const { error: deleteError } = await getSupabaseBrowserClient()
        .from("device_requests")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      setData((prev) => ({ ...prev, requests: prev.requests.filter((r) => r.id !== id) }));
      setNotice("Request cancelled.");
    } catch (e) {
      setError(errorMessage(e, "Could not cancel the request."));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        title={isAdmin ? "Departments" : "My department"}
        currentDisplayName={displayName}
        sessionEmail={email}
        onSignOut={() => void signOutAndGoToLogin()}
        nav={navForRole(role, "/department")}
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-5 max-[361px]:px-3 md:max-w-3xl lg:max-w-5xl lg:px-6">
        <section className="rounded-2xl border border-border bg-card/80 p-3.5 shadow-md shadow-black/15 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-950/50 text-cyan-100 ring-1 ring-cyan-500/35">
              <Building2Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Erik Jonsson School · Department
              </p>
              {isAdmin ? (
                <select
                  value={selectedCode ?? ""}
                  onChange={(e) => switchDepartment(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                  aria-label="Department"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-0.5 text-base font-semibold text-foreground">{deptName}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">{data.devices.length}</span>{" "}
                systems ·{" "}
                <span className="font-semibold tabular-nums text-foreground">{scannedCount}</span> scanned ·{" "}
                <span className="font-semibold tabular-nums text-foreground">{pendingRequests}</span>{" "}
                request{pendingRequests === 1 ? "" : "s"} waiting for IT
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!selectedCode || formOpen}
              onClick={() => {
                setFormKey((k) => k + 1);
                setFormOpen(true);
                setNotice(null);
              }}
              className="h-10 gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 font-semibold text-white hover:from-cyan-500 hover:to-teal-500"
            >
              <PackagePlusIcon className="size-4" aria-hidden />
              Register a device
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !selectedCode}
              onClick={() => void reload()}
              className="h-10 rounded-xl"
            >
              {loading ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCwIcon className="size-4 opacity-80" aria-hidden />
              )}
              Refresh
            </Button>
          </div>
        </section>

        {!selectedCode ? (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            Your account has no department yet. Ask an admin to set it.
          </section>
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

        {formOpen && selectedCode ? (
          <DeviceRequestForm
            key={formKey}
            departmentCode={selectedCode}
            departmentName={deptName}
            knownRooms={rooms}
            busy={busy}
            onSubmit={(payload) => void submitRequest(payload)}
            onCancel={() => setFormOpen(false)}
          />
        ) : null}

        <div className="flex gap-2" role="tablist" aria-label="Department view">
          {(
            [
              ["systems", `Systems (${data.devices.length})`],
              ["requests", `My requests (${data.requests.length})`],
              ["insights", "Insights"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "h-10 flex-1 rounded-xl border px-3 text-sm font-semibold transition-colors sm:flex-none",
                tab === value
                  ? "border-primary/40 bg-primary/15 text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && data.devices.length === 0 && data.requests.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : tab === "insights" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Scan status" subtitle={`${deptName} systems`}>
                <DonutChart
                  data={insights.scanStatus}
                  centerLabel="systems"
                  emptyMessage="No systems linked to this department yet."
                />
              </ChartCard>
              <ChartCard title="Brands" subtitle="Manufacturer on file">
                <DonutChart
                  data={insights.brands}
                  centerLabel="systems"
                  emptyMessage="No systems linked to this department yet."
                />
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Rooms" subtitle="Scanned out of total · largest rooms first">
                <ProgressBars
                  rows={insights.rooms}
                  emptyMessage="No systems linked to this department yet."
                />
              </ChartCard>
              <ChartCard title="Top models">
                <HorizontalBars
                  data={insights.models}
                  tone="cyan"
                  emptyMessage="No systems linked to this department yet."
                />
              </ChartCard>
            </div>
            <ChartCard title="My device requests" subtitle="Sent to ECS IT">
              <DonutChart
                data={insights.requests}
                centerLabel="requests"
                emptyMessage="No requests yet."
              />
            </ChartCard>
          </div>
        ) : tab === "systems" ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block min-w-0 flex-1">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tag, serial, model, room…"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
                aria-label="Filter by room"
              >
                <option value="">All rooms ({rooms.length})</option>
                {rooms.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            {filteredDevices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                {data.devices.length === 0
                  ? "No systems are linked to this department yet. Rooms get linked by an admin under Room mapping."
                  : "No systems match this search."}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {filteredDevices.map((d) => {
                  const status = SCAN_STATUS_LABEL[d.scan_status] ?? SCAN_STATUS_LABEL.pending;
                  const details = [d.description, d.manufacturer, d.model].filter(Boolean).join(" · ");
                  return (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3 shadow-sm shadow-black/10 sm:px-4"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {d.tag_number || d.serial_id || "No tag"}
                        </p>
                        <p className="mt-0.5 text-sm text-foreground">{d.location || "No room on file"}</p>
                        {details ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{details}</p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[0.7rem] font-semibold",
                          status.className
                        )}
                      >
                        {status.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : data.requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            No requests yet. Use “Register a device” to send one to ECS IT.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.requests.map((r) => (
              <DeviceRequestCard key={r.id} request={r}>
                {r.status === "pending" && r.requested_by === userId ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={cancellingId === r.id}
                    onClick={() => void cancelRequest(r.id)}
                    className="h-9 rounded-xl text-xs"
                  >
                    {cancellingId === r.id ? (
                      <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                    ) : null}
                    Cancel request
                  </Button>
                ) : null}
              </DeviceRequestCard>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
