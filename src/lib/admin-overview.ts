import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChartDatum } from "@/components/charts";
import { fetchDepartments } from "@/lib/departments";
import { DEVICE_REQUEST_STATUS_LABELS, type DeviceRequestStatus } from "@/lib/device-requests";
import { ROLE_LABELS, parseRole, type AppRole } from "@/lib/roles";

export type AdminOverviewStats = {
  devices: number | null;
  unassigned: number | null;
  pendingRequests: number | null;
  pendingUsers: number | null;
  users: number | null;
  linkedRooms: number | null;
  departments: number | null;
};

export type AdminOverviewData = {
  stats: AdminOverviewStats;
  inventoryStatus: ChartDatum[];
  devicesByDepartment: ChartDatum[];
  usersByRole: ChartDatum[];
  requestsByStatus: ChartDatum[];
  /** `scanned_at` of devices resolved in the last 14 days (bucketed per day in the browser's timezone). */
  recentScanTimes: string[];
};

const PAGE_SIZE = 1000;
const TREND_DAYS = 14;

const ROLE_TONES: Record<AppRole, ChartDatum["tone"]> = {
  admin: "violet",
  it: "sky",
  department: "cyan",
  scanner: "emerald",
  pending: "amber",
};

const REQUEST_TONES: Record<DeviceRequestStatus, ChartDatum["tone"]> = {
  pending: "amber",
  approved: "emerald",
  rejected: "red",
};

type CountQuery = PromiseLike<{ count: number | null; error: unknown }>;

async function count(query: CountQuery): Promise<number | null> {
  const { count: n, error } = await query;
  return error ? null : n;
}

async function fetchRecentScanTimes(sb: SupabaseClient): Promise<string[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (TREND_DAYS + 1));
  const out: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from("inventory_items")
      .select("scanned_at")
      .gte("scanned_at", since.toISOString())
      .order("scanned_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return out;
    const batch = data ?? [];
    for (const row of batch) {
      if (typeof row.scanned_at === "string") out.push(row.scanned_at);
    }
    if (batch.length < PAGE_SIZE) return out;
  }
}

export async function loadAdminOverview(sb: SupabaseClient): Promise<AdminOverviewData> {
  const head = { count: "exact" as const, head: true };
  const departments = await fetchDepartments(sb).catch(() => []);

  const [
    devices,
    unassigned,
    scanned,
    notFound,
    pendingUsers,
    linkedRooms,
    deptCounts,
    profilesRes,
    requestsRes,
    recentScanTimes,
  ] = await Promise.all([
    count(sb.from("inventory_items").select("id", head)),
    count(sb.from("inventory_items").select("id", head).is("department_code", null)),
    count(sb.from("inventory_items").select("id", head).eq("scan_status", "scanned")),
    count(sb.from("inventory_items").select("id", head).eq("scan_status", "not_found")),
    count(sb.from("user_profiles").select("user_id", head).eq("role", "pending")),
    count(sb.from("room_department_map").select("location", head)),
    Promise.all(
      departments.map((d) =>
        count(sb.from("inventory_items").select("id", head).eq("department_code", d.code))
      )
    ),
    sb.from("user_profiles").select("role"),
    sb.from("device_requests").select("status"),
    fetchRecentScanTimes(sb),
  ]);

  const roleCounts = new Map<AppRole, number>();
  for (const row of profilesRes.data ?? []) {
    const role = parseRole(row.role);
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  const requestCounts = new Map<DeviceRequestStatus, number>();
  for (const row of requestsRes.data ?? []) {
    const status = row.status as DeviceRequestStatus;
    if (status in DEVICE_REQUEST_STATUS_LABELS) {
      requestCounts.set(status, (requestCounts.get(status) ?? 0) + 1);
    }
  }

  const pendingScan =
    devices != null && scanned != null && notFound != null ? devices - scanned - notFound : 0;

  return {
    stats: {
      devices,
      unassigned,
      pendingRequests: requestCounts.get("pending") ?? 0,
      pendingUsers,
      users: profilesRes.data?.length ?? null,
      linkedRooms,
      departments: departments.length,
    },
    inventoryStatus: [
      { label: "Scanned", value: scanned ?? 0, tone: "emerald" },
      { label: "Not found", value: notFound ?? 0, tone: "red" },
      { label: "Still to scan", value: Math.max(pendingScan, 0), tone: "amber" },
    ],
    devicesByDepartment: [
      ...departments.map((d, i) => ({ label: d.name, value: deptCounts[i] ?? 0 })),
      { label: "No department yet", value: unassigned ?? 0, tone: "slate" as const },
    ],
    usersByRole: (Object.keys(ROLE_LABELS) as AppRole[])
      .map((role) => ({ label: ROLE_LABELS[role], value: roleCounts.get(role) ?? 0, tone: ROLE_TONES[role] }))
      .filter((d) => d.value > 0),
    requestsByStatus: (Object.keys(DEVICE_REQUEST_STATUS_LABELS) as DeviceRequestStatus[]).map(
      (status) => ({
        label: DEVICE_REQUEST_STATUS_LABELS[status],
        value: requestCounts.get(status) ?? 0,
        tone: REQUEST_TONES[status],
      })
    ),
    recentScanTimes,
  };
}
