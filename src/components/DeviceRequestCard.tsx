import type { ReactNode } from "react";

import {
  DEVICE_REQUEST_STATUS_CLASSES,
  DEVICE_REQUEST_STATUS_LABELS,
  deviceRequestLabel,
  type DeviceRequest,
} from "@/lib/device-requests";
import { cn, formatDateTime } from "@/lib/utils";

type DeviceRequestCardProps = {
  request: DeviceRequest;
  /** Shown on the IT page, where requests from all departments are mixed. */
  departmentName?: string;
  children?: ReactNode;
};

export function DeviceRequestCard({ request: r, departmentName, children }: DeviceRequestCardProps) {
  const details = [r.description, r.manufacturer, r.model].filter(Boolean).join(" · ");
  const requester = r.requested_by_name || r.requested_by_email;

  return (
    <li className="rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3 shadow-sm shadow-black/10 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-base font-semibold text-foreground">{deviceRequestLabel(r)}</p>
          {r.tag_number && r.serial_id ? (
            <p className="font-mono text-xs text-muted-foreground">S/N {r.serial_id}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full border px-2.5 text-[0.7rem] font-semibold",
            DEVICE_REQUEST_STATUS_CLASSES[r.status]
          )}
        >
          {DEVICE_REQUEST_STATUS_LABELS[r.status]}
        </span>
      </div>

      <p className="mt-1.5 text-sm text-foreground">
        {r.location}
        {departmentName ? <span className="text-muted-foreground"> · {departmentName}</span> : null}
      </p>
      {details ? <p className="mt-0.5 text-xs text-muted-foreground">{details}</p> : null}
      {r.notes ? (
        <p className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-xs leading-relaxed text-foreground">
          {r.notes}
        </p>
      ) : null}

      <p className="mt-2 text-[0.7rem] text-muted-foreground">
        Requested {formatDateTime(r.created_at)}
        {requester ? ` by ${requester}` : null}
      </p>
      {r.reviewed_at ? (
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          {r.status === "approved" ? "Approved" : "Rejected"} {formatDateTime(r.reviewed_at)}
          {r.reviewed_by_email ? ` by ${r.reviewed_by_email}` : null}
          {r.review_note ? ` — “${r.review_note}”` : null}
        </p>
      ) : null}

      {children ? <div className="mt-3">{children}</div> : null}
    </li>
  );
}
