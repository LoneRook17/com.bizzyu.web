// HF-2 — business email-change form logic. Runs under the repo's built-in
// runner convention (`node --test`, no extra deps): see src/lib/support/auth.test.ts.
//
// Every state the form can show is asserted here. The .tsx renders these
// strings and nothing else, so the copy is pinned at the source.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  PENDING_TTL_MS,
  canChangeBusinessEmail,
  canSubmitEmailChange,
  emailChangeErrorMessage,
  emailChangePendingMessage,
  emailChangeSuccessMessage,
  isPlausibleEmail,
  isSameAddress,
  makePendingRecord,
  readPendingRecord,
} from "./email-change.ts"

// --- owner-only gating ---------------------------------------------------

test("canChangeBusinessEmail: ONLY the owner — managers are excluded", () => {
  assert.equal(canChangeBusinessEmail("owner"), true)
  // Deliberately narrower than settings' canEdit (owner||manager): this field
  // is the login credential, so a manager must not be able to move it.
  assert.equal(canChangeBusinessEmail("manager"), false)
  assert.equal(canChangeBusinessEmail("staff"), false)
  assert.equal(canChangeBusinessEmail("promoter"), false)
})

test("canChangeBusinessEmail: absent/unknown role never opens the form", () => {
  assert.equal(canChangeBusinessEmail(null), false)
  assert.equal(canChangeBusinessEmail(undefined), false)
  assert.equal(canChangeBusinessEmail(""), false)
  assert.equal(canChangeBusinessEmail("Owner"), false) // case-sensitive by design
  assert.equal(canChangeBusinessEmail("admin"), false)
})

// --- error states, mapped off HF-1's documented statuses ------------------

test("state wrong-password: 401 -> incorrect-password copy", () => {
  assert.equal(emailChangeErrorMessage(401), "That password is incorrect.")
  // The server's own 401 text is NOT surfaced: HF-1 folds "no session" and
  // "wrong password" into one status, and a live session is a precondition
  // for reaching this form.
  assert.equal(emailChangeErrorMessage(401, "Unauthorized"), "That password is incorrect.")
})

test("state collision: 409 -> already-in-use copy", () => {
  assert.equal(emailChangeErrorMessage(409), "That email is already in use.")
  // Covers HF-1's two 409 sources (another business, another user) with one
  // message — the owner's next action is identical either way.
  assert.equal(emailChangeErrorMessage(409, "Email already registered"), "That email is already in use.")
})

test("state rate-limited: 429 -> wait-and-retry copy", () => {
  assert.equal(
    emailChangeErrorMessage(429),
    "Too many attempts. Please wait a few minutes and try again."
  )
})

test("state not-owner: 403 -> owner-only copy (endpoint backstop)", () => {
  assert.equal(emailChangeErrorMessage(403), "Only the account owner can change the login email.")
})

test("state invalid: 400 PREFERS the server message (it multiplexes causes)", () => {
  // 400 covers bad format, blocked domain, and same-as-current — only the
  // server knows which fired, so its text wins.
  assert.equal(emailChangeErrorMessage(400, "Email domain is not allowed"), "Email domain is not allowed")
  assert.equal(
    emailChangeErrorMessage(400),
    "That email address can't be used. Please check it and try again."
  )
  assert.equal(
    emailChangeErrorMessage(400, "   "),
    "That email address can't be used. Please check it and try again."
  )
})

test("unknown status falls back without leaking a blank message", () => {
  assert.equal(emailChangeErrorMessage(500), "Something went wrong. Please try again.")
  assert.equal(emailChangeErrorMessage(503, "Bad gateway"), "Bad gateway")
  assert.equal(emailChangeErrorMessage(0), "Something went wrong. Please try again.")
})

// --- success + pending states --------------------------------------------

test("state success: names the address and says nothing has changed yet", () => {
  assert.equal(
    emailChangeSuccessMessage("new@business.com"),
    "Check new@business.com to confirm — nothing changes until then."
  )
})

test("state pending: revisit copy says the old email still works", () => {
  assert.equal(
    emailChangePendingMessage("new@business.com"),
    "Waiting on confirmation for new@business.com. Your login email stays the same until that link is opened."
  )
})

// --- submit gating -------------------------------------------------------

test("isPlausibleEmail: loose format gate, server remains the authority", () => {
  assert.equal(isPlausibleEmail("owner@business.com"), true)
  assert.equal(isPlausibleEmail("  owner@business.co.uk  "), true)
  assert.equal(isPlausibleEmail("owner"), false)
  assert.equal(isPlausibleEmail("owner@business"), false)
  assert.equal(isPlausibleEmail("owner@@business.com"), false)
  assert.equal(isPlausibleEmail("own er@business.com"), false)
  assert.equal(isPlausibleEmail("@business.com"), false)
  assert.equal(isPlausibleEmail(""), false)
})

test("isSameAddress: case- and whitespace-insensitive", () => {
  assert.equal(isSameAddress("Owner@Business.com", "owner@business.com"), true)
  assert.equal(isSameAddress("  owner@business.com ", "owner@business.com"), true)
  assert.equal(isSameAddress("other@business.com", "owner@business.com"), false)
  assert.equal(isSameAddress("owner@business.com", ""), false)
})

test("canSubmitEmailChange: needs a valid, DIFFERENT address plus a password", () => {
  const current = "owner@business.com"
  assert.equal(canSubmitEmailChange("new@business.com", "pw", current), true)
  assert.equal(canSubmitEmailChange("new@business.com", "", current), false)
  assert.equal(canSubmitEmailChange("nonsense", "pw", current), false)
  // Same-as-current is blocked client-side so the owner isn't spent against
  // authLimiter's 50/15min budget for a guaranteed 400.
  assert.equal(canSubmitEmailChange("owner@business.com", "pw", current), false)
  assert.equal(canSubmitEmailChange("OWNER@BUSINESS.COM", "pw", current), false)
})

// --- pending record (client-side hint) -----------------------------------

const BIZ = 42
const CURRENT = "owner@business.com"
const NOW = 1_752_000_000_000

function stored(overrides: Record<string, unknown> = {}, at = NOW) {
  return JSON.stringify({ ...makePendingRecord(BIZ, "new@business.com", at), ...overrides })
}

test("readPendingRecord: round-trips a fresh record", () => {
  assert.equal(readPendingRecord(stored(), BIZ, CURRENT, NOW), "new@business.com")
  assert.equal(readPendingRecord(stored(), BIZ, CURRENT, NOW + PENDING_TTL_MS - 1), "new@business.com")
})

test("readPendingRecord: expires exactly at HF-1's 1-hour token TTL", () => {
  // The banner must not outlive the link it describes.
  assert.equal(readPendingRecord(stored(), BIZ, CURRENT, NOW + PENDING_TTL_MS), null)
  assert.equal(readPendingRecord(stored(), BIZ, CURRENT, NOW + PENDING_TTL_MS + 1), null)
})

test("readPendingRecord: another business's record is never shown", () => {
  // Guards the multi-business owner switching tenants in one browser.
  assert.equal(readPendingRecord(stored(), 999, CURRENT, NOW), null)
})

test("readPendingRecord: drops once the account ALREADY uses that address", () => {
  // The change landed; keeping the banner would contradict the live email.
  assert.equal(readPendingRecord(stored(), BIZ, "new@business.com", NOW), null)
  assert.equal(readPendingRecord(stored(), BIZ, "NEW@BUSINESS.COM", NOW), null)
})

test("readPendingRecord: absent, corrupt, or malformed payloads yield null", () => {
  assert.equal(readPendingRecord(null, BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord(undefined, BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord("", BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord("{not json", BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord('"a string"', BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord("null", BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord(stored({ pendingEmail: "" }), BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord(stored({ pendingEmail: 12 }), BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord(stored({ businessId: "42" }), BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord(stored({ requestedAt: "soon" }), BIZ, CURRENT, NOW), null)
  assert.equal(readPendingRecord(stored({ requestedAt: Number.NaN }), BIZ, CURRENT, NOW), null)
})

test("readPendingRecord: a future-dated record is distrusted, not shown forever", () => {
  assert.equal(readPendingRecord(stored({}, NOW + 5_000), BIZ, CURRENT, NOW), null)
})
