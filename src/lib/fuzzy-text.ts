/** Strip to lowercase letters/digits so "ECSS 3.502" ≈ "ecss3502". */
export function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);

  for (let j = 0; j < cols; j++) prev[j] = j;

  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

/** Best edit distance of `needle` against any window of `hay` of similar length. */
export function bestWindowDistance(hay: string, needle: string): number {
  if (!needle) return hay.length;
  if (!hay) return needle.length;
  if (hay.includes(needle)) return 0;
  if (hay.length <= needle.length) return levenshtein(hay, needle);

  let best = Infinity;
  const span = needle.length;
  const maxExtra = Math.min(2, Math.max(1, Math.floor(span / 4)));
  for (let len = Math.max(1, span - maxExtra); len <= span + maxExtra; len++) {
    for (let i = 0; i + len <= hay.length; i++) {
      const d = levenshtein(hay.slice(i, i + len), needle);
      if (d < best) best = d;
      if (best === 0) return 0;
    }
  }
  return best;
}

export function fuzzyDistanceThreshold(normalizedQueryLen: number): number {
  if (normalizedQueryLen <= 3) return 0;
  if (normalizedQueryLen <= 5) return 1;
  if (normalizedQueryLen <= 9) return 2;
  return 3;
}
