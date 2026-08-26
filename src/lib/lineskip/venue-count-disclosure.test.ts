// Guard for the venue-page remaining-count removal (LSK-08).
//
// src/lib/lineskip/availability.ts carries the ruling: NEVER disclose remaining
// counts to customers. A capacity-limited night with room left is presented
// IDENTICALLY to an unlimited one — no "N left" text, no capacity progress bar.
// Only a genuinely sold-out night gets a distinct state.
//
// The venue page violated that: it recomputed `available` / `pctSold` inline and
// rendered a progress bar plus "{available} of {capacity} left, going fast".
// That surface is search-visible — the SEO page links into it
// (VenueSeoPage.tsx → /venue/{id}?line_skip={id}) — so the leak was public.
//
// This pins the removal so it can't drift back in a merge. It is a source-level
// guard, matching promoter-view-removal.test.ts, because VenuePageClient.tsx is
// a JSX client component full of @/ alias imports and cannot be loaded by the
// Node built-in test runner.
//
// Deliberately NOT covered: `soldOut` itself, which is correct and load-bearing
// (href, aria-disabled, styling, the "Sold out" pill) and is asserted present
// below; and the server still SENDING capacity/tickets_sold, which is fine —
// the rule is about rendering, not transport.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = join(process.cwd(), "src")

const venuePage = () => readFileSync(join(SRC, "app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
const seoPage = () => readFileSync(join(SRC, "components/venue/VenueSeoPage.tsx"), "utf8")

test("the venue page derives no remaining-count locals", () => {
  const page = venuePage()
  assert.ok(
    !/const\s+available\s*=/.test(page),
    "an `available` local is back — that is a remaining count",
  )
  assert.ok(
    !/const\s+pctSold\s*=/.test(page),
    "a `pctSold` local is back — that is the progress-bar percentage",
  )
})

test("the venue page renders no 'N left' copy and no capacity progress bar", () => {
  const page = venuePage()
  assert.ok(!page.includes("left{"), '"N of M left" copy is back')
  assert.ok(!page.includes("going fast"), '"going fast" urgency copy is back')
  assert.ok(
    !/width:\s*`\$\{pctSold\}%`/.test(page),
    "the capacity progress bar is back",
  )
})

test("sold-out handling survives untouched — it is the one allowed state", () => {
  const page = venuePage()
  assert.ok(/const\s+soldOut\s*=/.test(page), "the soldOut local was removed — it is load-bearing")
  assert.ok(page.includes('aria-disabled={soldOut}'), "the sold-out aria-disabled wiring is gone")
  assert.ok(page.includes("Sold out"), "the Sold out pill is gone")
})

test("the SEO page that links into the venue page leaks no counts either", () => {
  const seo = seoPage()
  for (const leak of ["tickets_sold", "capacity", "going fast"]) {
    assert.ok(!seo.includes(leak), `VenueSeoPage.tsx now references ${leak} — check it is not a count disclosure`)
  }
})
