import * as XLSX from "xlsx";

import {
  ROOM_ASSIGNMENT_HEADERS,
  roomAssignmentValues,
  type RoomAssignmentInsert,
} from "@/lib/room-assignments";

/** Builds an `.xlsx` workbook matching the room spreadsheet column order. */
export function downloadRoomAssignmentsSpreadsheet(
  rows: RoomAssignmentInsert[],
  filename: string
): void {
  const header = [...ROOM_ASSIGNMENT_HEADERS];
  const body = rows.map((r) => roomAssignmentValues(r));
  const aoa: (string | number)[][] = [header, ...body];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rooms");

  ws["!cols"] = header.map((h, colIdx) => {
    let maxLen = h.length;
    for (const row of body) {
      maxLen = Math.max(maxLen, String(row[colIdx] ?? "").length);
    }
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}
