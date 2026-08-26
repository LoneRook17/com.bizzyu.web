// HF-2 — confirm-page copy branching. `node --test`, no extra deps.
//
// The signup arm is a LIVE, high-traffic flow. Its strings are asserted as
// exact literals so any future edit to the shared page trips a test rather
// than silently rewording a production email-verification screen.

import { test } from "node:test"
import assert from "node:assert/strict"
import { parseVerifyEmailKind, verifyEmailSuccessCopy } from "./verify-email-copy.ts"

// The pre-HF-2 copy, transcribed from main @ 0854d73's
// src/app/business/(auth)/verify-email/page.tsx success branch. JSX collapsed
// the body's newlines/indentation to single spaces and rendered &apos; as ',
// so this is what the page actually displayed.
const LEGACY_TITLE = "Email verified!"
const LEGACY_SUBTITLE = "Your email address has been confirmed."
const LEGACY_HEADING = "Your account is pending approval"
const LEGACY_BODY =
  "You can explore your dashboard and build your first deal right away. It will go live once the Bizzy team approves your account. You'll get an email when that happens."

// --- kind parsing --------------------------------------------------------

test("parseVerifyEmailKind: HF-1 email-change response", () => {
  assert.equal(parseVerifyEmailKind({ kind: "email_change" }), "email_change")
  assert.equal(parseVerifyEmailKind({ kind: "email_change", business: { id: 1 } }), "email_change")
})

test("parseVerifyEmailKind: HF-1 signup-verification response", () => {
  assert.equal(parseVerifyEmailKind({ kind: "verification" }), "verification")
})

test("parseVerifyEmailKind: LEGACY responses with no `kind` -> verification", () => {
  // This is the compatibility contract that lets HF-2's web ship before,
  // after, or without HF-1's services deploy.
  assert.equal(parseVerifyEmailKind({}), "verification")
  assert.equal(parseVerifyEmailKind({ business: { id: 1, name: "Backroads" } }), "verification")
  assert.equal(parseVerifyEmailKind({ message: "Email verified" }), "verification")
})

test("parseVerifyEmailKind: junk/unknown values fail safe to verification", () => {
  assert.equal(parseVerifyEmailKind(null), "verification")
  assert.equal(parseVerifyEmailKind(undefined), "verification")
  assert.equal(parseVerifyEmailKind("email_change"), "verification") // not an object
  assert.equal(parseVerifyEmailKind(42), "verification")
  assert.equal(parseVerifyEmailKind([]), "verification")
  assert.equal(parseVerifyEmailKind({ kind: "something_new" }), "verification")
  assert.equal(parseVerifyEmailKind({ kind: null }), "verification")
  assert.equal(parseVerifyEmailKind({ kind: "EMAIL_CHANGE" }), "verification") // case-sensitive
})

// --- branch 1: signup verification (must stay byte-identical) -------------

test("verification copy is BYTE-IDENTICAL to the pre-HF-2 page", () => {
  const copy = verifyEmailSuccessCopy("verification")
  assert.equal(copy.title, LEGACY_TITLE)
  assert.equal(copy.subtitle, LEGACY_SUBTITLE)
  assert.equal(copy.alertHeading, LEGACY_HEADING)
  assert.equal(copy.alertBody, LEGACY_BODY)
  assert.equal(copy.alertTone, "warning")
  assert.equal(copy.ctaLabel, "Go to Login")
})

test("legacy (no `kind`) response renders the unchanged verification copy", () => {
  // End-to-end of the compatibility path: legacy body -> kind -> copy.
  const copy = verifyEmailSuccessCopy(parseVerifyEmailKind({ message: "Email verified" }))
  assert.equal(copy.kind, "verification")
  assert.equal(copy.title, LEGACY_TITLE)
  assert.equal(copy.alertHeading, LEGACY_HEADING)
  assert.equal(copy.alertBody, LEGACY_BODY)
})

// --- branch 2: email change ----------------------------------------------

test("email-change copy replaces the pending-approval message", () => {
  const copy = verifyEmailSuccessCopy("email_change")
  assert.equal(copy.kind, "email_change")
  assert.equal(copy.alertBody, "Your email has been updated. Use it next time you sign in.")
  assert.equal(copy.title, "Email updated")
  assert.equal(copy.subtitle, "Your login email has been changed.")
  assert.equal(copy.alertTone, "success")
  // No bold lead line — the body is the whole message.
  assert.equal(copy.alertHeading, null)
})

test("email-change copy never mentions approval (the defect HF-2 fixes)", () => {
  // An email change is made by an ALREADY-approved business; the old copy told
  // them their account was pending approval, which is simply untrue.
  const copy = verifyEmailSuccessCopy("email_change")
  const surface = `${copy.title} ${copy.subtitle} ${copy.alertHeading ?? ""} ${copy.alertBody}`
  assert.ok(!/pending/i.test(surface), "email-change copy must not say 'pending'")
  assert.ok(!/approv/i.test(surface), "email-change copy must not mention approval")
  assert.ok(!/verif/i.test(surface), "email-change copy must not say 'verified'")
})

test("the two branches are actually distinct on every visible field", () => {
  const v = verifyEmailSuccessCopy("verification")
  const e = verifyEmailSuccessCopy("email_change")
  assert.notEqual(v.title, e.title)
  assert.notEqual(v.subtitle, e.subtitle)
  assert.notEqual(v.alertBody, e.alertBody)
  assert.notEqual(v.alertTone, e.alertTone)
  // The CTA is intentionally shared — both land on the login screen.
  assert.equal(v.ctaLabel, e.ctaLabel)
})
