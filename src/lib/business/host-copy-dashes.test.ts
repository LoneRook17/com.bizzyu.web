// Luke QA: host-facing business-dashboard copy must not use em dashes (U+2014)
// or en dashes (U+2013). Replace with a period, comma, parentheses, or ASCII "-".
//
// Same style as door-access.test.ts (`!src.includes("\u2014")`), but comments
// are stripped first so developer notes can keep clause dashes. What remains
// is string literals plus JSX text (banners, empty states, tooltips, dialogs).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, "../..")
const EM = "\u2014"
const EN = "\u2013"

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/.*$/gm, "")
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      walkTs(p, acc)
      continue
    }
    if (/\.test\.tsx?$/.test(name)) continue
    if (/\.tsx?$/.test(name)) acc.push(p)
  }
  return acc
}

function assertNoTypographicDashes(relFromLib: string, label: string) {
  const file = fileURLToPath(new URL(relFromLib, import.meta.url))
  const src = stripComments(readFileSync(file, "utf8"))
  assert.ok(!src.includes(EM), `${label} still has an em dash`)
  assert.ok(!src.includes(EN), `${label} still has an en dash`)
}

test("escrow and payments host copy has no em or en dashes", () => {
  const files: Array<[string, string]> = [
    ["../../components/business/v2/EscrowHistory.tsx", "EscrowHistory"],
    ["../../components/business/v2/EscrowPanel.tsx", "EscrowPanel"],
    ["../../components/business/v2/settings/StripeConnectCard.tsx", "StripeConnectCard"],
    ["../../components/business/v2/HomeStripeConnectPrompt.tsx", "HomeStripeConnectPrompt"],
    ["../../app/business/(dashboard)/settings/page.tsx", "settings page"],
    ["../../app/business/(dashboard)/payouts/page.tsx", "payouts page"],
    ["../../components/business/v2/payouts/ReconcileView.tsx", "ReconcileView"],
    ["./escrow.ts", "escrow client copy"],
    ["./stripe-onboard-complete.ts", "stripe onboard complete"],
    ["./email-change.ts", "email-change copy"],
    ["./verify-email-copy.ts", "verify-email copy"],
    ["./payouts-computing-poll.ts", "payouts computing copy"],
    ["./payouts-reconcile.ts", "payouts reconcile copy"],
    ["./promoter-tab-copy.ts", "promoter tab copy"],
  ]
  for (const [rel, label] of files) {
    assertNoTypographicDashes(rel, label)
  }

  const panel = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/EscrowPanel.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(panel.includes("Once your business Stripe account is set up"))
  assert.ok(panel.includes("No action needed."))
  assert.ok(panel.includes("Nothing waits in escrow anymore."))
  assert.ok(panel.includes("Ready to send"))
  assert.ok(panel.includes("It is not on the way"))
  assert.ok(!panel.includes("onboarding —"))
  assert.ok(!panel.includes("needed —"))
  assert.ok(!panel.includes("directly —"))
})

test("business dashboard trees have no em/en dashes in UI string literals", () => {
  const roots = [
    join(SRC, "app/business"),
    join(SRC, "components/business"),
  ]
  const hits: string[] = []
  for (const root of roots) {
    for (const file of walkTs(root)) {
      const lines = stripComments(readFileSync(file, "utf8")).split("\n")
      lines.forEach((line, i) => {
        if (!line.includes(EM) && !line.includes(EN)) return
        hits.push(`${relative(SRC, file)}:${i + 1}: ${line.trim().slice(0, 140)}`)
      })
    }
  }
  assert.deepEqual(hits, [], hits.join("\n"))
})
