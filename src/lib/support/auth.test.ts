// Unit tests for the support-auth response-shape extraction, runnable with the
// Node built-in test runner (no extra deps): `npm test`.
//
// Regression guard for the bug where dev Laravel POST /api/profile nests the
// user under `profile` (not `data`), which made SupportUser.id "unknown" — that
// 400'd every ingest and collapsed all students into one "student:unknown" rate
// bucket. These assert real, data-nested, and flat shapes all resolve, and that
// an unidentifiable body fails verification (→ null → 401) instead.

import { test } from "node:test"
import assert from "node:assert/strict"
import { parseStudentProfile, parseBusinessMe, toPositiveIntId } from "./auth.ts"
import { buildIngestPayload } from "./ingest.ts"

test("toPositiveIntId: accepts positive ints (number or string), rejects the rest", () => {
  assert.equal(toPositiveIntId(5561), "5561")
  assert.equal(toPositiveIntId("5561"), "5561")
  assert.equal(toPositiveIntId("unknown"), null)
  assert.equal(toPositiveIntId(undefined), null)
  assert.equal(toPositiveIntId(null), null)
  assert.equal(toPositiveIntId(0), null)
  assert.equal(toPositiveIntId(-3), null)
  assert.equal(toPositiveIntId(1.5), null)
  assert.equal(toPositiveIntId(""), null)
  assert.equal(toPositiveIntId("  "), null)
})

test("parseStudentProfile: REAL dev shape (user nested under `profile`)", () => {
  // Exactly what POST http://3.80.143.224/api/profile returns.
  const body = {
    deal_used: 3,
    amount_saved: 42,
    rank: 12,
    profile: { id: 5561, full_name: "Luke Dev" },
  }
  const user = parseStudentProfile(body)
  assert.ok(user)
  assert.equal(user.id, "5561")
  assert.equal(user.audience, "student")
  assert.equal(user.name, "Luke Dev")
})

test("parseStudentProfile: data-nested shape ({ data: {...} })", () => {
  const user = parseStudentProfile({ data: { id: 77, name: "Data User", university_name: "FGCU" } })
  assert.ok(user)
  assert.equal(user.id, "77")
  assert.equal(user.school, "FGCU")
})

test("parseStudentProfile: flat shape (user at top level)", () => {
  const user = parseStudentProfile({ id: 88, full_name: "Flat User", university: { name: "UF" } })
  assert.ok(user)
  assert.equal(user.id, "88")
  assert.equal(user.school, "UF")
})

test("parseStudentProfile: unidentifiable body → null (no minted 'unknown' user)", () => {
  assert.equal(parseStudentProfile({ deal_used: 3, amount_saved: 42, rank: 12, profile: {} }), null)
  assert.equal(parseStudentProfile({ profile: { id: "unknown" } }), null)
  assert.equal(parseStudentProfile({ data: { id: 0 } }), null)
  assert.equal(parseStudentProfile(null), null)
  assert.equal(parseStudentProfile("not-an-object"), null)
  assert.equal(parseStudentProfile({}), null)
})

test("parseBusinessMe: REAL shape (user.id + business.business_id)", () => {
  // Exactly what GET /business/auth/me returns (services businessAuth.ts).
  const body = {
    user: { id: 910, full_name: "Owner Jane", business_role: "owner", venue_id: 4 },
    business: { business_id: 8, name: "Backroads", status: "active" },
  }
  const user = parseBusinessMe(body)
  assert.ok(user)
  assert.equal(user.id, "910")
  assert.equal(user.audience, "business")
  assert.equal(user.name, "Owner Jane")
  assert.equal(user.business, "Backroads")
  // The bug this guards: reading `business.id` yields null; must read `business_id`.
  assert.equal(user.businessId, "8")
})

test("parseBusinessMe: tolerant fallback to business.id when business_id absent", () => {
  const user = parseBusinessMe({ user: { id: 12 }, business: { id: 34, name: "Legacy" } })
  assert.ok(user)
  assert.equal(user.businessId, "34")
})

test("parseBusinessMe: missing/invalid user id → null", () => {
  assert.equal(parseBusinessMe({ user: {}, business: { business_id: 8 } }), null)
  assert.equal(parseBusinessMe({ user: { id: "unknown" } }), null)
  assert.equal(parseBusinessMe({ business: { business_id: 8 } }), null)
  assert.equal(parseBusinessMe(null), null)
})

test("buildIngestPayload: a parsed student user yields an integer user_id (no 400)", () => {
  const user = parseStudentProfile({ profile: { id: 5561, full_name: "Luke Dev" } })
  assert.ok(user)
  const payload = buildIngestPayload({
    externalKey: "SCANTEST-unit",
    user,
    messages: [{ role: "user" as const, content: "hi" }],
    classification: null,
  })
  assert.equal(payload.user_id, "5561")
  assert.equal(payload.audience, "student")
  assert.equal(payload.external_key, "SCANTEST-unit")
  assert.equal(payload.business_id, undefined) // students carry no business_id
})

test("buildIngestPayload: business user carries business_id", () => {
  const user = parseBusinessMe({ user: { id: 910 }, business: { business_id: 8, name: "Backroads" } })
  assert.ok(user)
  const payload = buildIngestPayload({
    externalKey: "SCANTEST-unit-biz",
    user,
    messages: [{ role: "user" as const, content: "hi" }],
    classification: null,
  })
  assert.equal(payload.user_id, "910")
  assert.equal(payload.business_id, "8")
})
