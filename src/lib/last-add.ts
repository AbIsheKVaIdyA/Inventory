const STORAGE_KEY = "inventory-last-add-v1";

export type LastAddSnapshot = {
  location: string;
  manufacturer: string;
  model: string;
  at: string;
};

export function saveLastAdd(input: {
  location: string;
  manufacturer: string;
  model: string;
}) {
  if (typeof window === "undefined") return;
  const snap: LastAddSnapshot = {
    location: input.location.trim(),
    manufacturer: input.manufacturer.trim(),
    model: input.model.trim(),
    at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

export function getLastAdd(): LastAddSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastAddSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.location !== "string") return null;
    return {
      location: parsed.location ?? "",
      manufacturer: typeof parsed.manufacturer === "string" ? parsed.manufacturer : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      at: typeof parsed.at === "string" ? parsed.at : "",
    };
  } catch {
    return null;
  }
}
