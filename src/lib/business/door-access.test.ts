// Unit tests for the Door Access typed client (V5 F14 / D-F11.1 / D-P5).
// Runnable with the Node built-in test runner: `npm test`.
//
// Guards, in the order they cost us if they break:
//   1. THE DAY-SHIFT TRAP. These dates are plain calendar strings. Any helper
//      that routes one through the browser's timezone renders a Friday night
//      as Thursday for every US viewer — the single highest-consequence bug
//      available on this surface, and invisible in a UTC-based CI.
//   2. THE INHERIT RULE. An inherited field must serialize as null, never as
//      the template's current value, or the night silently freezes at today's
//      price the next time the template moves.
//   3. Defensive normalization — MySQL/JSON hand back "1", 0/1 booleans, and
//      JSON-string columns.
//   4. The D-P5 vocabulary split, pinned so a rename can't quietly leak the
//      student string onto a host surface.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  accessRowStats,
  isoWeekday,
  nightsLeftThisWeek,
  normalizeDays,
  normalizeProgramSummary,
  normalizeNight,
  normalizeNightTier,
  formatDays,
  fmtNightDate,
  parseIsoDate,
  fmtTime,
  fmtWindow,
  usdPrice,
  fmtQuantity,
  redemptionModeLabel,
  programMetaLine,
  programScheduleLine,
  nightChips,
  splitNights,
  easternToday,
  draftFromNight,
  buildNightOverridePayload,
  draftHasOverrides,
  validateNightDraft,
  nightIsEditable,
  programHref,
  nightHref,
  WEEKLY_ACCESS_TYPE_LABEL,
  WEEKLY_ACCESS_CREATION_LABEL,
  EVENT_TYPE_LABEL,
  type DoorAccessNight,
  type DoorAccessProgram,
  type NightDraft,
} from "./door-access.ts"

// ── fixtures (fictional — this repo is public) ──────────────────────────────

function night(overrides: Partial<DoorAccessNight> = {}): DoorAccessNight {
  return {
    occurrence_date: "2026-08-28",
    is_stamped: true,
    is_scheduled: true,
    event_id: 4410,
    status: "published",
    start_date_time: "2026-08-28 22:00:00",
    end_date_time: "2026-08-29 02:00:00",
    passes_sold: 12,
    paid_orders: 9,
    is_customized: false,
    is_closed: false,
    has_override: false,
    start_time: "22:00:00",
    end_time: "02:00:00",
    tiers: [
      {
        tier_key: "cover",
        name: "Cover",
        description: null,
        price_usd: 10,
        quantity: 0,
        max_per_person: 2,
        sort_order: 0,
        is_disabled: false,
        is_overridden: false,
        template_price_usd: 10,
        template_quantity: 0,
      },
      {
        tier_key: "skip",
        name: "Skip the Line",
        description: "Front door, no wait",
        price_usd: 20,
        quantity: 50,
        max_per_person: 1,
        sort_order: 1,
        is_disabled: false,
        is_overridden: false,
        template_price_usd: 20,
        template_quantity: 50,
      },
    ],
    ...overrides,
  }
}

function program(overrides: Partial<DoorAccessProgram> = {}): DoorAccessProgram {
  return {
    id: 77,
    name: "Friday Cover",
    days_of_week: [5, 6],
    date_range_start: "2026-08-01",
    date_range_end: null,
    is_active: true,
    venue_id: 12,
    venue_name: "The Fictional Tap",
    start_time: "22:00:00",
    end_time: "02:00:00",
    flyer_image_url: null,
    redemption_mode: "camera_tap",
    template_tickets: [],
    migrated_from_line_skip_id: null,
    promotion_enabled: false,
    upcoming_night_count: 8,
    next_night_date: "2026-08-28",
    tier_count: 2,
    lowest_price_usd: 10,
    description: null,
    venue_address: "1 Example St",
    type: "Ticketed",
    is_21_plus: true,
    timezone: "US/Eastern",
    ...overrides,
  }
}

// ── 1. the day-shift trap ───────────────────────────────────────────────────

test("fmtNightDate renders the calendar date, never a tz-shifted one", () => {
  // 2026-08-28 is a Friday. new Date("2026-08-28") is UTC midnight, which is
  // Thursday evening in every US zone — if this ever prints "Thu, Aug 27",
  // the helper started parsing through the browser's timezone.
  assert.equal(fmtNightDate("2026-08-28"), "Fri, Aug 28")
  assert.equal(fmtNightDate("2026-01-01"), "Thu, Jan 1")
  assert.equal(fmtNightDate("2026-12-31"), "Thu, Dec 31")
  assert.equal(fmtNightDate("2026-08-28", { withYear: true }), "Fri, Aug 28, 2026")
})

test("fmtNightDate tolerates a datetime and refuses garbage without throwing", () => {
  assert.equal(fmtNightDate("2026-08-28 22:00:00"), "Fri, Aug 28")
  assert.equal(fmtNightDate("not-a-date"), "not-a-date")
  assert.equal(fmtNightDate(""), "")
})

test("parseIsoDate rejects out-of-range months and days", () => {
  assert.deepEqual(parseIsoDate("2026-08-28"), { y: 2026, m: 8, d: 28 })
  assert.equal(parseIsoDate("2026-13-01"), null)
  assert.equal(parseIsoDate("2026-08-32"), null)
  assert.equal(parseIsoDate("26-08-28"), null)
})

test("splitNights compares Y-m-d as strings and orders each half for its job", () => {
  const nights = [
    night({ occurrence_date: "2026-08-21" }),
    night({ occurrence_date: "2026-09-04" }),
    night({ occurrence_date: "2026-08-28" }),
    night({ occurrence_date: "2026-08-14" }),
  ]
  const { upcoming, past } = splitNights(nights, "2026-08-28")

  // Today counts as upcoming — tonight's door is the most-used row on the page.
  assert.deepEqual(
    upcoming.map((n) => n.occurrence_date),
    ["2026-08-28", "2026-09-04"]
  )
  // History reads most-recent-first.
  assert.deepEqual(
    past.map((n) => n.occurrence_date),
    ["2026-08-21", "2026-08-14"]
  )
})

test("easternToday returns a Y-m-d string on the platform's day boundary", () => {
  // 2026-08-21 03:30 UTC is 11:30 PM on Aug 20 in New York (EDT, UTC−4) —
  // mid-shift for a door program. The dashboard must agree with the server
  // about which night is "tonight", or a 1 AM check shows tomorrow's schedule.
  assert.equal(easternToday(new Date("2026-08-21T03:30:00Z")), "2026-08-20")
  // …and in January the same clock time is EST (UTC−5).
  assert.equal(easternToday(new Date("2026-01-21T04:30:00Z")), "2026-01-20")
  assert.match(easternToday(), /^\d{4}-\d{2}-\d{2}$/)
})

// ── 2. the inherit rule ─────────────────────────────────────────────────────

test("an inherited field serializes as null, not as the template's value", () => {
  const draft = draftFromNight(night(), program())
  const payload = buildNightOverridePayload(draft)

  // Nothing was overridden, so nothing may be pinned.
  assert.equal(payload.start_time, null)
  assert.equal(payload.end_time, null)
  assert.deepEqual(payload.tiers, [
    { tier_key: "cover", price_usd: null, quantity: null, is_disabled: false },
    { tier_key: "skip", price_usd: null, quantity: null, is_disabled: false },
  ])
})

test("draftFromNight detects price and quantity overrides independently", () => {
  const overridden = night({
    has_override: true,
    tiers: [
      {
        ...night().tiers[0],
        price_usd: 15, // overridden
        quantity: 0, // still template
        is_overridden: true,
        template_price_usd: 10,
        template_quantity: 0,
      },
    ],
  })
  const draft = draftFromNight(overridden, program())

  assert.equal(draft.tiers[0].inherit_price, false)
  assert.equal(draft.tiers[0].price_usd, 15)
  assert.equal(draft.tiers[0].inherit_quantity, true)

  const payload = buildNightOverridePayload(draft)
  assert.equal(payload.tiers?.[0].price_usd, 15)
  assert.equal(payload.tiers?.[0].quantity, null, "untouched quantity must go back to inheriting")
})

test("clearing an override in the draft sends null, undoing the pin", () => {
  const draft = draftFromNight(
    night({
      tiers: [{ ...night().tiers[0], price_usd: 15, is_overridden: true, template_price_usd: 10 }],
    }),
    program()
  )
  draft.tiers[0].inherit_price = true

  const payload = buildNightOverridePayload(draft)
  assert.equal(payload.tiers?.[0].price_usd, null)
})

test("custom times survive, and is_closed is always explicit", () => {
  const draft: NightDraft = {
    ...draftFromNight(night(), program()),
    inherit_times: false,
    start_time: "21:00:00",
    end_time: "01:00:00",
    is_closed: true,
  }
  const payload = buildNightOverridePayload(draft)

  assert.equal(payload.start_time, "21:00:00")
  assert.equal(payload.end_time, "01:00:00")
  assert.equal(payload.is_closed, true)
})

test("the payload always touches the night, so the server never 400s on an empty patch", () => {
  // setNightOverride rejects a body with neither night fields nor tier
  // patches. Every payload we build carries is_closed, so that path is
  // unreachable from this client.
  const payload = buildNightOverridePayload(draftFromNight(night({ tiers: [] }), program()))
  const touchesNight =
    payload.start_time !== undefined ||
    payload.end_time !== undefined ||
    payload.is_closed !== undefined
  assert.equal(touchesNight, true)
})

test("draftHasOverrides drives the Reset affordance", () => {
  const clean = draftFromNight(night(), program())
  assert.equal(draftHasOverrides(clean), false)

  assert.equal(draftHasOverrides({ ...clean, is_closed: true }), true)
  assert.equal(draftHasOverrides({ ...clean, inherit_times: false }), true)
  assert.equal(
    draftHasOverrides({
      ...clean,
      tiers: [{ ...clean.tiers[0], inherit_price: false }, clean.tiers[1]],
    }),
    true
  )
})

test("validateNightDraft mirrors the server's rules", () => {
  const clean = draftFromNight(night(), program())
  assert.deepEqual(validateNightDraft(clean), [])

  const negative = {
    ...clean,
    tiers: [{ ...clean.tiers[0], inherit_price: false, price_usd: -1 }, clean.tiers[1]],
  }
  assert.equal(validateNightDraft(negative).length, 1)

  const fractional = {
    ...clean,
    tiers: [{ ...clean.tiers[0], inherit_quantity: false, quantity: 2.5 }, clean.tiers[1]],
  }
  assert.equal(validateNightDraft(fractional).length, 1)

  // 0 is UNLIMITED platform-wide, and must never read as invalid.
  const unlimited = {
    ...clean,
    tiers: [{ ...clean.tiers[0], inherit_quantity: false, quantity: 0 }, clean.tiers[1]],
  }
  assert.deepEqual(validateNightDraft(unlimited), [])

  // Inherited times are not validated — there is nothing to validate.
  assert.deepEqual(validateNightDraft({ ...clean, start_time: "nonsense" }), [])
  assert.equal(
    validateNightDraft({ ...clean, inherit_times: false, start_time: "nonsense" }).length,
    1
  )
})

test("nightIsEditable closes the surface where an override would be invisible", () => {
  assert.equal(nightIsEditable(night()), true)
  assert.equal(nightIsEditable(night({ status: "cancelled" })), false)
  // Customized nights have left the program — edits belong on the event page.
  assert.equal(nightIsEditable(night({ is_customized: true })), false)
  // Unstamped is EDITABLE: overrides key off the date, which is what lets a
  // host price a holiday weeks before the generator reaches it.
  assert.equal(nightIsEditable(night({ is_stamped: false, event_id: null, status: null })), true)
})

// ── 3. defensive normalization ──────────────────────────────────────────────

test("normalizeDays accepts an array, a JSON string, and garbage", () => {
  assert.deepEqual(normalizeDays([5, 6]), [5, 6])
  assert.deepEqual(normalizeDays("[6,5]"), [5, 6], "sorted so display order is stable")
  assert.deepEqual(normalizeDays(["5", "7"]), [5, 7])
  assert.deepEqual(normalizeDays("not json"), [])
  assert.deepEqual(normalizeDays(null), [])
  assert.deepEqual(normalizeDays([0, 8, 5]), [5], "ISO weekdays are 1–7")
})

test("normalizeProgramSummary survives stringified numbers and 0/1 booleans", () => {
  const p = normalizeProgramSummary({
    id: "77",
    name: "Friday Cover",
    days_of_week: "[5]",
    date_range_start: "2026-08-01T00:00:00.000Z",
    date_range_end: null,
    is_active: 1,
    venue_id: "12",
    venue_name: "The Fictional Tap",
    start_time: "22:00:00",
    end_time: "02:00:00",
    flyer_image_url: "",
    redemption_mode: "camera_tap",
    template_tickets: '[{"tier_key":"cover","name":"Cover","price_usd":"10","sort_order":0}]',
    promotion_enabled: 0,
    upcoming_night_count: "8",
    next_night_date: "2026-08-28T00:00:00.000Z",
    lowest_price_usd: "10",
  })

  assert.equal(p.id, 77)
  assert.equal(p.is_active, true)
  assert.equal(p.promotion_enabled, false)
  assert.deepEqual(p.days_of_week, [5])
  assert.equal(p.date_range_start, "2026-08-01", "a datetime is trimmed to its calendar date")
  assert.equal(p.next_night_date, "2026-08-28")
  assert.equal(p.flyer_image_url, null, "an empty string is not an image")
  assert.equal(p.template_tickets[0].price_usd, 10)
  assert.equal(p.tier_count, 1, "derived from the tiers when the server omits it")
  assert.equal(p.lowest_price_usd, 10)
})

test("normalizeProgramSummary derives lowest_price_usd when the server omits it", () => {
  const p = normalizeProgramSummary({
    id: 1,
    template_tickets: [
      { tier_key: "skip", price_usd: 20, sort_order: 1 },
      { tier_key: "cover", price_usd: 10, sort_order: 0 },
    ],
  })
  assert.equal(p.lowest_price_usd, 10)
  assert.equal(p.template_tickets[0].tier_key, "cover", "tiers sort by sort_order")
})

test("normalizeProgramSummary yields a renderable object from an empty body", () => {
  const p = normalizeProgramSummary({})
  assert.equal(p.id, 0)
  assert.deepEqual(p.days_of_week, [])
  assert.deepEqual(p.template_tickets, [])
  assert.equal(p.lowest_price_usd, null)
  assert.equal(p.next_night_date, null)
})

test("normalizeNight coerces flags and sorts tiers", () => {
  const n = normalizeNight({
    occurrence_date: "2026-08-28T00:00:00.000Z",
    is_stamped: 1,
    is_scheduled: 1,
    event_id: "4410",
    passes_sold: "12",
    is_customized: 0,
    is_closed: 1,
    has_override: 1,
    start_time: "22:00:00",
    end_time: "02:00:00",
    tiers: [
      { tier_key: "skip", sort_order: 1, price_usd: "20" },
      { tier_key: "cover", sort_order: 0, price_usd: "10" },
    ],
  })

  assert.equal(n.occurrence_date, "2026-08-28")
  assert.equal(n.is_stamped, true)
  assert.equal(n.is_closed, true)
  assert.equal(n.is_customized, false)
  assert.equal(n.event_id, 4410)
  assert.equal(n.passes_sold, 12)
  assert.deepEqual(n.tiers.map((t) => t.tier_key), ["cover", "skip"])
})

test("normalizeNight defaults a missing tiers array rather than throwing", () => {
  assert.deepEqual(normalizeNight({ occurrence_date: "2026-08-28" }).tiers, [])
  assert.deepEqual(normalizeNight({ tiers: "not an array" }).tiers, [])
})

test("normalizeNightTier keeps the template values the editor compares against", () => {
  const t = normalizeNightTier({
    tier_key: "cover",
    price_usd: "15",
    quantity: "0",
    is_disabled: 0,
    is_overridden: 1,
    template_price_usd: "10",
    template_quantity: "0",
  })
  assert.equal(t.price_usd, 15)
  assert.equal(t.template_price_usd, 10)
  assert.equal(t.is_overridden, true)
  assert.equal(t.is_disabled, false)
})

// ── 4. presentation + D-P5 vocabulary ───────────────────────────────────────

test("formatDays reads as nights, and collapses a full week", () => {
  assert.equal(formatDays([5, 6]), "Fri · Sat")
  assert.equal(formatDays([1]), "Mon")
  assert.equal(formatDays([7]), "Sun")
  assert.equal(formatDays([1, 2, 3, 4, 5, 6, 7]), "Every night")
  assert.equal(formatDays([]), "")
})

test("fmtTime converts 24h wall-clock without touching timezones", () => {
  assert.equal(fmtTime("22:00:00"), "10:00 PM")
  assert.equal(fmtTime("02:00:00"), "2:00 AM")
  assert.equal(fmtTime("00:30:00"), "12:30 AM")
  assert.equal(fmtTime("12:00:00"), "12:00 PM")
  assert.equal(fmtTime(null), "")
  assert.equal(fmtTime("nonsense"), "")
})

test("fmtWindow drops a missing half instead of rendering a dangling dash", () => {
  assert.equal(fmtWindow("22:00:00", "02:00:00"), "10:00 PM – 2:00 AM")
  assert.equal(fmtWindow("22:00:00", ""), "10:00 PM")
  assert.equal(fmtWindow("", ""), "")
})

test("usdPrice says Free rather than $0.00, and fmtQuantity says Unlimited for 0", () => {
  assert.equal(usdPrice(10), "$10.00")
  assert.equal(usdPrice(0), "Free")
  assert.equal(usdPrice(null), "—")
  // 0 is UNLIMITED on this platform. "0 available" would read as sold out and
  // send a host hunting for capacity that was never constrained.
  assert.equal(fmtQuantity(0), "Unlimited")
  assert.equal(fmtQuantity(50), "50 available")
})

test("programMetaLine mirrors the app's F9 metadata line", () => {
  assert.equal(
    programMetaLine(program()),
    "The Fictional Tap · Fri · Sat · Recurring cover and line skip · From $10.00"
  )
})

test("programMetaLine drops empty segments instead of rendering blanks", () => {
  const line = programMetaLine(program({ venue_name: "", days_of_week: [], lowest_price_usd: null }))
  assert.equal(line, "Recurring cover and line skip")
  assert.ok(!line.includes(" ·  · "))
})

test("programScheduleLine leads with the window and singularizes one night", () => {
  assert.equal(
    programScheduleLine(program()),
    "10:00 PM – 2:00 AM · Next: Fri, Aug 28 · 8 nights scheduled"
  )
  assert.equal(
    programScheduleLine(program({ next_night_date: null, upcoming_night_count: 1 })),
    "10:00 PM – 2:00 AM · 1 night scheduled"
  )
})

test("nightChips are additive — a night can be several things at once", () => {
  assert.deepEqual(nightChips(night()), [])

  const labels = (n: DoorAccessNight) => nightChips(n).map((c) => c.label)
  assert.deepEqual(labels(night({ is_closed: true })), ["Closed"])
  assert.deepEqual(labels(night({ has_override: true })), ["Overridden"])
  assert.deepEqual(labels(night({ is_stamped: false })), ["Not generated yet"])
  assert.deepEqual(
    labels(night({ is_closed: true, has_override: true, is_customized: true, is_stamped: false })),
    ["Closed", "Overridden", "Customized", "Not generated yet"]
  )
})

test("redemptionModeLabel names both modes in host vocabulary", () => {
  assert.equal(redemptionModeLabel("camera_tap"), "Camera + tap")
  assert.equal(redemptionModeLabel("native_scan"), "Scan universal access")
})

test("D-P5: host surfaces never render the student string", () => {
  assert.equal(WEEKLY_ACCESS_TYPE_LABEL, "WEEKLY ACCESS")
  assert.equal(EVENT_TYPE_LABEL, "EVENT")
  assert.equal(WEEKLY_ACCESS_CREATION_LABEL, "Weekly Cover")
  // "Door Access" is the CONSUMER name. It is the API path and the
  // program_kind, but it must not appear on a host-facing label.
  for (const label of [WEEKLY_ACCESS_TYPE_LABEL, EVENT_TYPE_LABEL, WEEKLY_ACCESS_CREATION_LABEL]) {
    assert.ok(!/door access/i.test(label), `${label} leaks the student vocabulary`)
  }
})

test("D-F11.1: a program links to its SERIES, and a night hangs off that", () => {
  assert.equal(programHref(77), "/business/door-access/77")
  assert.equal(nightHref(77, "2026-08-28"), "/business/door-access/77/nights/2026-08-28")
  // The program href must never point at a single night.
  assert.ok(!/nights/.test(programHref(77)))
})

// ── D2-C: the row's at-a-glance numbers ─────────────────────────────────────

function rowProgram(extra: Record<string, unknown> = {}) {
  return normalizeProgramSummary({
    id: 1,
    name: "Friday Cover",
    days_of_week: [5, 6],
    date_range_start: "2026-08-01",
    date_range_end: null,
    is_active: 1,
    venue_name: "The Bar",
    start_time: "22:00:00",
    end_time: "02:00:00",
    tier_count: 3,
    upcoming_night_count: 8,
    next_night_date: "2026-08-28",
    ...extra,
  })
}

test("nights left this week counts from today forward, not the whole pattern", () => {
  // 2026-08-26 is a Wednesday (ISO 3). A Fri+Sat program has both still ahead.
  assert.equal(nightsLeftThisWeek(rowProgram(), "2026-08-26"), 2)
  // Saturday (ISO 6) — Friday has already gone.
  assert.equal(nightsLeftThisWeek(rowProgram(), "2026-08-29"), 1)
  // Sunday (ISO 7) closes the week out at zero.
  assert.equal(nightsLeftThisWeek(rowProgram(), "2026-08-30"), 0)
})

test("an ended program has no nights left, whatever its pattern says", () => {
  assert.equal(nightsLeftThisWeek(rowProgram({ is_active: 0 }), "2026-08-26"), 0)
  assert.equal(nightsLeftThisWeek(rowProgram({ date_range_end: "2026-08-20" }), "2026-08-26"), 0)
})

test("this week's SOLD is stubbed — this payload has no sales in it", () => {
  const stats = accessRowStats(rowProgram(), "2026-08-26")
  const sold = stats[0]
  assert.equal(sold.label, "sold this week")
  // A dash, never a zero: "0 sold" is a claim about a week that hasn't happened.
  assert.equal(sold.value, "—")
  assert.equal(sold.pending, true)
  assert.match(sold.hint ?? "", /door-access/)
  // The half that IS derivable renders for real beside it.
  assert.deepEqual(stats[1], { label: "nights left this week", value: "2" })
  assert.ok(!stats[1].pending)
})

test("isoWeekday reads a calendar date without a timezone round trip", () => {
  assert.equal(isoWeekday("2026-08-24"), 1) // Monday
  assert.equal(isoWeekday("2026-08-30"), 7) // Sunday
  assert.equal(isoWeekday("nonsense"), null)
})
