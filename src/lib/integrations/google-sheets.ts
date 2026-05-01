import type { Asset } from "@/types/asset";

export function isGoogleSheetsSyncEnabled(): boolean {
  return process.env.GOOGLE_SHEETS_SYNC_ENABLED === "true";
}

async function appendSheetValues(values: string[][]) {
  const { google } = await import("googleapis");

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const pk = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !pk || !spreadsheetId) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, or GOOGLE_SHEETS_SPREADSHEET_ID"
    );
  }

  const jwt = new google.auth.JWT({
    email,
    key: pk,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  await jwt.authorize();

  const sheets = google.sheets({ version: "v4", auth: jwt });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Sheet1!A:Z",
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

/** Full snapshot sync. No-op module side effects when sync is disabled. */
export async function syncAssetsToGoogleSheetsIfEnabled(
  assets: Asset[]
): Promise<{ ok: true; skipped?: true }> {
  if (!isGoogleSheetsSyncEnabled()) {
    return { ok: true, skipped: true };
  }

  const header = [
    "id",
    "computer_name",
    "location",
    "status",
    "scanned_by",
    "scanned_at",
  ];

  const rows: string[][] = [
    header,
    ...assets.map((a) => [
      a.id,
      a.computer_name,
      a.location ?? "",
      a.status,
      a.scanned_by ?? "",
      a.scanned_at ?? "",
    ]),
  ];

  await appendSheetValues(rows);
  return { ok: true };
}
