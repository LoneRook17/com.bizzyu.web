import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  TRUSTED_DEAL_SUBMISSIONS_ORIGIN,
  DEAL_SUBMISSIONS_FORWARD_HEADERS,
  adminApiUrlWarning,
  forwardFailureLog,
  normalizeOrigin,
  submissionEmailSubject,
} from "./deal-submission-forward.ts"

test("trusted origin is https://bizzy-deals.com with no trailing slash", () => {
  assert.equal(normalizeOrigin("https://bizzy-deals.com/"), TRUSTED_DEAL_SUBMISSIONS_ORIGIN)
  assert.equal(adminApiUrlWarning("https://bizzy-deals.com"), null)
  assert.equal(adminApiUrlWarning("https://bizzy-deals.com/"), null)
})

test("unset or non-trusted ADMIN_API_URL warns", () => {
  assert.match(adminApiUrlWarning(undefined) ?? "", /unset/)
  assert.match(adminApiUrlWarning("") ?? "", /unset/)
  assert.match(adminApiUrlWarning("   ") ?? "", /unset/)
  const wrong = adminApiUrlWarning("http://3.80.143.224")
  assert.match(wrong ?? "", /not https:\/\/bizzy-deals.com/)
  assert.match(wrong ?? "", /Bad hostname/)
  assert.match(adminApiUrlWarning("http://bizzy-deals.com") ?? "", /not https:\/\/bizzy-deals.com/)
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
  assert.match(src, /adminApiUrlWarning/)
})
