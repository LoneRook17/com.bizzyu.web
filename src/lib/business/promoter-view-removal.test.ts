// Guard for the promoter dashboard-view removal (TF-CLEANUP-W).
//
// Services rejects promoter dashboard logins outright (TF-CLEANUP-S, dev :194
// — 403 "No business account is associated with this login."), so a promoter
// session can never reach the analytics page. The PromoterView branch and its
// PromoterStats component are dead and were removed; this pins the removal so
// they don't drift back in a merge.
//
// Deliberately NOT covered: the /promote + /promoter portal routes (separate
// promoter-facing product, alive and well), roster role labels (a team roster
// can still CONTAIN promoter-role members — only promoter SESSIONS are gone),
// and the unrouted _legacy snapshot.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = join(process.cwd(), "src")

test("the active analytics page has no promoter branch", () => {
  const page = readFileSync(join(SRC, "app/business/(dashboard)/analytics/page.tsx"), "utf8")
  assert.ok(!page.includes("PromoterView"), "PromoterView branch is back")
  assert.ok(!page.includes('=== "promoter"'), "promoter role check is back")
  assert.ok(!page.includes("PromoterStatsView"), "PromoterStatsView import is back")
  assert.ok(!page.includes("promoter-stats"), "promoter-stats fetch is back")
})

test("the v2 PromoterStats component stays deleted", () => {
  assert.ok(
    !existsSync(join(SRC, "components/business/v2/analytics/PromoterStats.tsx")),
    "components/business/v2/analytics/PromoterStats.tsx exists again — it is dead code (promoter sessions are blocked at login)",
  )
})
