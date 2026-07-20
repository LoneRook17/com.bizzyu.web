// Unit tests for the payouts typed client — the P-B1 contract shape, footing
// math, fee-coverage labels, refund detection, range math, and the CSV
// projection. Runnable with the Node built-in test runner (no extra deps):
// `npm test`.
//
// Guards what a contract shift or bad data would break: (1) numeric coercion +
// missing-array tolerance (Stripe/MySQL can serialize numbers as strings and
// omit empty collections), (2) footing to the penny on the app-fee basis with
// refunds as negative rows, (3) the honest fee-coverage caption, and (4) the
// CSV foots per payout and includes the in_transit block.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeSaleRow,
  normalizePayout,
  normalizePayoutsResponse,
  sumRows,
  computePayoutFooting,
  feeCoverageLabel,
  feeCoverageForRows,
  isRefundRow,
  isAdjustmentRow,
  channelLabel,
  rangeForDays,
  isoDate,
  centsToUsdStr,
  buildPayoutsCsv,
  csvFilename,
  payoutsQuery,
  isNotDeployed,
  DEFAULT_PAYOUT_RANGE_DAYS,
  type SaleRow,
  type PayoutsResponse,
} from "./payouts.ts"

// ── Fixtures: a payout that foots (sale + refund + door), and an in_transit
//    block. Numbers pinned so footing is exact: gross − platform_fee − commission
//    = host_net on each row, and Σ host_net == payout_total. ─────────────────

function row(over: Partial<SaleRow>): SaleRow {
  return normalizeSaleRow({
    sale_date: "2026-07-11",
    sale_channel: "web",
    event: "Soho Saturday's",
    event_date: "2026-07-11",
    event_id: 561,
    ticket_tier: "21+ COVER",
    quantity: 1,
    buyer: "Jane Doe",
    order_id: 88203,
    gross_charged_cents: 2400,
    platform_fee_cents: 400,
    stripe_processing_fee_cents: 104,
    stripe_processing_fee_is_actual: true,
    promoter_commission_cents: 0,
    host_net_cents: 2000,
    payment_intent_id: "pi_web",
    resolved_via: "transfer_group",
    ...over,
  })
}

const FIXTURE: PayoutsResponse = {
  currency: "usd",
  range: { since: "2026-06-01", until: "2026-07-20" },
  in_transit: {
    host_net_cents: 2000,
    ticket_count: 4,
    rows: [row({ payment_intent_id: "pi_it", order_id: 90001, host_net_cents: 2000 })],
  },
  payouts: [
    {
      stripe_payout_id: "po_1TsqLm7bXr4Cd2",
      payout_date: "2026-07-13",
      status: "paid",
      payout_total_cents: 4600, // 2000 (web) + 3000 (door) − 400 (refund)
      ticket_count: 8,
      foots: true,
      fee_coverage: "(incl. est. for 1 of 2 orders)",
      subtotals_by_event: [
        {
          event: "Soho Saturday's",
          event_id: 561,
          by_tier: [{ tier: "21+ COVER", qty: 6, host_net_cents: 3000 }],
          host_net_cents: 4600,
        },
      ],
      rows: [
        row({ payment_intent_id: "pi_web", host_net_cents: 2000 }),
        row({
          sale_channel: "door",
          buyer: null, // door cover has no buyer
          ticket_tier: "GA DOOR",
          quantity: 6,
          gross_charged_cents: 3600,
          platform_fee_cents: 600,
          stripe_processing_fee_cents: null, // door fee not stamped → estimated
          stripe_processing_fee_is_actual: false,
          host_net_cents: 3000,
          payment_intent_id: "pi_door",
          resolved_via: "pi_charge",
        }),
        row({
          sale_channel: "refund (web)",
          gross_charged_cents: -480,
          platform_fee_cents: -80,
          stripe_processing_fee_cents: null,
          promoter_commission_cents: 0,
          host_net_cents: -400,
          payment_intent_id: "pi_web",
          resolved_via: "transfer_group",
        }),
      ],
    },
  ],
  summary: { payout_count: 1, all_foot: true },
}

// ── Normalization ────────────────────────────────────────────────────────────

test("normalizeSaleRow: coerces string numerics, defaults missing, tolerates null buyer", () => {
  const r = normalizeSaleRow({
    sale_channel: "web",
    quantity: "3",
    gross_charged_cents: "2400",
    platform_fee_cents: "400",
    host_net_cents: "2000",
    // buyer, order_id, processing fee, resolved_via all absent
  } as never)
  assert.equal(r.quantity, 3)
  assert.equal(r.gross_charged_cents, 2400)
  assert.equal(r.host_net_cents, 2000)
  assert.equal(r.buyer, null)
  assert.equal(r.order_id, null)
  assert.equal(r.stripe_processing_fee_cents, null) // absent → null, not 0
  assert.equal(r.resolved_via, "unresolved") // unknown → safe default
})

test("normalizePayout: tolerates missing rows/subtotals arrays", () => {
  const p = normalizePayout({ stripe_payout_id: "po_x", status: "paid" } as never)
  assert.deepEqual(p.rows, [])
  assert.deepEqual(p.subtotals_by_event, [])
  assert.equal(p.foots, false)
  assert.equal(p.fee_coverage, "")
})

test("normalizePayoutsResponse: empty body degrades to a valid empty shape", () => {
  const resp = normalizePayoutsResponse({} as never)
  assert.deepEqual(resp.payouts, [])
  assert.deepEqual(resp.in_transit.rows, [])
  assert.equal(resp.in_transit.host_net_cents, 0)
  assert.equal(resp.currency, "usd")
  assert.equal(resp.summary.payout_count, 0)
})

test("normalizePayoutsResponse: invalid status coerces to paid, invalid resolved_via to unresolved", () => {
  const resp = normalizePayoutsResponse({
    payouts: [{ stripe_payout_id: "po_x", status: "weird", rows: [{ sale_channel: "web", resolved_via: "nope" }] }],
  } as never)
  assert.equal(resp.payouts[0].status, "paid")
  assert.equal(resp.payouts[0].rows[0].resolved_via, "unresolved")
})

// ── Footing math (the load-bearing invariant) ────────────────────────────────

test("sumRows: sums each money column and quantity", () => {
  const t = sumRows(FIXTURE.payouts[0].rows)
  assert.equal(t.gross_charged_cents, 3600 + 2400 - 480)
  assert.equal(t.platform_fee_cents, 400 + 600 - 80)
  assert.equal(t.host_net_cents, 2000 + 3000 - 400)
  assert.equal(t.quantity, 1 + 6 + 1)
  // Processing fee summed only where present (door + refund are null → excluded).
  assert.equal(t.stripe_processing_fee_cents, 104)
})

test("computePayoutFooting: rows foot to the penny against payout_total (incl. negative refund)", () => {
  const f = computePayoutFooting(FIXTURE.payouts[0])
  assert.equal(f.hostNetSumCents, 4600)
  assert.equal(f.payoutTotalCents, 4600)
  assert.equal(f.deltaCents, 0)
  assert.equal(f.footsExactly, true)
})

test("computePayoutFooting: a missing row surfaces as a non-zero delta (does NOT silently pass)", () => {
  const broken = { ...FIXTURE.payouts[0], rows: FIXTURE.payouts[0].rows.slice(0, 2) } // drop the refund
  const f = computePayoutFooting(broken)
  assert.equal(f.hostNetSumCents, 5000)
  assert.equal(f.deltaCents, 400) // 5000 − 4600
  assert.equal(f.footsExactly, false)
})

// ── Refund / adjustment classification ───────────────────────────────────────

test("isRefundRow: negative host_net OR refund channel prefix", () => {
  assert.equal(isRefundRow(FIXTURE.payouts[0].rows[2]), true) // refund (web), −400
  assert.equal(isRefundRow(FIXTURE.payouts[0].rows[0]), false) // web sale
  // A refund labeled positive-but-prefixed still counts.
  assert.equal(isRefundRow(row({ sale_channel: "refund (door)", host_net_cents: 0 })), true)
})

test("isAdjustmentRow: adjustment channel prefix", () => {
  assert.equal(isAdjustmentRow(row({ sale_channel: "adjustment:fee_recovery" })), true)
  assert.equal(isAdjustmentRow(FIXTURE.payouts[0].rows[0]), false)
})

test("channelLabel: friendly labels, passthrough for refund/adjustment/line skip", () => {
  assert.equal(channelLabel("apple_pay"), "Apple Pay")
  assert.equal(channelLabel("door"), "Door")
  assert.equal(channelLabel("web"), "Web")
  assert.equal(channelLabel("refund (web)"), "refund (web)")
  assert.equal(channelLabel("line skip (in-app)"), "line skip (in-app)")
})

// ── Fee-coverage label (honest actual/est caption) ───────────────────────────

test("feeCoverageLabel: all actual → empty, none → (est.), mixed → N of M", () => {
  assert.equal(feeCoverageLabel(6, 6), "")
  assert.equal(feeCoverageLabel(0, 6), "(est.)")
  assert.equal(feeCoverageLabel(4, 6), "(incl. est. for 2 of 6 orders)")
  assert.equal(feeCoverageLabel(0, 0), "") // no fee data at all → no caption
})

test("feeCoverageForRows: denominator counts only rows carrying a processing fee", () => {
  // FIXTURE payout: web row has an actual fee; door + refund have null fees.
  // Only 1 row carries a fee, and it's actual → all-actual → empty caption.
  assert.equal(feeCoverageForRows(FIXTURE.payouts[0].rows), "")
  // Two rows with fees, one estimated → mixed caption.
  const rows = [
    row({ stripe_processing_fee_cents: 100, stripe_processing_fee_is_actual: true }),
    row({ stripe_processing_fee_cents: 90, stripe_processing_fee_is_actual: false }),
  ]
  assert.equal(feeCoverageForRows(rows), "(incl. est. for 1 of 2 orders)")
})

// ── Range math ───────────────────────────────────────────────────────────────

test("DEFAULT_PAYOUT_RANGE_DAYS is 90 (a quarter's bookkeeping)", () => {
  assert.equal(DEFAULT_PAYOUT_RANGE_DAYS, 90)
})

test("rangeForDays: inclusive window ending on the given day", () => {
  const now = new Date(2026, 6, 20) // 2026-07-20
  assert.deepEqual(rangeForDays(90, now), { since: "2026-04-22", until: "2026-07-20" })
  assert.deepEqual(rangeForDays(30, now), { since: "2026-06-21", until: "2026-07-20" })
  assert.deepEqual(rangeForDays(1, now), { since: "2026-07-20", until: "2026-07-20" })
})

test("isoDate: zero-pads month and day", () => {
  assert.equal(isoDate(new Date(2026, 0, 5)), "2026-01-05")
  assert.equal(isoDate(new Date(2026, 11, 31)), "2026-12-31")
})

// ── CSV projection ───────────────────────────────────────────────────────────

test("centsToUsdStr: dollar strings incl. negatives; null → empty", () => {
  assert.equal(centsToUsdStr(2400), "24.00")
  assert.equal(centsToUsdStr(-400), "-4.00")
  assert.equal(centsToUsdStr(0), "0.00")
  assert.equal(centsToUsdStr(null), "")
  assert.equal(centsToUsdStr(undefined), "")
})

test("buildPayoutsCsv: header + one row per sale + a footing SUBTOTAL + in_transit block", () => {
  const csv = buildPayoutsCsv(FIXTURE)
  const lines = csv.split("\r\n")
  assert.ok(lines[0].startsWith("stripe_payout_id,payout_date,status,sale_date,sale_channel"))

  // 3 sale rows + 1 subtotal for the payout, then 1 in_transit row + 1 subtotal.
  const subtotals = lines.filter((l) => l.split(",")[2] === "SUBTOTAL")
  assert.equal(subtotals.length, 2)

  // The payout's SUBTOTAL host_net (last-but-known money col) foots to 46.00.
  const payoutSubtotal = subtotals[0].split(",")
  // host_net is the 17th column (index 16).
  assert.equal(payoutSubtotal[16], "46.00")

  // in_transit rows carry a blank stripe_payout_id (sample-CSV behavior).
  const inTransitLine = lines.find((l) => l.includes("pi_it"))!
  assert.equal(inTransitLine.split(",")[0], "") // no payout id
  assert.ok(inTransitLine.split(",")[2].startsWith("in_transit") || inTransitLine.split(",")[2] === "in_transit")
})

test("buildPayoutsCsv: quotes fields containing commas (buyer/event names)", () => {
  const resp: PayoutsResponse = {
    ...FIXTURE,
    in_transit: { host_net_cents: 0, ticket_count: 0, rows: [] },
    payouts: [
      {
        ...FIXTURE.payouts[0],
        rows: [row({ event: "Cinco, de Mayo", buyer: 'O"Brien' })],
      },
    ],
  }
  const csv = buildPayoutsCsv(resp)
  assert.ok(csv.includes('"Cinco, de Mayo"'))
  assert.ok(csv.includes('"O""Brien"')) // doubled quote escaping
})

test("buildPayoutsCsv: empty response → header only, no throw", () => {
  const empty = normalizePayoutsResponse({} as never)
  const csv = buildPayoutsCsv(empty)
  assert.equal(csv.split("\r\n").length, 1) // header row only
})

test("csvFilename: range-scoped and single-payout variants", () => {
  assert.equal(csvFilename({ since: "2026-04-22", until: "2026-07-20" }), "bizzy-payouts-2026-04-22-to-2026-07-20.csv")
  assert.equal(csvFilename({ since: "", until: "" }, "po_abc"), "bizzy-payout-po_abc.csv")
})

// ── Query building + degrade ─────────────────────────────────────────────────

test("payoutsQuery: builds since/until/status, appends venue param and payout_id", () => {
  const q = payoutsQuery({
    range: { since: "2026-04-22", until: "2026-07-20" },
    status: "paid",
    venueParam: "&venue_id=5",
  })
  assert.ok(q.includes("since=2026-04-22"))
  assert.ok(q.includes("until=2026-07-20"))
  assert.ok(q.includes("status=paid"))
  assert.ok(q.includes("&venue_id=5"))
  const withPayout = payoutsQuery({ range: { since: "a", until: "b" }, payoutId: "po_z" })
  assert.ok(withPayout.includes("payout_id=po_z"))
  assert.ok(withPayout.includes("status=all")) // default
})

test("isNotDeployed: only a 404 degrades to zero-state", () => {
  assert.equal(isNotDeployed({ status: 404 }), true)
  assert.equal(isNotDeployed({ status: 500 }), false)
  assert.equal(isNotDeployed(null), false)
  assert.equal(isNotDeployed(new Error("network")), false)
})
