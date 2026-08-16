// The cost breakdown shown before a line-skip buyer pays (LSK-25).
//
// A buyer entering their phone number saw only a single total, so the service
// fee first appeared as a line item on the payment step — after they had
// committed. The events checkout does not do this: bizzy-deals.com's
// checkout.blade.php renders an "Order Summary" card (Subtotal / Service Fee /
// Total, plus a Discount row when a promo applies) alongside the form. This is
// the line-skip equivalent.
//
// It is presentation only. The money is computed by calcFees() in
// LineSkipCheckoutClient and is NOT recomputed here — the caller passes the
// same `fees` object that drives the payment request and the in-page order
// summary, so the three cannot disagree.
//
// Field meanings, straight from calcFees():
//   subtotal    — pre-discount line total (price_cents * quantity)
//   discount    — promo discount across all tickets, 0 when none
//   service_fee — flat + percentage platform fee, 0 when the sale is free
//   total       — (subtotal - discount) + service_fee, i.e. what is charged

export interface LineSkipFees {
  subtotal: number
  discount: number
  service_fee: number
  total: number
}

export type SummaryRowKind = "subtotal" | "discount" | "fee" | "total"

export interface SummaryRow {
  kind: SummaryRowKind
  label: string
  /** Cents. Negative on the discount row, which is rendered as "-$x.xx". */
  cents: number
  /** Render the word "Free" instead of an amount. */
  free: boolean
}

/**
 * The rows to render, in order. The discount row is present only when a promo
 * actually reduced the price, matching both the in-page summary and the events
 * blade (which keeps its discount row display:none until one applies).
 *
 * Quantity only ever decorates the subtotal label — it is already baked into
 * every figure.
 */
export function orderSummaryRows(fees: LineSkipFees, quantity: number): SummaryRow[] {
  const rows: SummaryRow[] = [
    {
      kind: "subtotal",
      label: quantity > 1 ? `Subtotal (× ${quantity})` : "Subtotal",
      cents: fees.subtotal,
      free: false,
    },
  ]

  if (fees.discount > 0) {
    rows.push({ kind: "discount", label: "Promo discount", cents: -fees.discount, free: false })
  }

  rows.push({
    kind: "fee",
    label: "Service fee",
    cents: fees.service_fee,
    free: fees.service_fee === 0,
  })

  rows.push({ kind: "total", label: "Total", cents: fees.total, free: fees.total === 0 })

  return rows
}

/**
 * True when the rows add up to the total being charged.
 *
 * This is the property that makes the breakdown trustworthy: a buyer must be
 * able to add up what they see and land on the amount that leaves their card.
 * Exported so it can be asserted directly in tests rather than re-derived.
 */
export function summaryReconciles(fees: LineSkipFees): boolean {
  return fees.subtotal - fees.discount + fees.service_fee === fees.total
}
