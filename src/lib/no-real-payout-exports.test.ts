// F01 (audit wave 1, 2026-10-26) — a real payouts export must never be tracked.
//
// proof_payouts_cache_contract/ carried a genuine `bizzy-payouts-*.csv` download
// (1,480 rows: buyer emails, order ids, payment-intent ids) for months. This
// test walks every tracked-looking CSV in the repo and fails when one looks
// like real payouts data:
//   - any file named like the dashboard export (`bizzy-payouts-*.csv`), or
//   - any CSV containing an email address, a Stripe object id (pi_/po_/ch_/
//     acct_/re_/tr_), or more than MAX_FIXTURE_ROWS data rows.
// A scrubbed synthetic fixture (a handful of rows, no emails, no Stripe ids)
// still passes. Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, basename } from "node:path"

const ROOT = process.cwd()
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "build", "coverage", ".vercel", ".worktrees"])
const MAX_FIXTURE_ROWS = 25

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const STRIPE_ID_RE = /\b(?:pi|po|ch|acct|re|tr|trr|cs)_[A-Za-z0-9]{8,}\b/
const EXPORT_NAME_RE = /^bizzy-payouts-.*\.csv$/i

export function walkCsvFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walkCsvFiles(full, out)
    else if (/\.csv$/i.test(entry)) out.push(full)
  }
  return out
}

export function payoutExportProblems(path: string, content: string): string[] {
  const problems: string[] = []
  if (EXPORT_NAME_RE.test(basename(path))) problems.push("named like a real dashboard export")
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "")
  if (lines.length - 1 > MAX_FIXTURE_ROWS) problems.push(`${lines.length - 1} data rows (> ${MAX_FIXTURE_ROWS})`)
  if (EMAIL_RE.test(content)) problems.push("contains an email address")
  if (STRIPE_ID_RE.test(content)) problems.push("contains a Stripe object id")
  return problems
}

// ── the detector itself is checked first, so a silent regex regression cannot pass the repo ──

test("detector: flags a row with a buyer email and a payment-intent id", () => {
  const csv = "payout_date,buyer,payment_intent_id\n2026-07-14,someone@example.com,pi_3Tx0000000000000AbCd\n"
  const problems = payoutExportProblems("/x/data.csv", csv)
  assert.ok(problems.includes("contains an email address"), problems.join("; "))
  assert.ok(problems.includes("contains a Stripe object id"), problems.join("; "))
})

test("detector: flags the export filename pattern even when the body is clean", () => {
  const problems = payoutExportProblems("/x/bizzy-payouts-2026-07-14-to-2026-07-28.csv", "a,b\n1,2\n")
  assert.deepEqual(problems, ["named like a real dashboard export"])
})

test("detector: a tiny scrubbed synthetic fixture passes", () => {
  const csv = "payout_date,event,quantity,gross_charged,host_net\n2026-07-14,Test Night,2,20.00,16.00\n"
  assert.deepEqual(payoutExportProblems("/x/fixture.csv", csv), [])
})

// ── the repo ──

test("no tracked CSV in the repo looks like a real payouts export", () => {
  const offenders: string[] = []
  for (const file of walkCsvFiles(ROOT)) {
    const problems = payoutExportProblems(file, readFileSync(file, "utf8"))
    if (problems.length) offenders.push(`${relative(ROOT, file)}: ${problems.join("; ")}`)
  }
  assert.deepEqual(
    offenders,
    [],
    `real payouts data must not be committed (remove it, or replace with a scrubbed fixture ≤ ${MAX_FIXTURE_ROWS} rows, no emails / Stripe ids):\n  ${offenders.join("\n  ")}`,
  )
})
