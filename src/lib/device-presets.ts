/** Click-to-fill presets for Add new — no API required. */

export const MANUFACTURER_PRESETS = ["Dell", "HP", "Lenovo", "Apple", "Microsoft"] as const;

/** Common PC / workstation lines */
export const MODEL_LINE_PRESETS = [
  "OptiPlex",
  "Precision",
  "Latitude",
  "XPS",
  "ThinkCentre",
  "ThinkPad",
  "EliteDesk",
  "ProDesk",
  "Mac mini",
  "iMac",
] as const;

/** Common model / series numbers staff type often */
export const MODEL_NUMBER_PRESETS = [
  "GX280",
  "7010",
  "7020",
  "7040",
  "7050",
  "7060",
  "7070",
  "7080",
  "7090",
  "5000",
  "5050",
  "5070",
  "5090",
  "7000",
  "9000",
  "9020",
  "3040",
  "5040",
] as const;

/**
 * Apply a line chip: set model to the line name (keeps trailing number if already there).
 */
export function applyModelLine(current: string, line: string): string {
  const cur = current.trim();
  if (!cur) return line;
  // Replace known line prefix, keep the rest (usually a number)
  for (const known of MODEL_LINE_PRESETS) {
    const re = new RegExp(`^${escapeReg(known)}\\b\\s*`, "i");
    if (re.test(cur)) {
      const rest = cur.replace(re, "").trim();
      return rest ? `${line} ${rest}` : line;
    }
  }
  if (MODEL_NUMBER_PRESETS.some((n) => cur.toLowerCase() === n.toLowerCase())) {
    return `${line} ${cur}`;
  }
  return line;
}

/** Append / set a model number after the line name. */
export function applyModelNumber(current: string, num: string): string {
  const cur = current.trim();
  if (!cur) return num;
  if (new RegExp(`\\b${escapeReg(num)}\\b`, "i").test(cur)) return cur;
  // If current is only a line, append number
  for (const known of MODEL_LINE_PRESETS) {
    if (cur.toLowerCase() === known.toLowerCase()) return `${known} ${num}`;
  }
  // Replace trailing number-like token
  const replaced = cur.replace(/\s+[A-Za-z]?\d[\w.-]*$/i, "").trim();
  if (replaced && replaced !== cur) return `${replaced} ${num}`;
  return `${cur} ${num}`;
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
