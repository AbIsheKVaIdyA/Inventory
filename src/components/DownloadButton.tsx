"use client";

import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { downloadInventorySpreadsheet } from "@/lib/download-inventory-xlsx";
import type { InventoryItemRow } from "@/lib/inventory-map";
import { fetchAllInventoryItemRows } from "@/lib/supabase/fetch-all-inventory-items";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

type DownloadButtonProps = {
  className?: string;
  fallbackRows?: InventoryItemRow[];
};

/** Fetches fresh rows from Supabase, then downloads an Excel (.xlsx) spreadsheet on the device. */
export function DownloadButton({ className, fallbackRows }: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      let rows: InventoryItemRow[] = [];
      try {
        const supabase = getSupabaseBrowserClient();
        rows = await fetchAllInventoryItemRows(supabase);
      } catch {
        rows = fallbackRows ?? [];
      }

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadInventorySpreadsheet(rows, `inventory-items-${stamp}.xlsx`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn(
        "touch-manipulation min-h-12 flex-1 rounded-2xl border-border bg-card/70 px-4 py-3 text-base font-semibold shadow-md shadow-black/20 backdrop-blur-sm sm:flex-none sm:min-h-12 sm:text-[0.9375rem] sm:px-5",
        className
      )}
      disabled={busy}
      aria-busy={busy}
      onClick={() => void handleDownload()}
    >
      {busy ? (
        <>
          <Loader2Icon className="size-5 shrink-0 animate-spin" aria-hidden />
          Spreadsheet…
        </>
      ) : (
        <>
          <DownloadIcon className="size-5 shrink-0 opacity-90" aria-hidden />
          Download spreadsheet
        </>
      )}
    </Button>
  );
}
