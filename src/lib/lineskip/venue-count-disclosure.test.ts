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
// V5 REDEMPTION §8 UPDATE. The public venue page no longer renders a line-skip
// section AT ALL — F15 moves that product onto Door Access, and the section was
// removed wholesale. The ruling this file guards is therefore satisfied more
// strongly than before: there is no longer any surface on this page that COULD
// disclose a remaining count.
//
// The three count-leak guards below are unchanged and still load-bearing — they
// now also catch the section being reinstated with its old body. What changed is
// the third test: it used to assert `soldOut` was still PRESENT (it was the one
// allowed state, on the line-skip card). That card is gone, so asserting its
// local still exists would pin the very code this wave deleted. It is replaced
// by the stronger claim — that the whole section, and the fields it fed on, are
// absent from this page.
//
// Deliberately NOT covered: the server still SENDING capacity/tickets_sold,
// which is fine and still typed on VenueData — the rule is about rendering, not
// transport.
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

test("the line-skip section is gone from the public venue page entirely", () => {
  const page = venuePage()
  // The section, its anchor, and its deep link.
  assert.ok(!page.includes('id="lineskips"'), "the line-skip section is back on the public page")
  assert.ok(!page.includes("highlightLineSkip"), "the ?line_skip deep-link scroll is back")
  assert.ok(!/href=\{[^}]*`\/lineskip\//.test(page), "a /lineskip/:id link is back on the public page")
  // And the two fields a count disclosure would have to read. Destructuring
  // `line_skips` is what made the old leak possible; the field stays TYPED on
  // VenueData (the API still sends it), so this asserts on the read, not the type.
  assert.ok(
    !/const\s*\{[^}]*\bline_skips\b[^}]*\}\s*=\s*data/.test(page),
    "line_skips is being destructured again — the public page must not read it",
  )
  assert.ok(!/\bls\.tickets_sold\b/.test(page), "tickets_sold is being read again")
  assert.ok(!/\bls\.capacity\b/.test(page), "capacity is being read again")
})

test("the SEO page that links into the venue page leaks no counts either", () => {
  const seo = seoPage()
  for (const leak of ["tickets_sold", "capacity", "going fast"]) {
    assert.ok(!seo.includes(leak), `VenueSeoPage.tsx now references ${leak} — check it is not a count disclosure`)
  }
})
