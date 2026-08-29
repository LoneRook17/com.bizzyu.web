// Promoter commission is Available 2 days after that night's event.
// Pins dash/help/copy and leaves host escrow / payout timing alone.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  PROMOTER_COMMISSION_AVAILABLE_AFTER_COPY,
  PROMOTER_COMMISSION_AVAILABLE_AFTER_DAYS,
} from "./promoter-commission-hold.ts"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

const HOLD = "2 days after that night's event"
const OLD_SEVEN = [
  "7 days after the event",
  "7 days after that night",
  "7-day after the event",
  "seven days after the event",
  "wait 7 days",
  "default 7 days",
]

test("the promoter hold is 2 days, not 7", () => {
  assert.equal(PROMOTER_COMMISSION_AVAILABLE_AFTER_DAYS, 2)
  assert.equal(PROMOTER_COMMISSION_AVAILABLE_AFTER_COPY, HOLD)
})

test("dash help and knowledge packs state the 2-day promoter hold", () => {
  const help = read("../../app/business/(dashboard)/help/content.ts")
  assert.ok(help.includes("PROMOTER_COMMISSION_AVAILABLE_AFTER_COPY"))
  assert.ok(help.includes("They become available ${PROMOTER_COMMISSION_AVAILABLE_AFTER_COPY}."))
  for (const old of OLD_SEVEN) {
    assert.ok(!help.includes(old), `help/content.ts still has ${JSON.stringify(old)}`)
  }

  const files = [
    "../../../business-kb/40-promoters.md",
    "../../../business-kb/70-stripe-payouts.md",
    "../../../support-kb/01-product-overview.md",
    "../../../support-kb/20-businesses.md",
    "../../../notes/business-kb-audit-2026-07-11.md",
  ]
  for (const rel of files) {
    const src = read(rel)
    assert.ok(src.includes(HOLD), `${rel} is missing the 2-day promoter hold`)
    for (const old of OLD_SEVEN) {
      assert.ok(!src.includes(old), `${rel} still has ${JSON.stringify(old)}`)
    }
  }
})

test("host escrow and host payout timing copy is unchanged", () => {
  const hostPayouts = read("../../../business-kb/70-stripe-payouts.md")
  assert.ok(
    hostPayouts.includes("Earnings arrive as **Pending** and become **Available** once the event they came from"),
    "host pending → available copy moved",
  )
  assert.ok(
    hostPayouts.includes("is safely past. Pending money is not withdrawable yet."),
    "host escrow timing copy moved",
  )
  assert.ok(
    hostPayouts.includes("Don't quote a number of days: Bizzy doesn't set the schedule"),
    "host Stripe schedule copy moved",
  )

  const help = read("../../app/business/(dashboard)/help/content.ts")
  assert.ok(
    help.includes(
      "Money from ticket sales and line skips is transferred to your bank account through Stripe, typically within 2-3 business days after the transaction.",
    ),
    "host FAQ payout timing moved",
  )

  const policies = read("../../../business-kb/00-policies.md")
  assert.ok(
    policies.includes('Never promise how many days a payout takes (for example "2 to 3'),
    "host payout-timing policy moved",
  )
})
