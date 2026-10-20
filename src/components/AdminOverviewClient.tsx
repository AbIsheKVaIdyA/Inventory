"use client";

import {
  ArrowRightIcon,
  Building2Icon,
  InboxIcon,
  ScanLineIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import {
  ChartCard,
  DonutChart,
  HorizontalBars,
  Kpi,
  VerticalBars,
  countPerDay,
} from "@/components/charts";
import { Header } from "@/components/Header";
import { buttonVariants } from "@/components/ui/button";
import type { AdminOverviewData } from "@/lib/admin-overview";
import { navForRole, type AppRole } from "@/lib/roles";
import { signOutAndGoToLogin } from "@/lib/sign-out";
import { cn } from "@/lib/utils";

type Perspective = {
  role: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  stat: string;
  links: { href: string; label: string }[];
};

function n(value: number | null): string {
  return value == null ? "—" : value.toLocaleString();
}

export function AdminOverviewClient({
  email,
  displayName,
  role,
  overview,
}: {
  email: string;
  displayName: string;
  role: AppRole;
  overview: AdminOverviewData;
}) {
  const { stats } = overview;
  const scansPerDay = useMemo(
    () => countPerDay(overview.recentScanTimes, 14),
    [overview.recentScanTimes]
  );
  const resolved = overview.inventoryStatus
    .filter((d) => d.label !== "Still to scan")
    .reduce((sum, d) => sum + d.value, 0);
  const progress =
    stats.devices && stats.devices > 0 ? `${Math.round((resolved / stats.devices) * 100)}%` : "—";

  const perspectives: Perspective[] = [
    {
      role: "Scan team",
      title: "Scan queue",
      description: "Floor scanning: pick a room, scan devices, mark rooms done, export to Excel.",
      icon: ScanLineIcon,
      accent: "bg-sky-950/50 text-sky-100 ring-sky-500/35",
      stat: `${n(stats.devices)} devices in inventory`,
      links: [
        { href: "/dashboard", label: "Open scan queue" },
        { href: "/dashboard/room-submissions", label: "Room submissions" },
      ],
    },
    {
      role: "ECS IT",
      title: "Device requests",
      description: "Devices registered by departments. Approve to add them to the inventory, or reject with a note.",
      icon: InboxIcon,
      accent: "bg-violet-950/50 text-violet-100 ring-violet-500/35",
      stat: `${n(stats.pendingRequests)} waiting for review`,
      links: [{ href: "/requests", label: "Open device requests" }],
    },
    {
      role: "Department",
      title: "Department systems",
      description:
        "What a department sees: only its own systems, plus Register a device. As admin you can switch between all departments.",
      icon: Building2Icon,
      accent: "bg-cyan-950/50 text-cyan-100 ring-cyan-500/35",
      stat: `${n(stats.departments)} departments · ${n(stats.linkedRooms)} rooms linked`,
      links: [{ href: "/department", label: "Open department view" }],
    },
    {
      role: "Admin",
      title: "Users & room mapping",
      description:
        "Give each account its role and department, and link rooms to departments so devices show up for them.",
      icon: ShieldCheckIcon,
      accent: "bg-primary/15 text-primary ring-primary/25",
      stat: `${n(stats.users)} accounts · ${n(stats.pendingUsers)} waiting for a role · ${n(stats.unassigned)} devices without a department`,
      links: [
        { href: "/admin/users", label: "Manage users" },
        { href: "/admin/rooms", label: "Room mapping" },
      ],
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        title="Admin overview"
        currentDisplayName={displayName}
        sessionEmail={email}
        onSignOut={() => void signOutAndGoToLogin()}
        nav={navForRole(role, "/admin")}
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-8 pt-5 max-[361px]:px-3 md:max-w-3xl lg:max-w-6xl lg:px-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Devices" value={n(stats.devices)} />
          <Kpi label="Scan progress" value={progress} tone="emerald" />
          <Kpi label="Requests waiting" value={n(stats.pendingRequests)} tone="amber" />
          <Kpi label="Accounts" value={n(stats.users)} tone="violet" />
          <Kpi label="Rooms linked" value={n(stats.linkedRooms)} tone="cyan" />
          <Kpi label="No department" value={n(stats.unassigned)} tone="red" />
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Every role has its own page. Open any of them below to see exactly what that role works with.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {perspectives.map((p) => (
            <section
              key={p.role}
              className="flex flex-col rounded-2xl border border-border bg-card/80 p-4 shadow-md shadow-black/15"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1",
                    p.accent
                  )}
                >
                  <p.icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {p.role} page
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-foreground">{p.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              <p className="mt-2 text-xs font-medium text-foreground">{p.stat}</p>
              <div className="mt-4 flex flex-1 flex-wrap items-end gap-2">
                {p.links.map((l, i) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      buttonVariants({ variant: i === 0 ? "default" : "outline" }),
                      "inline-flex h-10 items-center gap-1.5 rounded-xl"
                    )}
                  >
                    {l.label}
                    {i === 0 ? <ArrowRightIcon className="size-4" aria-hidden /> : null}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <h2 className="mt-2 text-base font-semibold text-foreground">Insights</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Inventory scan status" subtitle="All devices on file">
            <DonutChart data={overview.inventoryStatus} centerLabel="devices" />
          </ChartCard>
          <ChartCard title="Devices per department" subtitle="Through room mapping">
            <HorizontalBars data={overview.devicesByDepartment} tone="cyan" />
          </ChartCard>
        </div>

        <ChartCard title="Scans per day" subtitle="Devices scanned or marked not found · last 14 days">
          <VerticalBars data={scansPerDay} tone="emerald" />
        </ChartCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Accounts by role" subtitle="Who can sign in, and as what">
            <DonutChart
              data={overview.usersByRole}
              centerLabel="accounts"
              emptyMessage="No accounts yet."
            />
          </ChartCard>
          <ChartCard title="Device requests" subtitle="From departments to ECS IT">
            <DonutChart
              data={overview.requestsByStatus}
              centerLabel="requests"
              emptyMessage="No device requests yet."
            />
          </ChartCard>
        </div>
      </main>
    </div>
  );
}
