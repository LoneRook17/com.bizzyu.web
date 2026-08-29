// Host / promoter withdraw is Transfer-only + Stripe daily to the bank.
// Instant is gone. EscrowPanel stays the already-honest business surface.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  PROMOTER_TERMS_PAYOUT_COPY,
  PROMOTER_WITHDRAW_HELP_AFTER_HOLD,
  PROMOTER_WITHDRAWN_LABEL,
  WITHDRAW_IN_TRANSIT_COPY,
} from "./withdraw-copy.ts"

const HERE = dirname(fileURLToPath(import.meta.url))

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

const INSTANT_LIES = [
  "instant withdrawal",
  "Instant withdrawal",
  "instant payout",
  "Instant payout",
  "instant fee",
  "Instant fee",
  "arrives in minutes",
  "Withdraw instantly",
  "instant_unavailable",
  "instantFeeCents",
  'method: "instant"',
  'method === "instant"',
  "sent to your bank",
  "We sent your money",
  "on its way — it usually arrives",
]

const WITHDRAW_COPY_FILES: Array<[string, string]> = [
  ["./withdraw-copy.ts", "withdraw-copy"],
  ["../../app/promoter/PromoterDashboardClient.tsx", "promoter dashboard"],
  ["../../app/promote/[eventId]/PromoteClient.tsx", "promote signup"],
  ["../../app/business/(dashboard)/help/content.ts", "dash help"],
  ["../../../business-kb/40-promoters.md", "promoters kb"],
  ["../../../business-kb/00-policies.md", "business kb policies"],
  ["../../../business-kb/70-stripe-payouts.md", "stripe payouts kb"],
  ["../../../support-kb/01-product-overview.md", "support overview"],
  ["../../../support-kb/20-businesses.md", "support businesses"],
  ["../../../notes/business-kb-audit-2026-07-11.md", "kb audit notes"],
]

test("shared withdraw copy is in-transit honest and Instant-free", () => {
  assert.match(WITHDRAW_IN_TRANSIT_COPY, /Stripe account/)
  assert.match(WITHDRAW_IN_TRANSIT_COPY, /daily schedule/)
  assert.match(WITHDRAW_IN_TRANSIT_COPY, /not in your bank yet/)
  assert.ok(!WITHDRAW_IN_TRANSIT_COPY.toLowerCase().includes("instant"))
  assert.equal(PROMOTER_WITHDRAWN_LABEL, "Withdrawn")
  assert.match(PROMOTER_WITHDRAW_HELP_AFTER_HOLD, /no instant option/)
  assert.match(PROMOTER_TERMS_PAYOUT_COPY, /Stripe account/)
})

test("host and promoter withdraw surfaces have no Instant or bank-sent-on-Transfer copy", () => {
  for (const [rel, label] of WITHDRAW_COPY_FILES) {
    const src = read(rel)
    for (const lie of INSTANT_LIES) {
      assert.ok(!src.includes(lie), `${label} still has ${JSON.stringify(lie)}`)
    }
  }
})

test("promoter dashboard uses withdrawn + in-transit copy, not next-payout or Paid out", () => {
  const dash = read("../../app/promoter/PromoterDashboardClient.tsx")
  assert.ok(dash.includes("WITHDRAW_IN_TRANSIT_COPY"))
  assert.ok(dash.includes("PROMOTER_WITHDRAWN_LABEL"))
  assert.ok(!dash.includes("Paid out"))
  assert.ok(!dash.includes("Next payout"))
  assert.ok(!dash.includes("11am ET"))
  assert.ok(!dash.includes("WithdrawDialog"))
})

test("dash help and promote signup use the shared withdraw copy", () => {
  const help = read("../../app/business/(dashboard)/help/content.ts")
  assert.ok(help.includes("PROMOTER_WITHDRAW_HELP_AFTER_HOLD"))
  assert.ok(help.includes("PROMOTER_COMMISSION_AVAILABLE_AFTER_COPY"))

  const promote = read("../../app/promote/[eventId]/PromoteClient.tsx")
  assert.ok(promote.includes("PROMOTER_TERMS_PAYOUT_COPY"))
  assert.ok(promote.includes("PROMOTER_WITHDRAWN_LABEL"))
  assert.ok(promote.includes("WITHDRAW_IN_TRANSIT_COPY"))
  assert.ok(!promote.includes("Stripe payout fees come out of your earnings"))
})

test("host pot KB no longer says withdraw moves money to the bank", () => {
  const host = read("../../../business-kb/70-stripe-payouts.md").replace(/\s+/g, " ")
  assert.ok(host.includes("move to your Stripe account when you withdraw"))
  assert.ok(host.includes("A withdrawal is not a bank deposit yet"))
  assert.ok(!host.includes("move to your bank when you withdraw"))
})

test("promoter KB states Transfer-then-daily and no Instant", () => {
  const promoters = read("../../../business-kb/40-promoters.md").replace(/\s+/g, " ")
  assert.ok(promoters.includes("Stripe account"))
  assert.ok(promoters.includes("daily schedule"))
  assert.ok(promoters.includes("not a bank deposit yet"))
  assert.ok(promoters.includes("no instant option"))
})

test("business EscrowPanel copy is unchanged and still in-transit honest", () => {
  const panel = read("../../components/business/v2/EscrowPanel.tsx")
  assert.ok(panel.includes("Ready to send"))
  assert.ok(panel.includes("It is not on the way"))
  assert.ok(panel.includes("in transit"))
  assert.ok(panel.includes("has not been deposited"))
  assert.ok(panel.includes("Stripe has deposited this to your bank"))
  assert.ok(!panel.includes("Payout to your bank"))
  assert.ok(!panel.includes("Nothing waits in escrow anymore."))
})

test("no Instant withdraw control landed under promoter or promote", () => {
  const roots = [
    join(HERE, "../../app/promoter"),
    join(HERE, "../../app/promote"),
    join(HERE, "../../lib/promoter"),
  ]
  const hits: string[] = []
  for (const root of roots) {
    let names: string[]
    try {
      names = readdirSync(root)
    } catch {
      continue
    }
    for (const name of names) {
      const p = join(root, name)
      if (statSync(p).isDirectory()) continue
      if (!/\.tsx?$/.test(name)) continue
      const src = readFileSync(p, "utf8")
      if (src.includes("WithdrawalMethod") || src.includes("instantFeeCents") || src.includes('title="Instant"')) {
        hits.push(p)
      }
    }
  }
  assert.deepEqual(hits, [], hits.join("\n"))
})
