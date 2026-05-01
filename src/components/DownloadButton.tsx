"use client";

import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import {
  INVENTORY_CSV_HEADERS,
  inventoryRowCsvValues,
  sortInventoryRowsForCsvExport,
  type InventoryItemRow,
} from "@/lib/inventory-map";
import { downloadCsv, toCsv } from "@/lib/csv";
import { fetchAllInventoryItemRows } from "@/lib/supabase/fetch-all-inventory-items";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

type DownloadButtonProps = {
  className?: string;
  fallbackRows?: InventoryItemRow[];
};

/** Fetches fresh rows from Supabase, then downloads CSV on the device. */
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

      const sorted = sortInventoryRowsForCsvExport(rows);
      const header = [...INVENTORY_CSV_HEADERS];
      const csv = toCsv(
        header,
        sorted.map((r) => inventoryRowCsvValues(r))
      );

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadCsv(`inventory-items-${stamp}.csv`, csv);
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
        "min-h-12 flex-1 rounded-2xl border-border bg-card/70 px-4 py-3 text-[0.9375rem] font-semibold shadow-md shadow-black/20 backdrop-blur-sm sm:flex-none sm:min-h-12 sm:px-5",
        className
      )}
      disabled={busy}
      aria-busy={busy}
      onClick={() => void handleDownload()}
    >
      {busy ? (
        <>
          <Loader2Icon className="size-5 animate-spin shrink-0" aria-hidden />
          CSV…
        </>
      ) : (
        <>
          <DownloadIcon className="size-5 shrink-0 opacity-90" aria-hidden />
          Latest CSV
        </>
      )}
    </Button>
  );
}
