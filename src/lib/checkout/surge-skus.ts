/**
 * Guest SURGE display-only. One Cover SKU. Live tickets.price_usd.
 *
 * Leftover `-surge-N` / `cover_surge_*` rows were extra tickets from the old
 * expander. Fold them until that data dies. Do not invent a second Cover.
 * Charge still goes by ticket_id to services — this only hides the fake SKU.
 */

const SURGE_EXTRA_KEY = /(?:-surge-|cover_surge_)/i

export function leftoverSurgeSkuKey(tier: unknown): string {
  if (!tier || typeof tier !== "object") return ""
  const row = tier as Record<string, unknown>
  const raw = row.tier_key ?? row.template_tier_key ?? row.tierKey
  return raw == null ? "" : String(raw)
}

/** Old expander leftovers. Host `collapseTiers` already folds `-surge-`. */
export function isLeftoverSurgeSku(tier: unknown): boolean {
  const key = leftoverSurgeSkuKey(tier)
  return key !== "" && SURGE_EXTRA_KEY.test(key)
}

function isCoverName(name: unknown): boolean {
  const n = String(name ?? "").trim().toLowerCase()
  return n === "" || n === "cover"
}

/**
 * Drop leftover surge extra rows. Keep Skip the Line. Keep the first Cover
 * at its live price_usd. If every row is an extra, keep the first so checkout
 * is not blanked.
 */
export function foldLeftoverSurgeSkus<T>(tiers: T[]): T[] {
  if (tiers.length === 0) return tiers
  const parents = tiers.filter((tier) => !isLeftoverSurgeSku(tier))
  const source = parents.length > 0 ? parents : [tiers[0]]
  const out: T[] = []
  let keptCover = false
  for (const tier of source) {
    const name =
      tier && typeof tier === "object" ? (tier as { name?: unknown }).name : undefined
    if (isCoverName(name)) {
      if (keptCover) continue
      keptCover = true
    }
    out.push(tier)
  }
  return out
}
