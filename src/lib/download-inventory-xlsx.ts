import * as XLSX from "xlsx";

import {
  INVENTORY_CSV_HEADERS,
  inventoryCsvBodyLines,
  type InventoryItemRow,
} from "@/lib/inventory-map";

/** Builds an `.xlsx` workbook from inventory rows using `inventoryCsvBodyLines` row order. */
export function downloadInventorySpreadsheet(
  rows: InventoryItemRow[],
  filename: string
): void {
  const header = [...INVENTORY_CSV_HEADERS];
  const body = inventoryCsvBodyLines(rows);
  const aoa: (string | number)[][] = [header.map(String), ...body];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  const colCount = header.length;
  ws["!cols"] = Array.from({ length: colCount }, (_, colIdx) => {
    let maxLen = header[colIdx]?.length ?? 8;
    for (const row of body) {
      const len = String(row[colIdx] ?? "").length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}
