import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  BIZZY_VENUE_THEME,
  KNIGHT_THEME,
  KNIGHT_VENUE_ID,
  isKnightVenueIdentity,
  knightAppStoreUrl,
  resolveVenueBrand,
} from "./knight-venue-theme.ts"
import { KNIGHT_BUSINESS_ID } from "./business/knight.ts"

// DEV defaults (no NEXT_PUBLIC_KNIGHT_* in the test env).
test("DEV defaults: venue 990227, business 999935", () => {
  assert.equal(KNIGHT_VENUE_ID, 990227)
  assert.equal(KNIGHT_BUSINESS_ID, 999935)
})

test("Knight venue + toggle ON → knight", () => {
  assert.equal(resolveVenueBrand({ venueId: 990227, knightAppOnlyTickets: true }), "knight")
  assert.equal(resolveVenueBrand({ venueId: "990227", businessId: 1, knightAppOnlyTickets: true }), "knight")
})

test("Knight venue + toggle OFF (false / missing / null) → bizzy", () => {
  assert.equal(resolveVenueBrand({ venueId: 990227, knightAppOnlyTickets: false }), "bizzy")
  assert.equal(resolveVenueBrand({ venueId: 990227 }), "bizzy")
  assert.equal(resolveVenueBrand({ venueId: 990227, knightAppOnlyTickets: null }), "bizzy")
  // Only the boolean true counts: a payload that sent a string never themes.
  assert.equal(resolveVenueBrand({ venueId: 990227, knightAppOnlyTickets: "1" as unknown as boolean }), "bizzy")
})

test("any other venue + toggle ON → bizzy", () => {
  assert.equal(resolveVenueBrand({ venueId: 331, businessId: 267, knightAppOnlyTickets: true }), "bizzy")
  assert.equal(resolveVenueBrand({ venueId: null, knightAppOnlyTickets: true }), "bizzy")
  assert.equal(resolveVenueBrand({ venueId: "abc", knightAppOnlyTickets: true }), "bizzy")
})

test("the existing Knight business id also identifies the venue", () => {
  assert.equal(isKnightVenueIdentity({ venueId: 5, businessId: 999935 }), true)
  assert.equal(resolveVenueBrand({ venueId: 5, businessId: 999935, knightAppOnlyTickets: true }), "knight")
  assert.equal(isKnightVenueIdentity({ venueId: 5, businessId: 267 }), false)
})

test("App Store URL: https only, else null (button hidden, never Bizzy)", () => {
  assert.equal(knightAppStoreUrl(undefined), null)
  assert.equal(knightAppStoreUrl(""), null)
  assert.equal(knightAppStoreUrl("   "), null)
  assert.equal(knightAppStoreUrl("http://apps.apple.com/x"), null)
  assert.equal(knightAppStoreUrl("javascript:alert(1)"), null)
  assert.equal(knightAppStoreUrl(" https://apps.apple.com/app/knight-library/id123 "), "https://apps.apple.com/app/knight-library/id123")
})

test("tokens mirror core CheckoutAccent's Knight branch; Bizzy tokens are the page's own", () => {
  assert.equal(KNIGHT_THEME.bg, "#050505")
  assert.equal(KNIGHT_THEME.surface, "#141414")
  assert.equal(KNIGHT_THEME.border, "#292721")
  assert.equal(KNIGHT_THEME.accent, "#D1AD63")
  assert.equal(KNIGHT_THEME.accentRgb, "209, 173, 99")
  assert.equal(KNIGHT_THEME.logo, "/images/knight-library-logo.png")
  assert.equal(BIZZY_VENUE_THEME.bg, "#0a0a0f")
  assert.equal(BIZZY_VENUE_THEME.accent, "#05EB54")
  assert.equal(BIZZY_VENUE_THEME.logo, "/images/bizzy-logo.png")
})

test("venue page: the Bizzy chrome strings are intact and the Knight button never links to Bizzy", () => {
  const client = readFileSync(new URL("../app/venue/[venueId]/VenuePageClient.tsx", import.meta.url), "utf8")
  assert.ok(client.includes("Open in Bizzy app"))
  assert.ok(client.includes('href={`bizzy://venue/${venue.id}`}'))
  assert.ok(client.includes('<img src="/images/bizzy-logo.png" alt="Bizzy"'))
  assert.ok(client.includes("Open in Knight Library"))
  assert.ok(client.includes('data-brand="knight"'))
  // The Knight button is gated on appStoreUrl; there is no Bizzy fallback href on it.
  const knightButton = client.slice(client.indexOf("appStoreUrl &&"), client.indexOf("Open in Knight Library"))
  assert.ok(!knightButton.includes("bizzy"), "Knight button must not link to Bizzy")
  const page = readFileSync(new URL("../app/venue/[venueId]/page.tsx", import.meta.url), "utf8")
  assert.ok(page.includes("resolveVenueBrand("))
  assert.ok(
    /itunes:\s*brand === "knight"\s*\?\s*null/.test(page),
    "the iOS Smart App Banner (Bizzy App Store) is Bizzy-only; Knight opts out of the layout banner with null",
  )
})
