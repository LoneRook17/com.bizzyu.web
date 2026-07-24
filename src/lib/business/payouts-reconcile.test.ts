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
  assert.deepEqual(empty, { deposited_cents: 0, in_transit_cents: 0, refunded_cents: 0 })
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
