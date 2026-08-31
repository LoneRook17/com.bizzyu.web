// Manage Event → Promoters host copy (L13).
// Pins the empty/explainer strings in plain language, no typographic dashes,
// and that the create-link / list UI plus commission math stay put.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  PROMOTER_TAB_COMMISSION_EXPLAINER,
  PROMOTER_TAB_EMPTY_DESCRIPTION,
  PROMOTER_TAB_EMPTY_TITLE,
  PROMOTER_TAB_EXPLAINER,
  PROMOTER_TAB_HOST_COPY,
  PROMOTER_TAB_SUBTITLE,
} from "./promoter-tab-copy.ts"

const EM = "\u2014"
const EN = "\u2013"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

test("promoter tab explainer says how it works in plain words", () => {
  const text = PROMOTER_TAB_HOST_COPY.join(" ")
  assert.match(text, /referral link/i)
  assert.match(text, /app or not/i)
  assert.match(text, /earn a cut/i)
  assert.match(text, /out of pocket/i)
  assert.match(text, /Bizzy handles it/)
  assert.match(text, /More people come to the night/)
  assert.equal(PROMOTER_TAB_EMPTY_TITLE, "No promoters yet")
  assert.match(PROMOTER_TAB_EMPTY_DESCRIPTION, /show up here/)
  assert.match(PROMOTER_TAB_COMMISSION_EXPLAINER, /Stripe take-home/)
  assert.match(PROMOTER_TAB_SUBTITLE, /Referral links for this night/)
  assert.match(PROMOTER_TAB_EXPLAINER, /Promoters share a referral link/)
})

test("promoter tab host copy has no em or en dashes", () => {
  for (const s of PROMOTER_TAB_HOST_COPY) {
    assert.ok(!s.includes(EM), `em dash in ${JSON.stringify(s)}`)
    assert.ok(!s.includes(EN), `en dash in ${JSON.stringify(s)}`)
  }
})

test("old unclear empty copy is gone", () => {
  const page = read("../../app/business/(dashboard)/events/[id]/manage/promoters/page.tsx")
  assert.ok(!page.includes("opt in to promote"))
  assert.ok(!page.includes("People sharing your event link"))
  assert.ok(!page.includes("deducted from your gross"))
})

test("manage hub Promoters tile names referral links", () => {
  const hub = read("../../app/business/(dashboard)/events/[id]/manage/page.tsx")
  assert.ok(hub.includes('subtitle: "Referral links and what they earn"'))
  assert.ok(!hub.includes('subtitle: "Stats and payouts"'))
})

test("promoter tab still uses the copy module and keeps list / copy-link UI", () => {
  const page = read("../../app/business/(dashboard)/events/[id]/manage/promoters/page.tsx")
  assert.ok(page.includes("PROMOTER_TAB_SUBTITLE"))
  assert.ok(page.includes("PROMOTER_TAB_EXPLAINER"))
  assert.ok(page.includes("PROMOTER_TAB_EMPTY_TITLE"))
  assert.ok(page.includes("PROMOTER_TAB_EMPTY_DESCRIPTION"))
  assert.ok(page.includes("PROMOTER_TAB_COMMISSION_EXPLAINER"))
  assert.ok(page.includes("copyShareUrl"))
  assert.ok(page.includes("p.share_url"))
  assert.ok(page.includes("p.tracking_link_id"))
  assert.ok(page.includes("Copied"))
})

test("promoter tab commission math is still pending plus paid", () => {
  const page = read("../../app/business/(dashboard)/events/[id]/manage/promoters/page.tsx")
  assert.ok(page.includes("p.commission_pending_cents + p.commission_paid_cents"))
  assert.ok(page.includes("totalCommissionCents"))
  assert.ok(page.includes("money(totalCommissionCents)"))
})
