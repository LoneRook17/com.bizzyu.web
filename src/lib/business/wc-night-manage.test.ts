// Instance-manage pass (2026-08-29): clicking any instance card = its full
// /manage page. WC and RC night cards match EventCard's anatomy — View +
// Manage, no Scan, no Cancel on the card (cancel is unchanged as a flow; it
// lives inside manage's danger zone and on the night/program pages). The
// event manage page doubles as the WC-night instance manage: door code and
// the Scan tile now show for Weekly Cover too, since services
// redemptionGuard accepts native_scan for WC (post-ccdbf1c).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { eventCardBodyHref, eventListHref } from "./events-list.ts"
import type { EventListItem } from "./types.ts"

function ev(
  event_id: number,
  status: string,
  seriesId: number | null = null,
  extra: Partial<EventListItem> & { access_kind?: string | null } = {},
): EventListItem {
  return {
    event_id,
    name: `Event ${event_id}`,
    description: "",
    venue_name: "The Bar",
    venue_address: "",
    start_date_time: "2026-09-04 21:00:00",
    end_date_time: "2026-09-05 02:00:00",
    type: "Ticketed",
    status,
    is_21_plus: false,
    is_recurring: false,
    recurring_series_id: seriesId,
    total_attendees: 0,
    total_revenue: 0,
    ticket_sales_count: 0,
    checkin_rate: 0,
    ...extra,
  } as EventListItem
}

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8")
}

// ── eventCardBodyHref: click = manage ───────────────────────────────────────

test("a live instance's card body opens /manage directly", () => {
  assert.equal(eventCardBodyHref(ev(1, "published")), "/business/events/1/manage")
  assert.equal(eventCardBodyHref(ev(2, "approved", 40)), "/business/events/2/manage")
  assert.equal(eventCardBodyHref(ev(3, "cancelled")), "/business/events/3/manage")
})

test("draft and in-review events keep the detail page — it owns publish", () => {
  assert.equal(eventCardBodyHref(ev(4, "draft")), "/business/events/4")
  assert.equal(eventCardBodyHref(ev(5, "pending_approval")), "/business/events/5")
  assert.equal(eventCardBodyHref(ev(6, "pending_review")), "/business/events/6")
})

test("WC-stamped rows keep opening their program, same as eventListHref", () => {
  const night = ev(621, "published", 23, { access_kind: "door_access" })
  assert.equal(eventListHref(night, []), "/business/door-access/23")
  assert.equal(eventCardBodyHref(night, []), "/business/door-access/23")
})

// ── Card source guards ──────────────────────────────────────────────────────

test("EventCard: body = manage, RC cards lose Scan and View goes guest-facing", () => {
  const src = read("src/components/business/v2/events/EventCard.tsx")
  assert.ok(src.includes("eventCardBodyHref"), "card body routes through the click=manage helper")
  assert.ok(
    src.includes("eventListHref(event, programs, wcSeriesIds, inactiveWcSeriesIds)"),
    "View keeps the eventListHref contract for plain events",
  )
  assert.ok(src.includes("isSeriesNight"), "RC occurrences are distinguished")
  assert.ok(
    src.includes("!isSeriesNight && !isWcRow"),
    "Scan renders only on plain one-off event cards",
  )
  assert.ok(src.includes("eventCheckoutUrl"), "RC View is the guest checkout page for that night")
  assert.ok(src.includes("isPubliclyLinkable"), "guest View is withheld until the night is live")
})

test("AccessNightCard: guest View uses the Laravel checkout link, never a dash half-page", () => {
  const src = read("src/components/business/v2/host/AccessNightCard.tsx")
  assert.ok(src.includes("eventCheckoutUrl(manageEventId)"))
  assert.ok(src.includes("isPubliclyLinkable(status)"))
  assert.ok(
    src.includes("`/business/events/${manageEventId}/manage`"),
    "body and Manage both open the night's full manage page",
  )
  assert.ok(src.includes("nightHref("), "an unstamped night still falls back to the night editor")
})

test("HostDashList and the events page no longer carry card-cancel plumbing", () => {
  const list = read("src/components/business/v2/host/HostDashList.tsx")
  assert.ok(!list.includes("onCancel"), "no cancel callback threading")
  const page = read("src/app/business/(dashboard)/events/page.tsx")
  assert.ok(!page.includes("onNightCancelled"), "the list needs no cancel refresh hook")
})

// ── Manage page doubles as the WC instance manage ───────────────────────────

test("WC night manage: no door code, Scan tile stays, redemption list is view-only", () => {
  const src = read("src/app/business/(dashboard)/events/[id]/manage/page.tsx")
  // Round 2 (Luke, 2026-08-29): WC nights have NO door codes. The card is an
  // events-only credential again.
  assert.ok(src.includes("{!isDoorAccess && ("), "door code is WC-gated")
  assert.ok(src.includes("<DoorCodeCard"), "door code card still renders for events")
  const scanTile = src.indexOf('title: "Scan"')
  assert.ok(scanTile >= 0)
  const tileSlice = src.slice(scanTile, scanTile + 200)
  assert.ok(/show: true/.test(tileSlice), "the Scan tile shows for WC nights too")
  assert.ok(src.includes("Redemption list"), "WC keeps the redemption list")
  // View-only, like the app: it SHOWS who checked in. No check-off feature.
  assert.ok(!src.includes("Check names off"), "no check-names-off promise anywhere")
  assert.ok(!src.includes("check names off"), "no check-names-off promise anywhere")
  assert.ok(src.includes("Everyone who's checked in tonight"), "redemption copy is view-only")
  assert.ok(src.includes("Guests scan with any phone camera"), "camera reminder stays")
  assert.ok(src.includes("Open redemption list"), "WC header CTA stays the redemption list")
})

test("WC night manage is pink end to end — never Bizzy green", () => {
  const src = read("src/app/business/(dashboard)/events/[id]/manage/page.tsx")
  assert.ok(src.includes("WeeklyCoverAccent"), "the WC subtree gets the access accent provider")
  assert.ok(src.includes("isDoorAccess ? WeeklyCoverAccent : Fragment"))
  assert.ok(src.includes('isDoorAccess ? "access" : "event"'), "tiles + share row follow the accent")
  assert.ok(src.includes("hover:border-access/40"), "WC tile hover is pink")
  assert.ok(
    src.includes('isDoorAccess && badge.variant === "success" ? "access"'),
    "a live WC night's badge is pink, not green",
  )
  assert.ok(
    src.includes('isDoorAccess ? "access-secondary" : "secondary"'),
    "the WC header CTA is in the pink family",
  )
  const share = read("src/components/business/v2/ShareLinkRow.tsx")
  assert.ok(share.includes('accent === "access" ? "text-access"'), "share row can render pink")
})

test("the Schedules grid's night cards open the night's manage page", () => {
  const src = read("src/app/business/(dashboard)/door-access/[id]/page.tsx")
  assert.ok(
    src.includes("`/business/events/${night.event_id}/manage`"),
    "a stamped night's card opens /manage",
  )
  assert.ok(src.includes("nightHref(programId, night.occurrence_date)"), "unstamped nights keep the editor fallback")
  assert.ok(src.includes('accent="access"'), "the program link row is pink")
})
