import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getInventoryItemsSelectColumns,
  inventoryItemFromRecord,
  type InventoryItemRow,
} from "@/lib/inventory-map";

/** PostgREST (Supabase) defaults to ~1000 rows per response; paginate to load everything. */
const PAGE_SIZE = 1000;

/**
 * Stable key order so `.range()` pages do not duplicate or skip rows.
 * Uses primary key `id`; UI still re-sorts by display label after load.
 */
export async function fetchAllInventoryItemRows(
  sb: SupabaseClient
): Promise<InventoryItemRow[]> {
  const acc: Record<string, unknown>[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await sb
      .from("inventory_items")
      .select(getInventoryItemsSelectColumns())
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = data ?? [];
    if (batch.length === 0) break;

    for (const row of batch) {
      acc.push(row as unknown as Record<string, unknown>);
    }

    from += PAGE_SIZE;
    if (batch.length < PAGE_SIZE) break;
  }

  return acc
    .map((row) => inventoryItemFromRecord(row))
    .filter((r): r is InventoryItemRow => r != null);
}
