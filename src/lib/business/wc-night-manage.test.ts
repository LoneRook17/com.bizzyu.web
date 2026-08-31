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

test("round 3: WC manage backs to the events LIST; the WC detail page is pink", () => {
  const manage = read("src/app/business/(dashboard)/events/[id]/manage/page.tsx")
  assert.ok(
    manage.includes('isDoorAccess ? "/business/events" : `/business/events/${id}`'),
    "a WC night's manage never backs into the event detail half-page",
  )
  assert.ok(manage.includes('isDoorAccess ? "Back to events" : "Back to event"'))
  const detail = read("src/app/business/(dashboard)/events/[id]/page.tsx")
  assert.ok(detail.includes("isWcNight ? WeeklyCoverAccent : Fragment"), "WC detail gets the pink accent scope")
  assert.ok(
    detail.includes('isWcNight && badge.variant === "success" ? "access"'),
    "a live WC night's detail badge is pink",
  )
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

// ── Team page: WC path is pink and night-scoped ─────────────────────────────

test("team page: a WC night renders pink via the #119 read-then-accent pattern", () => {
  const src = read("src/app/business/(dashboard)/events/[id]/manage/team/page.tsx")
  assert.ok(src.includes("isWeeklyCoverProduct"), "the accent decision reads the product kind, never the name")
  assert.ok(src.includes("apiClient\n      .get<EventDetail>(`/business/events/${id}`)"), "one event read decides the accent")
  assert.ok(src.includes("pink ? WeeklyCoverAccent : Fragment"), "WC gets the access accent provider")
  assert.ok(src.includes("loading || !ready"), "skeleton holds until the accent is known")
})

test("team page: the door-code banner cannot render on the WC path", () => {
  const src = read("src/app/business/(dashboard)/events/[id]/manage/team/page.tsx")
  // The banner slot is a pink ternary; the door-code reframe lives in the
  // NOT-pink branch. WC nights have no door codes — their manage page hides
  // DoorCodeCard — so the old banner sent WC hosts to a dead end.
  const cond = src.indexOf("{pink ? (")
  const elseAt = src.indexOf(") : (", cond)
  assert.ok(cond >= 0 && elseAt > cond, "the banner slot is a pink ternary")
  const banner = src.indexOf("Just need someone scanning tickets tonight?")
  assert.ok(banner > elseAt, "the door-code banner lives behind the not-pink branch")
  const doorCopy = src.indexOf("door code")
  assert.ok(doorCopy > elseAt, "no door-code copy before the not-pink branch")
  // Bizzy-green hex literals appear ONLY inside the not-pink banner branch.
  assert.ok(src.indexOf("#05EB54") > elseAt, "no unguarded green hex on the pink path")
  const bannerEnd = src.indexOf("</Link>", elseAt)
  assert.ok(bannerEnd > elseAt)
  assert.ok(src.lastIndexOf("#05EB54") < bannerEnd, "green hex is confined to the banner")
  // The WC replacement note explains night-scoped access in the pink family.
  const note = src.indexOf("Teammates you add here get access to this night only.")
  assert.ok(note > cond && note < elseAt, "the WC note renders on the pink branch")
  assert.ok(src.includes("border-access/40"), "the WC note uses access tokens")
})

test("team page: WC copy is night-scoped; green copy is untouched", () => {
  const src = read("src/app/business/(dashboard)/events/[id]/manage/team/page.tsx")
  // subtitle
  assert.ok(src.includes("dashboard access to this night (co-hosts and crew)"), "WC subtitle is night-scoped")
  assert.ok(src.includes("dashboard access (co-hosts and crew)"), "green subtitle unchanged")
  // empty state — the WC description never mentions the door code
  assert.ok(src.includes("No managers or co-hosts on this night yet"))
  assert.ok(src.includes("Add a teammate who needs a Bizzy account and dashboard access to this night."))
  assert.ok(src.includes("For door staff who just scan tickets, use the door code instead."), "green empty state unchanged")
  // add dialog
  assert.ok(src.includes("Add a manager or co-host for this night"))
  assert.ok(src.includes("Access covers this night only"))
  assert.ok(src.includes("(Door staff who only scan tickets don’t need this. Use the door code.)"), "green dialog unchanged")
  // remove confirm
  assert.ok(src.includes('pink ? "will lose access to this night." : "will lose access to this event."'))
  // no green success badge on the WC path: crew (and owner, green's brand
  // twin) go pink; the green map is untouched
  assert.ok(src.includes("pink ? WC_ROLE_VARIANT : ROLE_VARIANT"))
  const wcMap = src.indexOf("WC_ROLE_VARIANT: Record")
  const wcMapSlice = src.slice(wcMap, wcMap + 200)
  assert.ok(/owner: "access", cohost: "info", crew: "access", promoter: "warning"/.test(wcMapSlice))
  assert.ok(src.includes('owner: "brand", cohost: "info", crew: "success", promoter: "warning"'), "green role map unchanged")
  // the WC manage tile matches: night-scoped subtitle on the WC branch only
  const manage = read("src/app/business/(dashboard)/events/[id]/manage/page.tsx")
  assert.ok(manage.includes("Add a teammate with a Bizzy account for this night"))
  assert.ok(manage.includes('subtitle: "Add a teammate with a Bizzy account", show: true'), "green tile unchanged")
})
