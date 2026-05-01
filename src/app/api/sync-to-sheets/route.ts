import { NextResponse } from "next/server";

import { syncAssetsToGoogleSheetsIfEnabled } from "@/lib/integrations/google-sheets";
import type { Asset } from "@/types/asset";

export const runtime = "nodejs";

function isAssetRow(value: unknown): value is Asset {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const status = row.status;
  const locOk =
    row.location === undefined ||
    row.location === null ||
    typeof row.location === "string";
  return (
    typeof row.id === "string" &&
    typeof row.computer_name === "string" &&
    (status === "pending" || status === "scanned") &&
    locOk
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const list = payload?.assets;
    if (!Array.isArray(list) || !list.every(isAssetRow)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Body must match { assets: Asset[] } with status "pending" | "scanned".',
        },
        { status: 400 }
      );
    }

    const result = await syncAssetsToGoogleSheetsIfEnabled(list as Asset[]);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to synchronize sheet.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
