// DASH2-D — the public link builders, and the night share-state predicate.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  WEB_BASE_URL,
  eventCheckoutUrl,
  venuePageUrl,
  isPubliclyLinkable,
  nightLinkState,
} from "./public-links.ts"

// ── The URL shapes themselves ───────────────────────────────────────────────

test("an event link is the bare AASA checkout path — no ?ref, ever", () => {
  const url = eventCheckoutUrl(1785)
  assert.equal(url, `${WEB_BASE_URL}/event/1785/checkout`)
  // A ?ref here would make the operator's own shares count as promoter sales.
  assert.ok(!url.includes("?"))
})

test("a night uses the SAME builder as an event — one shape, not two", () => {
  // The whole point of DASH2-D: a night is an events row, so its link is an
  // event link. If these ever diverge, nights are pointing at a URL that
  // nothing in the pipeline resolves.
  const night = nightLinkState({ event_id: 1785, status: "published" })
  assert.equal(night.kind, "ready")
  assert.equal(night.kind === "ready" && night.url, eventCheckoutUrl(1785))
})

test("the program link is the existing public venue page", () => {
  assert.equal(venuePageUrl(267), `${WEB_BASE_URL}/venue/267`)
})

test("string and number ids build the same URL", () => {
  assert.equal(eventCheckoutUrl("1785"), eventCheckoutUrl(1785))
  assert.equal(venuePageUrl("267"), venuePageUrl(267))
})

// ── isPubliclyLinkable — the manage page's long-standing live rule ──────────

test("live statuses are linkable, case-insensitively", () => {
  for (const s of ["published", "approved", "active", "PUBLISHED", "Approved"]) {
    assert.equal(isPubliclyLinkable(s), true, s)
  }
})

test("a draft/pending/cancelled event's checkout page dead-ends — no link", () => {
  for (const s of ["draft", "pending_approval", "rejected", "cancelled", "", null, undefined]) {
    assert.equal(isPubliclyLinkable(s), false, String(s))
  }
})

// ── nightLinkState — the three states a night row can be in ─────────────────

test("an ungenerated night has no event id, so no link", () => {
  // The series page deliberately lists the SCHEDULE, not just the stamped
  // rows — core materialises about a week ahead. Those rows must say why
  // rather than render a link to `/event/null/checkout`.
  assert.deepEqual(nightLinkState({ event_id: null, status: null }), { kind: "not_generated" })
})

test("a stamped-but-draft night is withheld, not shared broken", () => {
  // resolveStampStatus() stamps 'draft' when the business is unapproved, or
  // when a paid program has no payout account. Selling is blocked, so the
  // link would dead-end.
  assert.deepEqual(nightLinkState({ event_id: 900, status: "draft" }), { kind: "not_live" })
})

test("a stamped, published night is ready to hand out", () => {
  assert.deepEqual(nightLinkState({ event_id: 900, status: "published" }), {
    kind: "ready",
    url: `${WEB_BASE_URL}/event/900/checkout`,
  })
})

test("not_generated wins over status — an id is required before anything else", () => {
  assert.deepEqual(nightLinkState({ event_id: null, status: "published" }), {
    kind: "not_generated",
  })
})
