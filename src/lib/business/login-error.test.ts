// Unit tests for the login-failure copy resolution (TF-CLEANUP-W), used by
// the active login page and the _legacy twin.
//
// The contract under test:
//  (1) a 403's server message renders VERBATIM — services puts the login-block
//      reason there, incl. the TF-CLEANUP-S no-membership message — except the
//      unverified-email 403, which keeps its friendlier fixed copy;
//  (2) a 401 (bad credentials) always renders the GENERIC line, never the
//      server message (no email-existence probing via the login form);
//  (3) anything unrecognized degrades to the safe fallback.
//
// Errors are built structurally ({ status } on an Error), matching ApiError's
// shape — importing ApiError would drag in the api-client import chain, which
// doesn't resolve under `node --test` (same constraint as deal-stats.ts).
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  loginErrorMessage,
  GENERIC_CREDENTIALS_ERROR,
  VERIFY_EMAIL_ERROR,
  FALLBACK_LOGIN_ERROR,
} from "./login-error.ts"

// Exactly what services sends since TF-CLEANUP-S (dev :194) for a valid login
// with no business membership (removed user, promoter).
const NO_BUSINESS_MESSAGE = "No business account is associated with this login."

function apiErr(status: number, message: string): Error {
  return Object.assign(new Error(message), { status })
}

test("403 no-membership: the services message renders verbatim", () => {
  assert.equal(loginErrorMessage(apiErr(403, NO_BUSINESS_MESSAGE)), NO_BUSINESS_MESSAGE)
})

test("403 unverified-email keeps its fixed copy (takes precedence over passthrough)", () => {
  assert.equal(
    loginErrorMessage(apiErr(403, "Please verify your email address first")),
    VERIFY_EMAIL_ERROR,
  )
  // Match is case-insensitive on "verify" (and only "verify" — the inflected
  // "verified" never matched, before or after the refactor).
  assert.equal(loginErrorMessage(apiErr(403, "Please VERIFY your email")), VERIFY_EMAIL_ERROR)
})

test("401 always renders the generic line — the server message never leaks", () => {
  assert.equal(loginErrorMessage(apiErr(401, "Unauthorized")), GENERIC_CREDENTIALS_ERROR)
  assert.equal(
    loginErrorMessage(apiErr(401, "no user with that email")),
    GENERIC_CREDENTIALS_ERROR,
    "a 401 message that reveals email existence must be flattened to the generic line",
  )
})

test("other statuses with a message pass it through (e.g. a 500's body message)", () => {
  assert.equal(loginErrorMessage(apiErr(500, "Internal server error")), "Internal server error")
})

test("unrecognized failures degrade to the safe fallback", () => {
  assert.equal(loginErrorMessage(new TypeError("Failed to fetch")), FALLBACK_LOGIN_ERROR, "network failure (no status)")
  assert.equal(loginErrorMessage(null), FALLBACK_LOGIN_ERROR)
  assert.equal(loginErrorMessage("boom"), FALLBACK_LOGIN_ERROR)
  assert.equal(loginErrorMessage(apiErr(403, "")), FALLBACK_LOGIN_ERROR, "a message-less 403 never renders a blank alert")
})
