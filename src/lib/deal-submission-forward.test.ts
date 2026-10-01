import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  TRUSTED_DEAL_SUBMISSIONS_ORIGIN,
  DEAL_SUBMISSIONS_FORWARD_HEADERS,
  dealSubmissionsForwardOrigin,
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
  assert.match(src, /DEAL_SUBMISSIONS_FORWARD_HEADERS/)
  assert.match(src, /submissionEmailSubject\(forwardFailed/)
  assert.match(src, /dealSubmissionsForwardOrigin\(process\.env\.DEAL_SUBMISSIONS_API_URL\)/)
  assert.equal(src.includes("process.env.ADMIN_API_URL"), false)
  assert.equal(src.includes("ADMIN_API_URL"), false)
})
