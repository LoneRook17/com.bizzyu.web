// Sales tax withheld on event analytics (Update ALPHA).
//
// `revenue.revenue` on `GET /business/insights/events/:id` is the host's
// take-home, NET of sales tax. On a venue with tax-INCLUDED pricing the face
// price contains tax the host never keeps; the API reports that carve-out as
// `revenue.tax_withheld_cents` (integer cents, included mode only, fully
// refunded orders excluded). The Revenue card renders it as ONE row directly
// above Tips: "$X of revenue withheld for sales tax" — and only when it is
// positive. A venue taxed ON TOP, or untaxed, reports 0 and shows nothing;
// nothing else on the card changes. A period that switched mode mid-way
// carries only its included-mode tax.
//
// The field is absent on services deploys that predate it, so every reader
// goes through taxWithheldCents() and treats missing / null / NaN / negative
// as 0. The web never computes tax itself and never adds it back into Revenue.
//
// No imports on purpose, so `node --test` can load this file on its own.

type RevenueWithTax = {
  tax_withheld_cents?: unknown
} | null | undefined

/** Copy after the amount on the withheld row. */
export const TAX_WITHHELD_SUFFIX = " of revenue withheld for sales tax"

function safeCents(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0
  return Math.round(n)
}

/** Included-mode sales tax withheld from Revenue, in integer cents. Missing, null, NaN or negative reads as 0. */
export function taxWithheldCents(revenue: RevenueWithTax): number {
  return safeCents(revenue?.tax_withheld_cents)
}

/** Same figure in USD, for `usd()`. */
export function taxWithheldUsd(revenue: RevenueWithTax): number {
  return taxWithheldCents(revenue) / 100
}

/** Should the Revenue card show the withheld row? Only when there is included-mode tax. */
export function hasTaxWithheld(revenue: RevenueWithTax): boolean {
  return taxWithheldCents(revenue) > 0
}

/** The whole row: "$1.67 of revenue withheld for sales tax". `formatUsd` is the view's money formatter. */
export function taxWithheldLabel(revenue: RevenueWithTax, formatUsd: (n: number) => string): string {
  return `${formatUsd(taxWithheldUsd(revenue))}${TAX_WITHHELD_SUFFIX}`
}
