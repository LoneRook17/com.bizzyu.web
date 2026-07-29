// Unit tests for the payout RECONCILIATION typed client (P2-B1s contract). Runs
// under the Node built-in test runner (`npm test`), no extra deps.
//
// Covers what a contract shift or bad data would break:
//  (1) defensive normalization — numeric coercion + missing-array tolerance,
//  (2) the ties check (server flag AND arithmetic must agree),
//  (3) the exact net-line math ("Ticket sales + Door covers − Refunds = Deposited"),
//  (4) event → tier GROUPING survives normalization,
//  (5) PII gating — order rows appear ONLY when details are toggled on,
//  (6) the copyable short-id, and
//  (7) the per-deposit CSV mirrors the panel and foots.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeSummary,
  normalizeDeposit,
  normalizeDeposits,
  normalizeReconciliation,
  tiesCheck,
  netLineParts,
  totalTicketQty,
  visibleOrderRows,
  showCommissionColumn,
  shortPayoutId,
  buildDepositCsv,
  buildDepositPdfHtml,
  depositExportFilename,
  reconcileQuery,
  summaryRenderState,
  summaryTilesFor,
  sharedAccountCaveat,
  dedicatedReassurance,
  customWindow,
  isIsoDate,
  untilIsPast,
  VENUE_TILE_LABELS,
  COMBINED_ACCOUNT_LABEL,
  DEDICATED_BADGE_LABEL,
  IN_TRANSIT_PAST_UNTIL_NOTE,
  type PayoutsSummary,
  type Reconciliation,
  type ReconOrderRow,
} from "./payouts-reconcile.ts"

// ── Fixtures: a deposit that TIES (two events, a door cover, a refund) and one
//    that does NOT tie (computed ≠ amount). Numbers pinned so the net line foots:
//    ticket_sales + door_covers − refunds = deposited. ─────────────────────────

function tyingRecon(): Reconciliation {
  return normalizeReconciliation({
    payout_id: "po_1TtHLl2eZvKYlo2CabcDEFGh",
    arrival_date: "2026-07-22",
    amount_cents: 18500,
    computed_total_cents: 18500,
    ties: true,
    events: [
      {
        event_id: 220,
        name: "Foam Party",
        date: "2026-07-20",
        subtotal_cents: 12000,
        tiers: [
          { tier_name: "GA", qty: 10, amount_cents: 8000 },
          { tier_name: "VIP", qty: 2, amount_cents: 4000 },
        ],
      },
      {
        event_id: 221,
        name: "Silent Disco",
        date: "2026-07-21",
        subtotal_cents: 5000,
        tiers: [{ tier_name: "GA", qty: 5, amount_cents: 5000 }],
      },
    ],
    door_covers_cents: 2000,
    refunds_cents: 500,
    // 17000 ticket + 2000 door − 500 refund = 18500 deposited
    net: { ticket_sales_cents: 17000, door_covers_cents: 2000, refunds_cents: 500, deposited_cents: 18500 },
    // orders intentionally omitted → null (default, PII-free)
  })
}

// ── (1) Normalization: numeric coercion + missing-array tolerance ─────────────

test("normalizeSummary coerces string cents and tolerates null", () => {
  const s = normalizeSummary({ deposited_cents: "18500", in_transit_cents: "600" } as never)
  assert.equal(s.deposited_cents, 18500)
  assert.equal(s.in_transit_cents, 600)
  assert.equal(s.refunded_cents, 0) // missing → 0
  const empty = normalizeSummary(null)
  assert.deepEqual(empty, {
    deposited_cents: 0,
    in_transit_cents: 0,
    refunded_cents: 0,
    venue_scoped: false,
    venue_deposited_cents: null,
    venue_in_transit_cents: null,
    venue_refunded_cents: null,
    account_dedicated: null,
    shared_with_venues: [],
  })
})

test("normalizeDeposit coerces numerics and defaults an unknown status to paid", () => {
  const d = normalizeDeposit({ payout_id: "po_x", amount_cents: "5000", sales_count: "3", status: "weird" } as never)
  assert.equal(d.amount_cents, 5000)
  assert.equal(d.sales_count, 3)
  assert.equal(d.status, "paid")
  assert.equal(d.arrival_date, null)
})

test("normalizeDeposits accepts a bare array OR a {deposits:[...]} envelope, else []", () => {
  assert.equal(normalizeDeposits([{ payout_id: "po_1" }, { payout_id: "po_2" }]).length, 2)
  assert.equal(normalizeDeposits({ deposits: [{ payout_id: "po_3" }] }).length, 1)
  assert.deepEqual(normalizeDeposits(null), [])
  assert.deepEqual(normalizeDeposits({ nope: 1 }), [])
})

test("normalizeReconciliation tolerates missing events/tiers arrays", () => {
  const r = normalizeReconciliation({ payout_id: "po_y" })
  assert.deepEqual(r.events, [])
  assert.equal(r.orders, null)
  assert.equal(r.net.deposited_cents, 0)
})

// ── (4) Event → tier grouping survives normalization ─────────────────────────

test("grouping: events and their tiers round-trip through normalization", () => {
  const r = tyingRecon()
  assert.equal(r.events.length, 2)
  assert.equal(r.events[0].name, "Foam Party")
  assert.deepEqual(r.events[0].tiers.map((t) => t.tier_name), ["GA", "VIP"])
  assert.equal(r.events[0].tiers[0].qty, 10)
  assert.equal(totalTicketQty(r), 17) // 10 + 2 + 5
})

// ── (2) Ties check: flag AND arithmetic must both agree ──────────────────────

test("tiesCheck true only when server flag set AND computed == amount", () => {
  const ok = tiesCheck(tyingRecon())
  assert.equal(ok.ties, true)
  assert.equal(ok.deltaCents, 0)
})

test("tiesCheck surfaces a delta when computed != amount (the ties:false warning)", () => {
  const r = normalizeReconciliation({
    payout_id: "po_off",
    amount_cents: 18500,
    computed_total_cents: 18453, // off by 47¢
    ties: false,
    net: { ticket_sales_cents: 17000, door_covers_cents: 2000, refunds_cents: 547, deposited_cents: 18453 },
  })
  const t = tiesCheck(r)
  assert.equal(t.ties, false)
  assert.equal(t.deltaCents, -47)
})

test("tiesCheck refuses to trust a lying server flag (ties:true but numbers disagree)", () => {
  const t = tiesCheck({ ties: true, computed_total_cents: 100, amount_cents: 120 })
  assert.equal(t.ties, false) // arithmetic wins → UI shows the warning, not a wrong ✓
  assert.equal(t.deltaCents, -20)
})

// ── (3) Net-line math ─────────────────────────────────────────────────────────

test("netLineParts computes the exact sentence figures and foots", () => {
  const n = netLineParts(tyingRecon().net)
  assert.equal(n.ticketSalesCents, 17000)
  assert.equal(n.doorCoversCents, 2000)
  assert.equal(n.refundsCents, 500)
  assert.equal(n.depositedCents, 18500)
  assert.equal(n.computedDepositedCents, 18500) // 17000 + 2000 − 500
  assert.equal(n.foots, true)
})

test("netLineParts flags a net block that does not add up", () => {
  const n = netLineParts({ ticket_sales_cents: 100, door_covers_cents: 0, refunds_cents: 0, deposited_cents: 999 })
  assert.equal(n.computedDepositedCents, 100)
  assert.equal(n.foots, false)
})

// ── (5) Details gating: operational rows appear ONLY with the toggle on ───────

const DETAIL_ROW: ReconOrderRow = {
  order_id: 9001,
  sale_date: "2026-07-20",
  event: "Foam Party",
  ticket_tier: "GA",
  quantity: 2,
  amount_cents: 1600,
  is_door_sale: false,
  payout_status: "paid",
  payout_date: "2026-07-22",
  stripe_payout_id: "po_1TtHLl2eZvKYlo2CabcDEFGh",
  stripe_payment_intent_id: "pi_3TtGf12eZvKYlo2C0abc1234",
  promoter_commission_cents: null,
}

test("details gate: default reconciliation carries no order rows (orders === null)", () => {
  const r = tyingRecon()
  assert.equal(r.orders, null)
  assert.deepEqual(visibleOrderRows(r, false), [])
  assert.deepEqual(visibleOrderRows(r, true), []) // still none — server sent none
})

test("details gate: even when details ARE loaded, toggle off hides every row", () => {
  const r = normalizeReconciliation({ payout_id: "po_d", orders: [DETAIL_ROW] })
  assert.equal(r.orders?.length, 1)
  assert.deepEqual(visibleOrderRows(r, false), []) // toggle off → nothing rendered
  assert.equal(visibleOrderRows(r, true).length, 1) // toggle on → row visible
})

test("order rows carry the exact operational fields and NO buyer PII", () => {
  const r = normalizeReconciliation({ payout_id: "po_d", orders: [DETAIL_ROW] })
  const o = r.orders![0]
  // present, addendum-exact
  assert.equal(o.order_id, 9001)
  assert.equal(o.sale_date, "2026-07-20")
  assert.equal(o.event, "Foam Party")
  assert.equal(o.ticket_tier, "GA")
  assert.equal(o.quantity, 2)
  assert.equal(o.amount_cents, 1600)
  assert.equal(o.is_door_sale, false)
  assert.equal(o.payout_status, "paid")
  assert.equal(o.payout_date, "2026-07-22")
  assert.equal(o.stripe_payout_id, "po_1TtHLl2eZvKYlo2CabcDEFGh")
  assert.equal(o.stripe_payment_intent_id, "pi_3TtGf12eZvKYlo2C0abc1234")
  // no buyer PII fields exist on the row at all
  assert.ok(!("buyer_email" in o))
  assert.ok(!("buyer" in o))
  assert.ok(!("channel" in o))
})

test("showCommissionColumn: hidden unless a row carries a commission", () => {
  const noComm = normalizeReconciliation({ payout_id: "po_a", orders: [DETAIL_ROW] })
  assert.equal(showCommissionColumn(noComm.orders!), false) // absent → null → hidden

  const withComm = normalizeReconciliation({
    payout_id: "po_b",
    orders: [DETAIL_ROW, { ...DETAIL_ROW, order_id: 9002, promoter_commission_cents: 250 }],
  })
  assert.equal(showCommissionColumn(withComm.orders!), true) // one commission-bearing row → shown
  // and the non-commission row keeps a null (renders "—"), not a fabricated 0
  assert.equal(withComm.orders![0].promoter_commission_cents, null)
  assert.equal(withComm.orders![1].promoter_commission_cents, 250)
})

// ── (6) Copyable short id ─────────────────────────────────────────────────────

test("shortPayoutId middle-truncates long ids and passes short ones through", () => {
  assert.equal(shortPayoutId("po_1TtHLl2eZvKYlo2CabcDEFGh"), "po_1TtHLl2…EFGh")
  assert.equal(shortPayoutId("po_short"), "po_short")
})

// ── (7) Per-deposit CSV mirrors the panel and foots ──────────────────────────

test("buildDepositCsv contains grouped tiers, door cover, refund, and the net line", () => {
  const csv = buildDepositCsv(tyingRecon())
  const lines = csv.split("\r\n")
  // header row present
  assert.ok(lines.some((l) => l.startsWith("section,event,event_date,tier,qty,amount")))
  // tier rows and event subtotals
  assert.ok(lines.some((l) => l.startsWith("line,Foam Party,2026-07-20,GA,10,80.00")))
  assert.ok(lines.some((l) => l.startsWith("event_subtotal,Foam Party,2026-07-20,,,120.00")))
  // door covers + refunds
  assert.ok(lines.some((l) => l === "door_covers,,,,,20.00"))
  assert.ok(lines.some((l) => l === "refunds,,,,,-5.00"))
  // the net rows foot: 170.00 + 20.00 − 5.00 = 185.00
  assert.ok(lines.some((l) => l === "net_ticket_sales,,,,,170.00"))
  assert.ok(lines.some((l) => l === "net_deposited,,,,,185.00"))
})

test("buildDepositCsv appends the DETAILS section (addendum columns) only when orders present", () => {
  const noDetails = buildDepositCsv(tyingRecon())
  assert.ok(!noDetails.includes("DETAILS (ticket-level)"))

  const withDetails = buildDepositCsv(
    normalizeReconciliation({
      payout_id: "po_d",
      amount_cents: 700,
      computed_total_cents: 700,
      ties: true,
      net: { ticket_sales_cents: 800, door_covers_cents: 0, refunds_cents: 100, deposited_cents: 700 },
      orders: [DETAIL_ROW],
    }),
  )
  assert.ok(withDetails.includes("DETAILS (ticket-level)"))
  // exact header set — NO buyer/email/channel/platform_fee/host_net; no commission col (no commission row)
  assert.ok(
    withDetails.includes(
      "order_id,sale_date,event,ticket_tier,quantity,amount,is_door_sale,payout_status,payout_date,stripe_payout_id,stripe_payment_intent_id",
    ),
  )
  assert.ok(!withDetails.includes("buyer"))
  assert.ok(!withDetails.includes("host_net"))
  assert.ok(!withDetails.includes("promoter_commission"))
  assert.ok(
    withDetails.split("\r\n").some((l) => l.startsWith("9001,2026-07-20,Foam Party,GA,2,16.00,no,paid,2026-07-22,po_1TtHLl2")),
  )
})

test("buildDepositCsv adds the promoter_commission column only when a row carries commission", () => {
  const csv = buildDepositCsv(
    normalizeReconciliation({
      payout_id: "po_c",
      ties: true,
      net: { ticket_sales_cents: 1600, door_covers_cents: 0, refunds_cents: 0, deposited_cents: 1600 },
      orders: [{ ...DETAIL_ROW, promoter_commission_cents: 250 }],
    }),
  )
  assert.ok(csv.includes(",stripe_payment_intent_id,promoter_commission"))
  assert.ok(csv.split("\r\n").some((l) => l.endsWith(",2.50")))
})

test("buildDepositCsv escapes commas/quotes per RFC-4180", () => {
  const csv = buildDepositCsv(
    normalizeReconciliation({
      payout_id: "po_e",
      events: [{ event_id: null, name: "Party, Deluxe", date: "2026-07-01", subtotal_cents: 100, tiers: [{ tier_name: 'The "Big" One', qty: 1, amount_cents: 100 }] }],
      net: { ticket_sales_cents: 100, door_covers_cents: 0, refunds_cents: 0, deposited_cents: 100 },
    }),
  )
  assert.ok(csv.includes('"Party, Deluxe"'))
  assert.ok(csv.includes('"The ""Big"" One"'))
})

// ── PDF (printable HTML) + filenames + query ─────────────────────────────────

test("buildDepositPdfHtml renders the ties badge and the exact net sentence", () => {
  const html = buildDepositPdfHtml(tyingRecon())
  assert.ok(html.includes("✓ Ties to Stripe deposit"))
  assert.ok(html.includes("Ticket sales $170.00 + Door covers $20.00 − Refunds $5.00 = Deposited $185.00"))
})

test("buildDepositPdfHtml shows the off-by warning when it doesn't tie", () => {
  const html = buildDepositPdfHtml(
    normalizeReconciliation({ payout_id: "po_off", amount_cents: 120, computed_total_cents: 100, ties: false }),
  )
  assert.ok(html.includes("does not tie"))
  assert.ok(html.includes("−$0.20")) // 120 − 100 = 20¢ off
})

test("buildDepositPdfHtml details table uses the addendum columns and no buyer PII", () => {
  const html = buildDepositPdfHtml(
    normalizeReconciliation({
      payout_id: "po_pdf",
      ties: true,
      net: { ticket_sales_cents: 1600, door_covers_cents: 0, refunds_cents: 0, deposited_cents: 1600 },
      orders: [DETAIL_ROW],
    }),
  )
  assert.ok(html.includes("Ticket-level details"))
  assert.ok(html.includes("<th>Payout id</th>"))
  assert.ok(html.includes("<th>Payment intent</th>"))
  assert.ok(html.includes("po_1TtHLl2eZvKYlo2CabcDEFGh"))
  assert.ok(!html.includes("Buyer")) // never any buyer column
  assert.ok(!html.includes(">Commission<")) // no commission row → column hidden
})

test("depositExportFilename and reconcileQuery build the expected strings", () => {
  assert.equal(depositExportFilename({ payout_id: "po_1" }, "csv"), "bizzy-deposit-po_1.csv")
  assert.equal(depositExportFilename({ payout_id: "" }, "pdf"), "bizzy-deposit-payout.pdf")
  assert.equal(reconcileQuery(90), "?days=90")
  assert.equal(reconcileQuery(30, "&venue_id=5"), "?days=30&venue_id=5")
})

// ── TF-PAYOUTS-VENUE-F1: venue attribution (venue_scoped + venue_subtotal_cents) ──

test("normalizeReconciliation picks up venue_scoped + venue_subtotal_cents when scoped", () => {
  const r = normalizeReconciliation({ payout_id: "po_v", venue_scoped: true, venue_subtotal_cents: "2000" } as never)
  assert.equal(r.venue_scoped, true)
  assert.equal(r.venue_subtotal_cents, 2000) // string coerced
})

test("normalizeReconciliation defaults to UNSCOPED when the server omits the fields", () => {
  const r = normalizeReconciliation({ payout_id: "po_u" })
  assert.equal(r.venue_scoped, false)
  assert.equal(r.venue_subtotal_cents, null)
})

test("normalizeReconciliation ignores a subtotal that arrives without venue_scoped:true", () => {
  // Guard: a stray subtotal with no scope flag must not flip the view into scoped mode.
  const r = normalizeReconciliation({ payout_id: "po_x", venue_subtotal_cents: 999 })
  assert.equal(r.venue_scoped, false)
  assert.equal(r.venue_subtotal_cents, null)
})

test("buildDepositCsv appends a venue_share row ONLY when the deposit is venue-scoped", () => {
  // Unscoped (today's behavior) — no venue_share row, net_deposited still the last money row.
  const unscoped = buildDepositCsv(tyingRecon())
  assert.ok(!unscoped.split("\r\n").some((l) => l.startsWith("venue_share")))

  // Scoped — venue_share carries the venue's slice; the net_deposited (whole deposit) is unchanged.
  const scoped = buildDepositCsv(
    normalizeReconciliation({
      payout_id: "po_vs",
      amount_cents: 18500,
      computed_total_cents: 18500,
      ties: true,
      net: { ticket_sales_cents: 17000, door_covers_cents: 2000, refunds_cents: 500, deposited_cents: 18500 },
      venue_scoped: true,
      venue_subtotal_cents: 4200,
    }),
  )
  assert.ok(scoped.split("\r\n").some((l) => l === "venue_share,,,,,42.00"))
  assert.ok(scoped.split("\r\n").some((l) => l === "net_deposited,,,,,185.00")) // whole deposit unchanged
})

test("buildDepositPdfHtml renders the venue-share line ONLY when scoped", () => {
  const unscoped = buildDepositPdfHtml(tyingRecon())
  assert.ok(!unscoped.includes("share of the deposit"))

  const scoped = buildDepositPdfHtml(
    normalizeReconciliation({
      payout_id: "po_vp",
      amount_cents: 18500,
      computed_total_cents: 18500,
      ties: true,
      net: { ticket_sales_cents: 17000, door_covers_cents: 2000, refunds_cents: 500, deposited_cents: 18500 },
      venue_scoped: true,
      venue_subtotal_cents: 4200,
    }),
  )
  assert.ok(scoped.includes("This venue's share of the deposit: <strong>$42.00</strong>"))
  // The whole-deposit net sentence is still present and unchanged.
  assert.ok(scoped.includes("= Deposited $185.00"))
})

// ── TF-PAYOUTS-SUMMARY-F1: the three summary render states + custom window ────
// The strip's state machine and its exact copy live in the typed client so these
// tests pin the REAL render logic (the component consumes these same helpers).

/** A venue-scoped summary as :195 sends it for a SHARED venue on biz 267. */
function sharedSummary(): PayoutsSummary {
  return normalizeSummary({
    deposited_cents: 50000,
    in_transit_cents: 7000,
    refunded_cents: 1500,
    venue_scoped: true,
    venue_deposited_cents: 12000,
    venue_in_transit_cents: 2000,
    venue_refunded_cents: 500,
    account_dedicated: false,
    shared_with_venues: [
      { venue_id: 261, name: "Little Saint James" },
      { venue_id: 262, name: "Mar a Lago" },
      { venue_id: 990155, name: "Lukes Castle" },
    ],
  } as never)
}

test("normalizeSummary: venue-scoped payload carries the venue share + account-sharing fields", () => {
  const s = sharedSummary()
  assert.equal(s.venue_scoped, true)
  assert.equal(s.venue_deposited_cents, 12000)
  assert.equal(s.venue_in_transit_cents, 2000)
  assert.equal(s.venue_refunded_cents, 500)
  assert.equal(s.account_dedicated, false)
  // Names survive normalization EXACTLY as returned, in order.
  assert.deepEqual(
    s.shared_with_venues.map((v) => v.name),
    ["Little Saint James", "Mar a Lago", "Lukes Castle"],
  )
  // The account-level trio keeps its meaning (the superset), untouched.
  assert.equal(s.deposited_cents, 50000)
})

test("normalizeSummary: stray venue fields WITHOUT venue_scoped:true are dropped (all-venues stays clean)", () => {
  const s = normalizeSummary({
    deposited_cents: 50000,
    in_transit_cents: 7000,
    refunded_cents: 1500,
    // No venue_scoped — an all-venues response must never grow venue-scope UI,
    // even if stray fields leak in.
    venue_deposited_cents: 12000,
    account_dedicated: true,
    shared_with_venues: [{ venue_id: 1, name: "Ghost" }],
  } as never)
  assert.equal(s.venue_scoped, false)
  assert.equal(s.venue_deposited_cents, null)
  assert.equal(s.account_dedicated, null)
  assert.deepEqual(s.shared_with_venues, [])
})

test("render state: all-venues (venue_scoped absent) → unchanged account-level strip", () => {
  const s = normalizeSummary({ deposited_cents: 50000, in_transit_cents: 7000, refunded_cents: 1500 })
  assert.equal(summaryRenderState(s), "all_venues")
})

test("render state: shared venue → lead-with-share + combined-account caveat naming every commingled venue", () => {
  const s = sharedSummary()
  assert.equal(summaryRenderState(s), "shared_venue")
  // The lead tiles are the venue's OWN figures, labeled as such…
  assert.equal(VENUE_TILE_LABELS.deposited, "This venue's deposits")
  assert.equal(VENUE_TILE_LABELS.in_transit, "This venue's in transit")
  assert.equal(VENUE_TILE_LABELS.refunded, "This venue's refunded")
  // …and the account total is secondary, labeled and caveated by NAME so the
  // superset can never read as this venue's money.
  assert.equal(COMBINED_ACCOUNT_LABEL, "Combined Stripe account")
  assert.equal(
    sharedAccountCaveat(s.shared_with_venues),
    "Also includes deposits for: Little Saint James, Mar a Lago, Lukes Castle",
  )
})

test("render state: dedicated venue → ✓ badge + reassurance naming the selected venue", () => {
  const s = normalizeSummary({
    deposited_cents: 30000,
    in_transit_cents: 4000,
    refunded_cents: 0,
    venue_scoped: true,
    venue_deposited_cents: 30000,
    venue_in_transit_cents: 4000,
    venue_refunded_cents: 0,
    account_dedicated: true,
    shared_with_venues: [],
  } as never)
  assert.equal(summaryRenderState(s), "dedicated_venue")
  assert.equal(DEDICATED_BADGE_LABEL, "✓ Dedicated Stripe account")
  assert.equal(
    dedicatedReassurance("Lukes Castle"),
    "These deposits are for Lukes Castle only — not shared with any other venue.",
  )
  // Name still missing (venue list not resolved yet) → generic, never blank.
  assert.equal(
    dedicatedReassurance(undefined),
    "These deposits are for this venue only — not shared with any other venue.",
  )
})

test("tiles: shared venue leads with the venue trio; dedicated + all-venues show the ACCOUNT trio", () => {
  // SHARED → the attributed share is the lead figure.
  assert.deepEqual(summaryTilesFor(sharedSummary()), {
    deposited_cents: 12000,
    in_transit_cents: 2000,
    refunded_cents: 500,
  })
  // DEDICATED → the ACCOUNT trio, even when attribution zeroes the venue trio
  // (attribution keys off events.venue_id — a dedicated venue's events can be
  // tagged elsewhere, live on 990155). The account figure is the one that ties
  // to the deposit rows and to the reassurance sentence.
  const dedicated = normalizeSummary({
    deposited_cents: 93183,
    in_transit_cents: 2000,
    refunded_cents: 8050,
    venue_scoped: true,
    venue_deposited_cents: 0,
    venue_in_transit_cents: 2000,
    venue_refunded_cents: 0,
    account_dedicated: true,
    shared_with_venues: [],
  } as never)
  assert.deepEqual(summaryTilesFor(dedicated), {
    deposited_cents: 93183,
    in_transit_cents: 2000,
    refunded_cents: 8050,
  })
  // ALL-VENUES → account trio, unchanged.
  const all = normalizeSummary({ deposited_cents: 100, in_transit_cents: 200, refunded_cents: 300 })
  assert.deepEqual(summaryTilesFor(all), { deposited_cents: 100, in_transit_cents: 200, refunded_cents: 300 })
})

test("reconcileQuery: custom since/until window composes with venue_id; days preset unchanged", () => {
  assert.equal(
    reconcileQuery({ kind: "custom", since: "2026-07-01", until: "2026-07-14" }, "&venue_id=260"),
    "?since=2026-07-01&until=2026-07-14&venue_id=260",
  )
  assert.equal(reconcileQuery({ kind: "days", days: 90 }), "?days=90")
  // The original numeric signature still works (nothing else re-plumbed).
  assert.equal(reconcileQuery(30, "&venue_id=5"), "?days=30&venue_id=5")
})

test("customWindow validates YYYY-MM-DD and rejects inverted ranges", () => {
  assert.deepEqual(customWindow("2026-07-01", "2026-07-14"), {
    kind: "custom",
    since: "2026-07-01",
    until: "2026-07-14",
  })
  assert.equal(customWindow("2026-07-14", "2026-07-01"), null) // inverted
  assert.equal(customWindow("2026-7-1", "2026-07-14"), null) // not YYYY-MM-DD
  assert.equal(customWindow("2026-02-30", "2026-07-14"), null) // not a real date
  assert.equal(customWindow("", "2026-07-14"), null)
  assert.equal(isIsoDate("2026-07-28"), true)
  assert.equal(isIsoDate("2026-13-01"), false)
})

test("untilIsPast: a past custom end date triggers the in-transit note; presets and today do not", () => {
  const today = "2026-07-28"
  assert.equal(untilIsPast({ kind: "custom", since: "2026-07-01", until: "2026-07-14" }, today), true)
  assert.equal(untilIsPast({ kind: "custom", since: "2026-07-01", until: "2026-07-28" }, today), false)
  assert.equal(untilIsPast({ kind: "days", days: 90 }, today), false)
  // The note is subtext-only clarity for inherited semantics (funds swept into
  // later payouts read as not-yet-deposited as of the end date) — never a "fix".
  assert.equal(IN_TRANSIT_PAST_UNTIL_NOTE, "In transit reflects funds not yet deposited as of your end date.")
})
