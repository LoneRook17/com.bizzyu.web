/**
 * Per-person ticket caps. Same convention as quantity: empty or 0 means
 * unlimited / no max. Values >= 1 are a real cap.
 */
export function persistMaxPerPerson(raw: string): number | null {
  const n = parseInt(raw.trim(), 10)
  return Number.isFinite(n) && n >= 1 ? n : null
}
