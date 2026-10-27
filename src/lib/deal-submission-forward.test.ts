import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  TRUSTED_DEAL_SUBMISSIONS_ORIGIN,
  DEAL_SUBMISSIONS_FORWARD_HEADERS,
  DEAL_SUBMISSIONS_SECRET_HEADER,
  dealSubmissionsForwardHeaders,
  dealSubmissionsForwardOrigin,
  dealSubmissionsSecret,
  forwardFailureLog,
  submissionEmailSubject,
} from "./deal-submission-forward.ts"

test("forward origin defaults to https://bizzy-deals.com", () => {
  assert.equal(dealSubmissionsForwardOrigin(undefined), TRUSTED_DEAL_SUBMISSIONS_ORIGIN)
  assert.equal(dealSubmissionsForwardOrigin(null), "https://bizzy-deals.com")
  assert.equal(dealSubmissionsForwardOrigin(""), "https://bizzy-deals.com")
  assert.equal(dealSubmissionsForwardOrigin("   "), "https://bizzy-deals.com")
  assert.equal(dealSubmissionsForwardOrigin("https://bizzy-deals.com/"), "https://bizzy-deals.com")
})

test("DEAL_SUBMISSIONS_API_URL overrides the trusted origin when set", () => {
  assert.equal(
    dealSubmissionsForwardOrigin("http://127.0.0.1:8001/"),
    "http://127.0.0.1:8001",
  )
})

test("failed save is flagged in the email subject", () => {
  assert.equal(
    submissionEmailSubject(false, "BOGO coffee", "Cafe"),
    "New Deal Submission: BOGO coffee: Cafe",
  )
  assert.equal(
    submissionEmailSubject(true, "BOGO coffee", "Cafe"),
    "[NOT SAVED] New Deal Submission: BOGO coffee: Cafe",
  )
})

test("forward sends Accept: application/json and logs a truncated body", () => {
  assert.equal(DEAL_SUBMISSIONS_FORWARD_HEADERS.Accept, "application/json")
  const logged = forwardFailureLog(404, "x".repeat(2500))
  assert.equal(logged.status, 404)
  assert.equal(logged.body.length, 2000)
})

test("the submissions route does not treat a failed forward as 201", () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(here, "../app/api/submissions/route.ts"), "utf8")
  assert.match(src, /forwardRes\.ok/)
  assert.match(src, /status: 502/)
  assert.match(src, /headers: dealSubmissionsForwardHeaders\(secret\)/)
  assert.match(src, /submissionEmailSubject\(forwardFailed/)
  assert.match(src, /dealSubmissionsForwardOrigin\(process\.env\.DEAL_SUBMISSIONS_API_URL\)/)
  assert.equal(src.includes("process.env.ADMIN_API_URL"), false)
  assert.equal(src.includes("ADMIN_API_URL"), false)
})

// ---------------------------------------------------------------------------
// Audit A03: the Laravel hop is gated by X-Deal-Submissions-Secret.
// ---------------------------------------------------------------------------

test("forward headers carry X-Deal-Submissions-Secret alongside the JSON headers", () => {
  const headers = dealSubmissionsForwardHeaders("s3cret-value")
  assert.equal(DEAL_SUBMISSIONS_SECRET_HEADER, "X-Deal-Submissions-Secret")
  assert.equal(headers[DEAL_SUBMISSIONS_SECRET_HEADER], "s3cret-value")
  assert.equal(headers["Content-Type"], "application/json")
  assert.equal(headers.Accept, "application/json")
  // Never the Node ↔ Laravel skeleton key header.
  assert.equal("X-Admin-Secret" in headers, false)
  assert.deepEqual(Object.keys(headers).sort(), [
    "Accept",
    "Content-Type",
    "X-Deal-Submissions-Secret",
  ])
})

test("DEAL_SUBMISSIONS_SECRET is trimmed and blank means unset", () => {
  assert.equal(dealSubmissionsSecret(undefined), "")
  assert.equal(dealSubmissionsSecret(null), "")
  assert.equal(dealSubmissionsSecret("   "), "")
  assert.equal(dealSubmissionsSecret("  abc  "), "abc")
})

test("an empty secret can never produce forward headers", () => {
  assert.throws(() => dealSubmissionsForwardHeaders(""), /DEAL_SUBMISSIONS_SECRET/)
})

test("the submissions route fails closed when DEAL_SUBMISSIONS_SECRET is unset", () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(here, "../app/api/submissions/route.ts"), "utf8")
  // Secret is read server-side from the dedicated env var…
  assert.match(src, /dealSubmissionsSecret\(process\.env\.DEAL_SUBMISSIONS_SECRET\)/)
  // …and an empty secret marks the save failed instead of calling Laravel.
  assert.match(src, /if \(!secret\) \{\s*forwardFailed = true;/)
  assert.match(src, /DEAL_SUBMISSIONS_SECRET not configured/)
  // The fetch only ever runs with the secret header attached.
  assert.equal((src.match(/fetch\(`\$\{origin\}\/api\/deal-submissions`/g) ?? []).length, 1)
  assert.match(src, /headers: dealSubmissionsForwardHeaders\(secret\)/)
  // Never the admin skeleton key, never a public (client-bundled) env var.
  assert.equal(src.includes("ADMIN_API_SECRET"), false)
  assert.equal(src.includes("X-Admin-Secret"), false)
  assert.equal(src.includes("NEXT_PUBLIC_DEAL_SUBMISSIONS"), false)
})
