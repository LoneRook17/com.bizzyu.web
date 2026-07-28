// Guard for the ad-blocker-safe API path rename (TF-CLEANUP-W / TF-CLEANUP-S).
//
// EasyPrivacy-style filter lists match "/analytics/" and "/stats" fragments in
// request URLs, which silently error-walled the dashboard analytics surfaces
// for users browsing with a blocker on. Services (dev :194) dual-mounts the
// renamed paths, so the web client fetches only the safe spellings:
//   /business/analytics/*            -> /business/insights/*
//   /business/deals/stats            -> /business/deals/impressions
//   /business/deals/:id/stats/daily  -> /business/deals/:id/impressions/daily
//
// These tests grep the SOURCE TREE so a pasted-back old path fails `npm test`
// (the pages are client components — there is no pure seam to unit-test a
// fetch URL through, the literal IS the contract).
//
// Known residuals this guard deliberately does NOT ban (no server dual-mount
// exists yet — flipping them would 404): /business/line-skips/*analytics*,
// /business/dashboard/quick-stats, /checkin/event/:id/stats.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const SRC = join(process.cwd(), "src")

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

// This file necessarily spells out the banned literals — exclude it from its
// own scan.
const sources = walk(SRC).filter((f) => !f.endsWith("adblock-safe-api-paths.test.ts"))

// ── (1) The old blockable paths must not reappear anywhere in src ───────────
// "/business/analytics/" is banned WITH the trailing slash on purpose: the
// bare "/business/analytics" (no slash) is the PAGE route — the browser URL
// and nav hrefs — which ad blockers don't see and bookmarks depend on.
// Renaming the page route is a separate, deferred item.

const BANNED = ["/business/analytics/", "/business/deals/stats", "/stats/daily"]

test("no source file contains an old ad-blocker-matched API path literal", () => {
  for (const file of sources) {
    const text = readFileSync(file, "utf8")
    for (const banned of BANNED) {
      assert.ok(
        !text.includes(banned),
        `${file.slice(SRC.length + 1)} still contains "${banned}" — use the /insights|/impressions spelling (services dual-mounts both)`,
      )
    }
  }
})

// ── (2) Every flipped surface pins the renamed literal ──────────────────────

const EXPECTED: Array<[string, string[]]> = [
  [
    "app/business/(dashboard)/analytics/page.tsx",
    ["/business/insights/deals/overview", "/business/insights/events/overview"],
  ],
  [
    "app/business/(dashboard)/events/[id]/manage/analytics/page.tsx",
    ["/business/insights/events/", "/per-scanner"],
  ],
  ["components/business/v2/analytics/DealsOverview.tsx", ["/business/insights/deals/"]],
  ["components/business/v2/analytics/EventsOverview.tsx", ["/business/insights/events/"]],
  ["lib/business/deal-stats.ts", ["/business/deals/impressions", "/impressions/daily"]],
]

test("every flipped surface fetches the renamed /insights + /impressions paths", () => {
  for (const [rel, literals] of EXPECTED) {
    const text = readFileSync(join(SRC, rel), "utf8")
    for (const literal of literals) {
      assert.ok(text.includes(literal), `${rel} is missing expected literal "${literal}"`)
    }
  }
})
