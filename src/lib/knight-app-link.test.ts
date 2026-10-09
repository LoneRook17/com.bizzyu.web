import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  KNIGHT_VENUE_APP_LINK,
  isKnightBusinessId,
  isKnightVenueId,
  scheduleAppStoreFallback,
  venueQrFileName,
  venueShareUrl,
} from "./knight-app-link.ts"

test("the Knight venue link is knightlibrary.app/v and never Bizzy", () => {
  assert.equal(KNIGHT_VENUE_APP_LINK, "https://knightlibrary.app/v")
  assert.ok(!/bizzy/i.test(KNIGHT_VENUE_APP_LINK))
})

test("identity: DEV defaults 990227 / 999935, ids only", () => {
  assert.equal(isKnightVenueId(990227), true)
  assert.equal(isKnightVenueId("990227"), true)
  assert.equal(isKnightVenueId(331), false, "prod id is not the DEV default")
  assert.equal(isKnightVenueId(null), false)
  assert.equal(isKnightVenueId("abc"), false)
  assert.equal(isKnightBusinessId(999935), true)
  assert.equal(isKnightBusinessId(267), false)
})

test("venueShareUrl: Knight venue + toggle ON → the app link", () => {
  assert.equal(
    venueShareUrl({ venueId: 990227, origin: "https://bizzyu.com", knightAppOnlyTickets: true }),
    "https://knightlibrary.app/v",
  )
})

test("venueShareUrl: Knight venue + toggle OFF / unknown → the normal page link (unchanged)", () => {
  assert.equal(venueShareUrl({ venueId: 990227, origin: "https://bizzyu.com", knightAppOnlyTickets: false }), "https://bizzyu.com/venue/990227")
  assert.equal(venueShareUrl({ venueId: 990227, origin: "https://bizzyu.com" }), "https://bizzyu.com/venue/990227")
  assert.equal(venueShareUrl({ venueId: 990227, origin: "https://bizzyu.com", knightAppOnlyTickets: null }), "https://bizzyu.com/venue/990227")
})

test("venueShareUrl: every other venue → the normal page link, toggle or not (Pat's Liquor etc.)", () => {
  assert.equal(venueShareUrl({ venueId: 260, origin: "https://bizzyu.com", knightAppOnlyTickets: true }), "https://bizzyu.com/venue/260")
  assert.equal(venueShareUrl({ venueId: 5, origin: "https://com-bizzyu-web-l2gp.vercel.app" }), "https://com-bizzyu-web-l2gp.vercel.app/venue/5")
})

test("QR file name: Knight vs Bizzy", () => {
  assert.equal(venueQrFileName("Knight Library", true), "knight-library-knight-library-qr.png")
  assert.equal(venueQrFileName("Pat's Liquor", false), "pat-s-liquor-bizzy-qr.png")
})

test("App Store fallback fires only while the page is still visible", () => {
  const fired: string[] = []
  const mk = (visibilityState: string) => {
    let cb: (() => void) | null = null
    const win = {
      setTimeout: ((fn: () => void) => { cb = fn; return 1 }) as unknown as Window["setTimeout"],
      location: { set href(v: string) { fired.push(v) } } as unknown as Location,
      document: { visibilityState } as unknown as Document,
    }
    return { win, run: () => cb && cb() }
  }
  const visible = mk("visible")
  scheduleAppStoreFallback("https://apps.apple.com/app/id1", 0, visible.win)
  visible.run()
  assert.deepEqual(fired, ["https://apps.apple.com/app/id1"])
  const hidden = mk("hidden")
  scheduleAppStoreFallback("https://apps.apple.com/app/id1", 0, hidden.win)
  hidden.run()
  assert.deepEqual(fired, ["https://apps.apple.com/app/id1"], "backgrounded (app opened) → no store redirect")
  // no window at all (server) → no-op
  scheduleAppStoreFallback("https://apps.apple.com/app/id1", 0, undefined)
})

test("venue page: the Knight button is knightlibrary.app/v; no Bizzy handoff on the Knight branch", () => {
  const client = readFileSync(new URL("../app/venue/[venueId]/VenuePageClient.tsx", import.meta.url), "utf8")
  // The header has two `{knight ? (` forks (logo, then the button); take
  // the button fork: from its `appStoreUrl && (` guard to the Bizzy branch.
  const knightStart = client.indexOf("appStoreUrl && (")
  const bizzyStart = client.indexOf(") : (", knightStart)
  const knightBranch = client.slice(knightStart, bizzyStart)
  assert.ok(knightBranch.includes("href={KNIGHT_VENUE_APP_LINK}"))
  assert.ok(knightBranch.includes("Open in Knight Library"))
  assert.ok(!/bizzy:\/\//.test(knightBranch), "no bizzy:// on the Knight branch")
  assert.ok(!/apps\.apple\.com|itunes/i.test(knightBranch.replace("scheduleAppStoreFallback", "")))
  // The Bizzy branch is byte-for-byte what it was.
  assert.ok(client.includes('href={`bizzy://venue/${venue.id}`}'))
  assert.ok(client.includes("Open in Bizzy app"))
  const page = readFileSync(new URL("../app/venue/[venueId]/page.tsx", import.meta.url), "utf8")
  assert.ok(/itunes:\s*brand === "knight"\s*\?\s*null/.test(page), "Knight page has no Smart App Banner")
})

test("dashboard Venue pages card: Knight venue + toggle ON uses the app link; others unchanged", () => {
  const src = readFileSync(new URL("../components/business/v2/settings/VenuePageSection.tsx", import.meta.url), "utf8")
  assert.ok(src.includes("venueShareUrl({"))
  assert.ok(src.includes("const knight = isKnightVenueId(venueId)") && src.includes("if (!knight) return"), "only the Knight venue ever asks for the toggle")
  assert.ok(src.includes("return `${origin}/venue/${id}`"), "the normal link builder is untouched")
})

test("AASA: Bizzy no longer claims the Knight venue page; every other claim is intact", () => {
  const aasa = JSON.parse(readFileSync(new URL("../../public/.well-known/apple-app-site-association", import.meta.url), "utf8"))
  const comps: Array<{ "/": string; exclude?: boolean }> = aasa.applinks.details[0].components
  const paths = comps.map((c) => c["/"])
  const iExcl331 = paths.indexOf("/venue/331")
  const iExclDev = paths.indexOf("/venue/990227")
  const iVenue = paths.indexOf("/venue/*")
  assert.ok(iExcl331 >= 0 && comps[iExcl331].exclude === true)
  assert.ok(iExclDev >= 0 && comps[iExclDev].exclude === true)
  assert.ok(iExcl331 < iVenue && iExclDev < iVenue, "first match wins: exclusions must precede /venue/*")
  assert.equal(comps[iVenue].exclude, undefined, "/venue/* for every other venue still opens Bizzy")
  const others = comps.filter((c) => !c["/"].startsWith("/venue/3") && !c["/"].startsWith("/venue/9"))
  assert.deepEqual(
    others.map((c) => [c["/"], c.exclude ?? null]),
    [
      ["/", true], ["/ls/*", true], ["/checkin/*", true], ["/event/*/checkout", null], ["/event/*", null],
      ["/ticket/*/wallet", null], ["/ticket/*", null], ["/lineskip/*", null], ["/scanner/*", null],
      ["/business", true], ["/business/*", true], ["/promote/*", null], ["/p/*", null], ["/venue/*", null], ["/deal/*", null],
    ],
  )
})
