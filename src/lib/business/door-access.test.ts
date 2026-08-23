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
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  normalizeProgram,
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
  nightDateBlock,
  fmtTime,
  fmtWindow,
  usdPrice,
  fmtQuantity,
  redemptionModeLabel,
  programMetaLine,
  programScheduleLine,
  nightChips,
  nightPreviewChip,
  nightPreviewPrice,
  visibleUpcomingNights,
  splitNights,
  easternToday,
  draftFromNight,
  buildNightOverridePayload,
  buildNightHoursPayload,
  draftHasOverrides,
  inheritIfMatchesTemplate,
  inheritIfMatchesTimes,
  applyNightHours,
  resetNightHours,
  validateNightDraft,
  nightIsEditable,
  nightHasEventTickets,
  nightTierTicketType,
  applyOverrideTicketForm,
  applyRecurringNightTier,
  buildNightSavePayload,
  parseRecurringNightTier,
  toggleNightTierDisabled,
  toggleNightTierSoldOut,
  reorderNightTiers,
  nightDraftIsDirty,
  parseOverrideTicketNumbers,
  NIGHT_TICKET_DESCRIPTION_MAX,
  nightSaveFeedback,
  nightGuestPricesNotLive,
  restampSignalsTimesOnlyHasSales,
  NIGHT_TICKET_APPLY_LABEL,
  NIGHT_TICKET_DRAFT_HINT,
  NIGHT_SAVE_LIVE,
  NIGHT_SAVE_NOT_LIVE,
  NIGHT_UNSAVED_BODY,
  NIGHT_UNSAVED_LEAVE,
  NIGHT_UNSAVED_TITLE,
  TIMES_ONLY_HAS_SALES,
  programHref,
  programEditHref,
  parseProgramPathId,
  programIdFromOwnedEvent,
  PROGRAM_KIND_DOOR_ACCESS,
  withDoorAccessProgramKind,
  MISSING_PROGRAM_ID_DESCRIPTION,
  MISSING_PROGRAM_ID_TITLE,
  readAccessKind,
  nightHref,
  resolveProgramImageUrl,
  toTimeInput,
  fromTimeInput,
  WEEKLY_ACCESS_TYPE_LABEL,
  WEEKLY_ACCESS_SECTION_LABEL,
  WEEKLY_ACCESS_CREATION_LABEL,
  EVENT_TYPE_LABEL,
  ACCESS_ACCENT,
  ACCESS_ACCENT_DEEP,
  ACCESS_BUTTON_VARIANT,
  PROGRAM_LINK_LABEL,
  PROGRAM_LINK_DESCRIPTION,
  NIGHTS_HELPER_EDIT,
  NIGHTS_HELPER_VIEW,
  EDIT_PROGRAM_LABEL,
  DEFAULT_NIGHT_PREVIEW_COUNT,
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
        sold_out: false,
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
        sold_out: false,
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
    promotion_commission_type: null,
    promotion_commission_value: null,
    lowstock_alerts_enabled: false,
    lowstock_threshold_type: null,
    lowstock_threshold_value: null,
    lowstock_notify_business_team: false,
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
    {
      tier_key: "cover",
      price_usd: null,
      quantity: null,
      is_disabled: false,
      sold_out: false,
      sort_order: 0,
      name: null,
      description: null,
      ticket_type: null,
      max_per_person: null,
      valid_from_time: null,
      valid_until_time: null,
      valid_from_day_offset: null,
      valid_until_day_offset: null,
    },
    {
      tier_key: "skip",
      price_usd: null,
      quantity: null,
      is_disabled: false,
      sold_out: false,
      sort_order: 1,
      name: null,
      description: null,
      ticket_type: null,
      max_per_person: null,
      valid_from_time: null,
      valid_until_time: null,
      valid_from_day_offset: null,
      valid_until_day_offset: null,
    },
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

test("inheritIfMatchesTimes treats editing hours as the override", () => {
  assert.equal(inheritIfMatchesTimes("22:00:00", "02:00:00", "22:00:00", "02:00:00"), true)
  assert.equal(
    inheritIfMatchesTimes("22:00", "02:00", "22:00:00", "02:00:00"),
    true,
    "HH:MM matches HH:MM:SS"
  )
  assert.equal(inheritIfMatchesTimes("21:00:00", "02:00:00", "22:00:00", "02:00:00"), false)
  assert.equal(inheritIfMatchesTimes("", "02:00:00", "22:00:00", "02:00:00"), false)
  assert.equal(inheritIfMatchesTimes("nonsense", "02:00:00", "22:00:00", "02:00:00"), false)

  const draft = draftFromNight(night(), program())
  const next = applyNightHours(draft, "21:00:00", "01:00:00", program().start_time, program().end_time)
  assert.equal(next.inherit_times, false)
  assert.equal(buildNightOverridePayload(next).start_time, "21:00:00")
  assert.equal(buildNightHoursPayload(next).end_time, "01:00:00")

  const matched = applyNightHours(next, "22:00:00", "02:00:00", program().start_time, program().end_time)
  assert.equal(matched.inherit_times, true)
  assert.equal(buildNightOverridePayload(matched).start_time, null)

  const reset = resetNightHours(next, program().start_time, program().end_time)
  assert.equal(reset.inherit_times, true)
  assert.equal(reset.start_time, "22:00:00")
  assert.equal(buildNightOverridePayload(reset).start_time, null)
})

test("inheritIfMatchesTemplate treats editing as the override", () => {
  assert.equal(inheritIfMatchesTemplate(10, 10), true)
  assert.equal(inheritIfMatchesTemplate(15, 10), false)
  assert.equal(inheritIfMatchesTemplate(0, 0), true, "capacity 0 is unlimited and can still inherit")
  assert.equal(inheritIfMatchesTemplate(null, 10), false)
  assert.equal(inheritIfMatchesTemplate(Number.NaN, Number.NaN), false)
  assert.equal(inheritIfMatchesTemplate(5, undefined), false)

  const draft = draftFromNight(night(), program())
  const template = night().tiers[0].template_price_usd
  draft.tiers[0].price_usd = 15
  draft.tiers[0].inherit_price = inheritIfMatchesTemplate(15, template)
  assert.equal(buildNightOverridePayload(draft).tiers?.[0].price_usd, 15)

  draft.tiers[0].price_usd = template
  draft.tiers[0].inherit_price = inheritIfMatchesTemplate(template, template)
  assert.equal(
    buildNightOverridePayload(draft).tiers?.[0].price_usd,
    null,
    "matching the program default must un-pin"
  )
})

test("night ticket editor drafts until Save night and stays on the override", () => {
  const pagePath = fileURLToPath(
    new URL("../../app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx", import.meta.url)
  )
  const editorPath = fileURLToPath(
    new URL("../../components/business/v2/door-access/NightTicketsEditor.tsx", import.meta.url)
  )
  const src = readFileSync(pagePath, "utf8")
  const editor = readFileSync(editorPath, "utf8")

  assert.ok(src.includes("NightTicketsEditor"), "night page hosts the ticket editor")
  assert.ok(src.includes("buildNightSavePayload"), "Save night commits hours and ticket price/qty on the restamp path")
  assert.ok(src.includes("saveNightOverride"), "Save night still PUTs /business/door-access/:id/nights/:date")
  assert.ok(src.includes("nightSaveFeedback"), "Save night must surface restamp as not-live")
  assert.ok(!src.includes("buildNightHoursPayload"), "do not drop ticket price from Save night")
  assert.ok(!src.includes("nightHasEventTickets"), "do not route stamped nights onto event ticket PUTs")
  assert.ok(!/href=\{?[`'"]\/business\/events/.test(src), "do not link off the night to event edit")
  assert.ok(src.includes("nightIsEditable"), "customized nights stay read-only here")
  assert.ok(!src.includes("function NightNumberField"), "price/capacity no longer use the simplified field")
  assert.ok(!src.includes("function TiersCard"), "replace Tiers this night with Manage Tickets cards")

  assert.ok(!editor.includes("<ManageSalesTickets"), "do not mount the event ticket writer on this page")
  assert.ok(!editor.includes("saveNightOverride"), "ticket rows must not persist; Save night does")
  assert.ok(!/apiClient\.put|apiClient\.patch/.test(editor), "do not PUT event tickets from the night editor")
  assert.ok(editor.includes("NIGHT_TICKET_APPLY_LABEL"), "inline edit must not say Save changes")
  assert.ok(editor.includes("NIGHT_TICKET_DRAFT_HINT"), "inline edit must say it drafts until Save night")
  assert.ok(editor.includes("updateDoorAccessProgram"), "stock alerts persist on the program, not the event")
  assert.ok(editor.includes("RecurringTierEditor"), "night Edit uses the create-series ticket fields")
  assert.ok(!editor.includes("TicketEditForm"), "do not use the reduced event ticket form on a night")
  assert.ok(editor.includes("allowAdd={false}"), "add tiers on Edit program, not on one night")
  assert.ok(editor.includes("soldOut: true"), "sold out drafts into NightDraft like Manage Tickets")
  assert.ok(editor.includes("allowReorder={editable}"), "drag-to-reorder drafts until Save night")
  assert.ok(editor.includes("toggleNightTierSoldOut"), "sold out must not be a silent no-op")
  assert.ok(editor.includes("reorderNightTiers"), "drop writes sort_order into the night draft")
  assert.ok(!editor.includes("allowReorder={false}"), "do not hide the drag handle on night tickets")
  assert.ok(!editor.includes("/tickets/reorder"), "do not PUT event ticket reorder from this page")

  const leavePath = fileURLToPath(
    new URL("../../components/business/v2/door-access/NightLeaveGuard.tsx", import.meta.url)
  )
  const leave = readFileSync(leavePath, "utf8")
  assert.ok(src.includes("NightLeaveGuard"), "dirty night must prompt before leaving")
  assert.ok(src.includes("nightDraftIsDirty"), "Save night clears dirty by adopting the server night")
  assert.ok(src.includes("NIGHT_UNSAVED_TITLE"), "dirty nights show Unsaved changes under Save night")
  assert.ok(
    /Save night[\s\S]*dirty &&[\s\S]*NIGHT_UNSAVED_TITLE/.test(src),
    "Unsaved changes sits under Save night and uses the draft dirty flag"
  )
  assert.ok(leave.includes("beforeunload"), "browser close/refresh must prompt")
  assert.ok(leave.includes("ConfirmDialog"), "back link and sidebar use an in-app confirm")
  assert.ok(leave.includes("NIGHT_UNSAVED_TITLE"))
  assert.ok(!NIGHT_UNSAVED_BODY.includes("\u2014") && !NIGHT_UNSAVED_TITLE.includes("\u2014"))
  assert.ok(!leave.includes("\u2014"), "leave prompt still has an em dash")
  assert.equal(NIGHT_UNSAVED_TITLE, "Unsaved changes")
  assert.equal(NIGHT_UNSAVED_LEAVE, "Leave")

  assert.equal(NIGHT_TICKET_APPLY_LABEL, "Apply to night")
  assert.equal(
    NIGHT_TICKET_DRAFT_HINT,
    "Drafts until you Save night. Buyers will not see this price until then."
  )
  assert.ok(!NIGHT_TICKET_DRAFT_HINT.includes("Save changes"))
  assert.ok(src.includes("Save night"), "one guest-facing save")
  assert.ok(!editor.includes("Save changes"), "ticket row must not look like a second guest save")

  assert.ok(!src.includes("function InheritToggle"), "hours dropped Use default / Override")
  assert.ok(!src.includes("Use default"))
  assert.ok(!src.includes(">Override<") && !src.includes("Override</"))
  assert.ok(src.includes("Reset to program default"), "hours reset matches the price Reset pattern")
  assert.ok(src.includes('type="time"'), "hour inputs stay visible")
  assert.ok(src.includes("applyNightHours"), "typing a time is the override")
  assert.ok(src.includes("Closed this night"))
  assert.ok(src.includes("@radix-ui/react-switch"), "closed is a real switch, not a grey button")
  assert.ok(src.includes('aria-label="Closed this night"'))
  assert.ok(!src.includes("On sale"), "do not bring back On sale ticket toggles on the night page")
  assert.ok(!src.includes("\u2014"), "night editor still has an em dash")
  assert.ok(!editor.includes("\u2014"), "ticket editor still has an em dash")
  assert.ok(!/Weekly Access|weekly access|WEEKLY ACCESS/.test(editor.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")))
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
  assert.equal(
    draftHasOverrides({
      ...clean,
      tiers: [{ ...clean.tiers[0], sold_out: true }, clean.tiers[1]],
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

test("Save night keeps ticket price on the override for stamped and unstamped nights", () => {
  assert.equal(nightHasEventTickets(night()), true)
  assert.equal(nightHasEventTickets(night({ is_stamped: false, event_id: null })), false)
  assert.equal(nightHasEventTickets(night({ is_stamped: true, event_id: null })), false)

  const priced = applyOverrideTicketForm(draftFromNight(night(), program()), "cover", 7.5, 0, 10, 0)
  const payload = buildNightOverridePayload(priced)
  assert.equal(payload.tiers?.[0].price_usd, 7.5)
  assert.equal(payload.is_closed, false)

  const hours = buildNightHoursPayload(
    draftFromNight(
      night({ start_time: "21:00:00", end_time: "01:00:00" }),
      program({ start_time: "22:00:00", end_time: "02:00:00" })
    )
  )
  assert.equal(hours.start_time, "21:00:00")
  assert.equal(hours.end_time, "01:00:00")
  assert.equal(hours.tiers, undefined, "hours-only helper still omits tiers")
})

test("restamp_error and times_only_has_sales mean Saved is not live", () => {
  assert.equal(TIMES_ONLY_HAS_SALES, "times_only_has_sales")
  assert.equal(nightGuestPricesNotLive({ restamp: null, restamp_error: null }), false)
  assert.deepEqual(nightSaveFeedback({ restamp: null, restamp_error: null }), {
    live: true,
    message: NIGHT_SAVE_LIVE,
  })

  assert.equal(restampSignalsTimesOnlyHasSales({ status: TIMES_ONLY_HAS_SALES }), true)
  assert.equal(restampSignalsTimesOnlyHasSales(TIMES_ONLY_HAS_SALES), true)
  assert.equal(nightGuestPricesNotLive({ restamp: { status: TIMES_ONLY_HAS_SALES }, restamp_error: null }), true)

  const fromCode = nightSaveFeedback({ restamp: { status: TIMES_ONLY_HAS_SALES }, restamp_error: null })
  assert.equal(fromCode.live, false)
  assert.equal(fromCode.message, NIGHT_SAVE_NOT_LIVE)
  assert.ok(fromCode.message.includes("Saved is not live"))
  assert.ok(fromCode.message.includes("may still be the old one"))

  const fromError = nightSaveFeedback({ restamp: null, restamp_error: "times_only_has_sales" })
  assert.equal(fromError.live, false)
  assert.ok(fromError.message.startsWith(NIGHT_SAVE_NOT_LIVE))
  assert.ok(fromError.message.includes("times_only_has_sales"))

  const page = readFileSync(
    fileURLToPath(
      new URL("../../app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx", import.meta.url)
    ),
    "utf8"
  )
  assert.ok(page.includes("nightSaveFeedback"), "page must use the not-live helper")
  assert.ok(page.includes("restampWarning && !notice"), "do not show Saved beside a restamp miss")
  assert.ok(page.includes("!restampWarning"), "success banner stays off when prices are not live")
})

test("dirty is true after a price edit and Save night clears it", () => {
  const baseline = draftFromNight(night(), program())
  const edited = applyOverrideTicketForm(baseline, "cover", 15, 0, 10, 0)
  assert.equal(nightDraftIsDirty(edited, baseline), true)

  const hours = applyNightHours(baseline, "21:00:00", "01:00:00", "22:00:00", "02:00:00")
  assert.equal(nightDraftIsDirty(hours, baseline), true)
  assert.equal(nightDraftIsDirty({ ...baseline, is_closed: true }, baseline), true)
  assert.equal(nightDraftIsDirty(toggleNightTierDisabled(baseline, "cover"), baseline), true)
  assert.equal(nightDraftIsDirty(toggleNightTierSoldOut(baseline, "cover"), baseline), true)
  assert.equal(nightDraftIsDirty(reorderNightTiers(baseline, ["skip", "cover"]), baseline), true)
  const renamed = applyRecurringNightTier(baseline, "cover", {
    name: "Door",
    description: null,
    ticket_type: "paid",
    price_usd: 10,
    quantity: 0,
    max_per_person: 2,
    valid_from_time: null,
    valid_until_time: null,
    valid_from_day_offset: 0,
    valid_until_day_offset: 0,
  }, { name: "Cover", price_usd: 10, quantity: 0, max_per_person: 2, ticket_type: "paid" })
  assert.equal(nightDraftIsDirty(renamed, baseline), true)

  // Save night adopts the server night and that snapshot becomes the baseline.
  const savedNight = night({
    has_override: true,
    tiers: [
      { ...night().tiers[0], price_usd: 15, is_overridden: true, template_price_usd: 10 },
      night().tiers[1],
    ],
  })
  const saved = draftFromNight(savedNight, program())
  assert.equal(nightDraftIsDirty(saved, saved), false)
  assert.equal(nightDraftIsDirty(edited, saved), false)
})

test("sold out and drag order go on the override payload", () => {
  const sold = toggleNightTierSoldOut(draftFromNight(night(), program()), "cover")
  const reordered = reorderNightTiers(sold, ["skip", "cover"])
  const payload = buildNightOverridePayload(reordered)

  assert.deepEqual(
    payload.tiers?.map((t) => t.tier_key),
    ["skip", "cover"]
  )
  assert.equal(payload.tiers?.[0].sort_order, 0)
  assert.equal(payload.tiers?.[0].sold_out, false)
  assert.equal(payload.tiers?.[1].tier_key, "cover")
  assert.equal(payload.tiers?.[1].sold_out, true)
  assert.equal(payload.tiers?.[1].sort_order, 1)
  assert.ok("sold_out" in (payload.tiers?.[0] ?? {}))
  assert.ok("sort_order" in (payload.tiers?.[0] ?? {}))

  const editor = readFileSync(
    fileURLToPath(
      new URL("../../components/business/v2/door-access/NightTicketsEditor.tsx", import.meta.url)
    ),
    "utf8"
  )
  assert.ok(editor.includes("Mark sold out") || editor.includes("soldOut: true"))
  assert.ok(editor.includes("allowReorder={editable}"))
  assert.ok(editor.includes("aria-label=\"Drag to reorder\"") === false, "handle lives on TicketRow")
  const row = readFileSync(
    fileURLToPath(
      new URL("../../components/business/v2/events/ManageSalesTickets.tsx", import.meta.url)
    ),
    "utf8"
  )
  assert.ok(row.includes('aria-label="Drag to reorder"'))
})

test("night Edit persists create-series ticket fields on Save night", () => {
  const baseline = draftFromNight(night(), program())
  const parsed = parseRecurringNightTier({
    name: "Early Cover",
    description: "In before 10",
    ticket_type: "paid",
    priceInput: "12",
    quantityInput: "40",
    maxPerPersonInput: "3",
    valid_from_time: "",
    valid_until_time: "22:00",
    valid_from_day_offset: 0,
    valid_until_day_offset: 0,
  })
  assert.equal(parsed.error, null)
  const next = applyRecurringNightTier(baseline, "cover", parsed.values, {
    name: "Cover",
    description: null,
    ticket_type: "paid",
    price_usd: 10,
    quantity: 0,
    max_per_person: 2,
    valid_from_time: null,
    valid_until_time: null,
    valid_from_day_offset: 0,
    valid_until_day_offset: 0,
  })
  assert.equal(nightDraftIsDirty(next, baseline), true)
  const payload = buildNightOverridePayload(next)
  assert.equal(payload.tiers?.[0].name, "Early Cover")
  assert.equal(payload.tiers?.[0].description, "In before 10")
  assert.equal(payload.tiers?.[0].ticket_type, null, "unchanged type still inherits")
  assert.equal(payload.tiers?.[0].price_usd, 12)
  assert.equal(payload.tiers?.[0].quantity, 40)
  assert.equal(payload.tiers?.[0].max_per_person, 3)
  assert.equal(payload.tiers?.[0].valid_until_time, "22:00:00")
  assert.equal(payload.tiers?.[0].valid_until_day_offset, 0)
  assert.equal(payload.tiers?.[0].sort_order, 0)

  const free = applyRecurringNightTier(baseline, "cover", {
    ...parsed.values,
    ticket_type: "free",
    price_usd: 0,
  }, {
    name: "Cover",
    ticket_type: "paid",
    price_usd: 10,
    quantity: 0,
    max_per_person: 2,
  })
  assert.equal(buildNightOverridePayload(free).tiers?.[0].ticket_type, "free")

  assert.equal(NIGHT_TICKET_DESCRIPTION_MAX, 64)
  assert.equal(
    parseRecurringNightTier({
      name: "",
      description: "",
      ticket_type: "paid",
      priceInput: "10",
      quantityInput: "0",
      maxPerPersonInput: "0",
      valid_from_time: "",
      valid_until_time: "",
      valid_from_day_offset: 0,
      valid_until_day_offset: 0,
    }).error,
    "Every access tier needs a name."
  )

  const recurring = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/recurring/RecurringTierEditor.tsx", import.meta.url)),
    "utf8"
  )
  assert.ok(recurring.includes("Quantity per night"))
  assert.ok(recurring.includes("TICKET_DESCRIPTION_MAX"))
  assert.ok(recurring.includes("ScanWindowToggle"))
  assert.ok(recurring.includes("Max per person"))
  assert.ok(recurring.includes("Add ticket tier"))
  assert.ok(!recurring.includes("\u2014"))
})

test("override ticket form pins price and quantity independently", () => {
  const base = draftFromNight(night(), program())
  const next = applyOverrideTicketForm(base, "cover", 15, 0, 10, 0)
  assert.equal(next.tiers[0].inherit_price, false)
  assert.equal(next.tiers[0].price_usd, 15)
  assert.equal(next.tiers[0].inherit_quantity, true)
  assert.equal(next.tiers[0].quantity, 0)

  const payload = buildNightOverridePayload(next)
  assert.equal(payload.tiers?.[0].price_usd, 15)
  assert.equal(payload.tiers?.[0].quantity, null)

  const hidden = toggleNightTierDisabled(base, "cover")
  assert.equal(hidden.tiers[0].is_disabled, true)
  assert.equal(buildNightOverridePayload(hidden).tiers?.[0].is_disabled, true)
})

test("parseOverrideTicketNumbers matches the night draft rules", () => {
  assert.deepEqual(parseOverrideTicketNumbers("10", "0"), { price_usd: 10, quantity: 0, error: null })
  assert.equal(parseOverrideTicketNumbers("-1", "0").error, "Prices cannot be negative.")
  assert.equal(
    parseOverrideTicketNumbers("10", "2.5").error,
    "Capacity must be a whole number (0 = unlimited)."
  )
})

test("nightTierTicketType reads the program template, then the price", () => {
  assert.equal(nightTierTicketType(night().tiers[0], program()), "paid")
  assert.equal(
    nightTierTicketType({ tier_key: "unknown", price_usd: 0 }, program()),
    "free"
  )
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
  assert.equal(p.photo_url, null)
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

test("normalizeProgram loads the template fields the wizard edits", () => {
  const p = normalizeProgram({
    name: "Weekly Cover",
    days_of_week: [1, 3, 5],
    start_time: "21:00:00",
    end_time: "02:00:00",
    is_21_plus: 1,
    flyer_image_url: "https://cdn.example/flyer.jpg",
    promotion_enabled: 1,
    promotion_commission_type: "percent",
    promotion_commission_value: "1000",
    lowstock_alerts_enabled: 1,
    lowstock_threshold_type: "count",
    lowstock_threshold_value: "20",
    lowstock_notify_business_team: 0,
    template_tickets: [
      {
        tier_key: "cover",
        name: "Cover",
        price_usd: "5",
        valid_from_time: "21:00:00",
        valid_until_time: "02:00:00",
        valid_from_day_offset: 0,
        valid_until_day_offset: 1,
      },
    ],
  })
  assert.equal(p.name, "Weekly Cover")
  assert.deepEqual(p.days_of_week, [1, 3, 5])
  assert.equal(p.start_time, "21:00:00")
  assert.equal(p.flyer_image_url, "https://cdn.example/flyer.jpg")
  assert.equal(p.promotion_commission_type, "percent")
  assert.equal(p.promotion_commission_value, 1000)
  assert.equal(p.lowstock_alerts_enabled, true)
  assert.equal(p.lowstock_threshold_type, "count")
  assert.equal(p.template_tickets[0].price_usd, 5)
  assert.equal(p.template_tickets[0].tier_key, "cover")
  assert.equal(p.template_tickets[0].valid_until_day_offset, 1)
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
  assert.equal(t.sold_out, false)
})

test("normalizeNightTier reads sold_out or force_sold_out", () => {
  assert.equal(normalizeNightTier({ tier_key: "cover", sold_out: 1 }).sold_out, true)
  assert.equal(normalizeNightTier({ tier_key: "cover", force_sold_out: true }).sold_out, true)
  assert.equal(normalizeNightTier({ tier_key: "cover" }).sold_out, false)
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
  assert.equal(fmtWindow("22:00:00", "02:00:00"), "10:00 PM - 2:00 AM")
  assert.equal(fmtWindow("22:00:00", ""), "10:00 PM")
  assert.equal(fmtWindow("", ""), "")
})

test("usdPrice says Free rather than $0.00, and fmtQuantity says Unlimited for 0", () => {
  assert.equal(usdPrice(10), "$10.00")
  assert.equal(usdPrice(0), "Free")
  assert.equal(usdPrice(null), "-")
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
    "10:00 PM - 2:00 AM · Next: Fri, Aug 28 · 8 nights scheduled"
  )
  assert.equal(
    programScheduleLine(program({ next_night_date: null, upcoming_night_count: 1 })),
    "10:00 PM - 2:00 AM · 1 night scheduled"
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

test("nightPreviewChip only names on sale or not generated", () => {
  assert.deepEqual(nightPreviewChip(night()), { label: "On sale", variant: "info" })
  assert.deepEqual(nightPreviewChip(night({ is_stamped: false, event_id: null, status: null })), {
    label: "Not generated",
    variant: "neutral",
  })
  assert.equal(nightPreviewChip(night({ status: "draft" })), null)
  assert.equal(nightPreviewChip(night({ is_closed: true })), null)
  assert.equal(nightPreviewChip(night({ status: "cancelled" })), null)
  // Overridden / Customized stay off the card. Those belong on the night page.
  assert.deepEqual(nightPreviewChip(night({ has_override: true, is_customized: true })), {
    label: "On sale",
    variant: "info",
  })
})

test("nightPreviewPrice leads with From and never uses an em dash", () => {
  assert.equal(nightPreviewPrice(night()), "From $10.00")
  assert.equal(nightPreviewPrice(night({ tiers: [] })), "No tiers on sale")
  assert.equal(
    nightPreviewPrice(night({ tiers: [{ ...night().tiers[0], is_disabled: true }, { ...night().tiers[1], is_disabled: true }] })),
    "No tiers on sale"
  )
  assert.ok(!nightPreviewPrice(night()).includes("\u2014"))
})

test("visibleUpcomingNights defaults to the next 4, then expands", () => {
  const dates = ["2026-08-28", "2026-08-29", "2026-09-04", "2026-09-05", "2026-09-11", "2026-09-12"]
  const rows = dates.map((occurrence_date) => night({ occurrence_date }))
  assert.equal(DEFAULT_NIGHT_PREVIEW_COUNT, 4)
  assert.deepEqual(
    visibleUpcomingNights(rows, false).map((n) => n.occurrence_date),
    dates.slice(0, 4)
  )
  assert.deepEqual(
    visibleUpcomingNights(rows, true).map((n) => n.occurrence_date),
    dates
  )
})

test("nightDateBlock is calendar parts, never a tz-shifted day", () => {
  assert.deepEqual(nightDateBlock("2026-08-28"), { weekday: "Fri", month: "Aug", day: 28 })
  assert.equal(nightDateBlock("nonsense"), null)
})

test("normalizeProgramSummary keeps photo_url when the flyer is empty", () => {
  const p = normalizeProgramSummary({
    flyer_image_url: "",
    photo_url: "https://cdn.example/venue.jpg",
  })
  assert.equal(p.flyer_image_url, null)
  assert.equal(p.photo_url, "https://cdn.example/venue.jpg")
})

test("empty flyer still resolves to the venue photo", () => {
  const venues = [{ id: 12, photo_url: "https://cdn.example/venue.jpg" }]
  assert.equal(
    resolveProgramImageUrl({ flyer_image_url: null, venue_id: 12 }, venues),
    "https://cdn.example/venue.jpg",
  )
  assert.equal(
    resolveProgramImageUrl({ flyer_image_url: "", venue_id: 12 }, venues),
    "https://cdn.example/venue.jpg",
  )
  assert.equal(
    resolveProgramImageUrl({ flyer_image_url: "   ", photo_url: "https://cdn.example/program.jpg" }),
    "https://cdn.example/program.jpg",
  )
})

test("a coalesced or uploaded flyer wins over the venue photo", () => {
  assert.equal(
    resolveProgramImageUrl(
      {
        flyer_image_url: "https://cdn.example/flyer.jpg",
        photo_url: "https://cdn.example/program.jpg",
        venue_id: 12,
      },
      [{ id: 12, photo_url: "https://cdn.example/venue.jpg" }],
    ),
    "https://cdn.example/flyer.jpg",
  )
})

test("no image at all stays empty so the date-block / icon tile can stand in", () => {
  assert.equal(
    resolveProgramImageUrl({ flyer_image_url: null, venue_id: 12 }, [{ id: 12, photo_url: null }]),
    null,
  )
  assert.equal(
    resolveProgramImageUrl(
      { flyer_image_url: null, venue_id: 99 },
      [{ id: 12, photo_url: "https://cdn.example/venue.jpg" }],
    ),
    null,
  )
})

test("create wizard previews the venue photo and still posts a null flyer", () => {
  const wizardPath = fileURLToPath(
    new URL("../../components/business/v2/door-access/DoorAccessWizard.tsx", import.meta.url),
  )
  const src = readFileSync(wizardPath, "utf8")
  assert.ok(src.includes("flyer_image_url: flyerImageUrl || null"), "create still posts the uploaded flyer only")
  assert.ok(src.includes("fallbackSrc={currentVenue?.photo_url ?? null}"), "empty upload must preview the venue photo")
  assert.ok(src.includes("the venue photo stands in"), "create helper still promises the venue stand-in")
  assert.ok(!/photo optional/i.test(src), "do not rewrite the helper to photo optional")
  const caption = "Venue photo. Nights use this until you add a flyer."
  assert.ok(src.includes(caption))
  assert.ok(!caption.includes("\u2014") && !caption.includes("\u2013"))
})

test("list and program page use the flyer/venue image helper", () => {
  const rowPath = fileURLToPath(
    new URL("../../components/business/v2/door-access/AccessProgramRow.tsx", import.meta.url),
  )
  const pagePath = fileURLToPath(
    new URL("../../app/business/(dashboard)/door-access/[id]/page.tsx", import.meta.url),
  )
  const row = readFileSync(rowPath, "utf8")
  const page = readFileSync(pagePath, "utf8")
  assert.ok(row.includes("resolveProgramImageUrl"))
  assert.ok(page.includes("resolveProgramImageUrl"))
  assert.ok(!row.includes("src={program.flyer_image_url}"), "list must not bind flyer only")
  assert.ok(!page.includes("flyerUrl={program.flyer_image_url}"), "night cards must not bind flyer only")
})

test("program page host copy has no em dashes", () => {
  const copy = [PROGRAM_LINK_LABEL, PROGRAM_LINK_DESCRIPTION, NIGHTS_HELPER_EDIT, NIGHTS_HELPER_VIEW, EDIT_PROGRAM_LABEL, MISSING_PROGRAM_ID_TITLE, MISSING_PROGRAM_ID_DESCRIPTION]
  assert.equal(PROGRAM_LINK_LABEL, "Program link")
  assert.equal(PROGRAM_LINK_DESCRIPTION, "Every upcoming night")
  assert.equal(NIGHTS_HELPER_EDIT, "Tap a night to change price, capacity, or hours for that date only.")
  assert.equal(EDIT_PROGRAM_LABEL, "Edit program")
  for (const line of copy) {
    assert.ok(!line.includes("\u2014"), `"${line}" still has an em dash`)
    assert.ok(!line.includes("\u2013"), `"${line}" still has an en dash`)
  }
})

test("the program page is look-and-open, with Edit program as a dedicated route", () => {
  const pagePath = fileURLToPath(
    new URL("../../app/business/(dashboard)/door-access/[id]/page.tsx", import.meta.url)
  )
  const src = readFileSync(pagePath, "utf8")
  assert.ok(!src.includes("\u2014"), "program page still has an em dash")
  assert.ok(src.includes("EDIT_PROGRAM_LABEL") || src.includes("Edit program"), "owners need a clear Edit program control")
  assert.ok(src.includes("programEditHref("), "Edit program opens the dedicated edit route")
  assert.ok(!src.includes("DoorAccessWizard"), "no full series editor inline on the series page")
  assert.ok(!src.includes("toggleDay"), "night cards must not edit nights of week")
  assert.ok(src.includes("nightHref("), "cards must keep the existing per-night href")
  assert.ok(src.includes("NightPreviewCard"), "nights render as preview cards")
  assert.ok(src.includes("More nights"), "far-future nights stay behind More nights")
  assert.ok(src.includes("resolveProgramImageUrl"), "empty flyer still shows the venue photo")
})

test("Weekly Access has a dedicated program editor, same fields as create", () => {
  const editPath = fileURLToPath(
    new URL("../../app/business/(dashboard)/door-access/[id]/edit/page.tsx", import.meta.url)
  )
  const wizardPath = fileURLToPath(
    new URL("../../components/business/v2/door-access/DoorAccessWizard.tsx", import.meta.url)
  )
  const editSrc = readFileSync(editPath, "utf8")
  const wizardSrc = readFileSync(wizardPath, "utf8")
  assert.ok(editSrc.includes("DoorAccessWizard"), "edit route reuses the create wizard")
  assert.ok(editSrc.includes('mode="edit"'), "edit route runs the wizard in edit mode")
  assert.ok(editSrc.includes("owner") && editSrc.includes("manager"), "edit is owners/managers only")
  assert.ok(!editSrc.includes("\u2014"), "edit page still has an em dash")
  assert.ok(wizardSrc.includes('mode === "edit"') || wizardSrc.includes("isEdit"), "wizard has an edit mode")
  assert.ok(editSrc.includes("loadDoorAccessSeriesForPath"), "edit recovers a night id or retries the series")
  assert.ok(wizardSrc.includes("updateDoorAccessProgram"), "edit saves via PUT /business/door-access/:id")
  assert.ok(wizardSrc.includes("Save program"), "edit CTA is Save program")
  assert.ok(wizardSrc.includes("Edit program"), "edit heading matches the series-page control")
  assert.ok(wizardSrc.includes("fallbackSrc={currentVenue?.photo_url ?? null}"), "edit still previews the venue photo")
})

test("redemptionModeLabel names both modes in host vocabulary", () => {
  assert.equal(redemptionModeLabel("camera_tap"), "Camera + tap")
  assert.equal(redemptionModeLabel("native_scan"), "Scan universal access")
})

test("D-P5: host surfaces never render the student string", () => {
  assert.equal(WEEKLY_ACCESS_SECTION_LABEL, "Weekly Cover")
  assert.equal(WEEKLY_ACCESS_TYPE_LABEL, "WEEKLY COVER")
  assert.equal(EVENT_TYPE_LABEL, "EVENT")
  assert.equal(WEEKLY_ACCESS_CREATION_LABEL, WEEKLY_ACCESS_SECTION_LABEL)
  // Renamed from Weekly Access. "Door Access" is the API path and
  // program_kind only. User-facing copy is Weekly Cover.
  for (const label of [WEEKLY_ACCESS_TYPE_LABEL, EVENT_TYPE_LABEL, WEEKLY_ACCESS_CREATION_LABEL, WEEKLY_ACCESS_SECTION_LABEL]) {
    assert.ok(!/door access/i.test(label), `${label} leaks the student vocabulary`)
  }
})

test("product copy no longer says Weekly Access (renamed to Weekly Cover)", () => {
  const files = [
    "../../components/business/v2/host/HostListCard.tsx",
    "../../components/business/v2/door-access/AccessProgramRow.tsx",
    "../../components/business/v2/door-access/AccessEventGroupRow.tsx",
    "../../app/venue/[venueId]/VenuePageClient.tsx",
    "../../app/venue/[venueId]/page.tsx",
    "../../app/business/(dashboard)/page.tsx",
    "../../app/business/(dashboard)/events/page.tsx",
    "../../app/business/(dashboard)/create/page.tsx",
    "../../app/business/(dashboard)/door-access/page.tsx",
    "../../app/business/(dashboard)/door-access/new/page.tsx",
    "../../app/business/(dashboard)/door-access/[id]/page.tsx",
    "../../app/business/(dashboard)/door-access/[id]/edit/page.tsx",
    "../../app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx",
    "../../components/business/v2/door-access/NightTicketsEditor.tsx",
    "../../components/business/v2/door-access/NightLeaveGuard.tsx",
    "../../components/business/v2/events/ManageSalesTickets.tsx",
    "../../app/business/(dashboard)/help/content.ts",
    "../../app/business/(dashboard)/analytics/page.tsx",
    "./analytics-copy.ts",
    "./events-list.ts",
    "./weekly-cover-label.ts",
  ]
  for (const rel of files) {
    const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
    assert.ok(
      !/Weekly Access|weekly access|WEEKLY ACCESS/.test(code),
      `${rel} still has Weekly Access in product copy`,
    )
  }
  const card = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/host/HostListCard.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(card.includes("WEEKLY_ACCESS_TYPE_LABEL"), "list chip must use the shared type label")
})

test("readAccessKind aliases weekly_cover to door_access", () => {
  assert.equal(readAccessKind("door_access"), "door_access")
  assert.equal(readAccessKind("weekly_cover"), "door_access")
  assert.equal(readAccessKind("event"), "event")
  assert.equal(readAccessKind("draft"), null)
})

test("create writes stay program_kind=door_access and Save night PUTs publish/restamp", () => {
  assert.equal(PROGRAM_KIND_DOOR_ACCESS, "door_access")
  assert.deepEqual(withDoorAccessProgramKind({ name: "Cover $5" }), {
    name: "Cover $5",
    program_kind: "door_access",
  })
  const payload = buildNightSavePayload(draftFromNight(night(), program()))
  assert.equal(payload.publish, true)
  assert.equal(payload.is_closed, false)
  assert.ok(payload.tiers?.length)

  const wizard = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/door-access/DoorAccessWizard.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(wizard.includes("withDoorAccessProgramKind"), "create/edit must send program_kind=door_access")
  assert.ok(wizard.includes("updateDoorAccessProgram"), "publish create restamps via PUT")
  assert.ok(!wizard.includes("program_kind: \"event\""))

  const nightPage = readFileSync(
    fileURLToPath(
      new URL("../../app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx", import.meta.url),
    ),
    "utf8",
  )
  assert.ok(nightPage.includes("buildNightSavePayload"))
  assert.ok(nightPage.includes("saveNightOverride"))
  assert.ok(nightPage.includes("loadDoorAccessNightForPath"))
})

test("programIdFromOwnedEvent uses recurring_series_id, never event_id", () => {
  assert.equal(
    programIdFromOwnedEvent({ access_kind: "door_access", recurring_series_id: 9 }),
    9,
  )
  assert.equal(
    programIdFromOwnedEvent({ access_kind: "weekly_cover", recurring_series_id: "9" }),
    9,
  )
  assert.equal(
    programIdFromOwnedEvent({ access_kind: "event", recurring_series_id: 9 }),
    null,
  )
  assert.equal(
    programIdFromOwnedEvent({ access_kind: "door_access", recurring_series_id: null }),
    null,
  )
})

test("Events list keeps GET /business/door-access and routes dated nights to the program", () => {
  const eventsPage = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/events/page.tsx", import.meta.url)),
    "utf8",
  )
  const eventCard = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/events/EventCard.tsx", import.meta.url)),
    "utf8",
  )
  const programPage = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/door-access/[id]/page.tsx", import.meta.url)),
    "utf8",
  )
  const home = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(eventsPage.includes("fetchDoorAccessProgramsSafe"), "list still GETs /business/door-access")
  assert.ok(!eventsPage.includes("/weekly-cover"), "do not rename the API path")
  assert.ok(eventsPage.includes("eventAccessGroupsForPrograms"), "empty programs list still shows stamped nights")
  assert.ok(eventsPage.includes("AccessProgramRow"), "working programs list still uses AccessProgramRow")
  const accessRow = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/door-access/AccessProgramRow.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(accessRow.includes("programHref(program.id)"), "AccessProgramRow hrefs the listed program id only")
  assert.ok(eventsPage.includes("programs={programs}"), "EventCard/SeriesGroupRow rematch against the listed programs")
  assert.ok(eventCard.includes("eventListHref"), "EventCard must not hardcode /business/events/:event_id for cover nights")
  assert.ok(eventCard.includes("eventListHref(event, programs)"), "EventCard hrefs WC nights via eventListHref")
  assert.ok(programPage.includes("loadDoorAccessSeriesForPath"), "program page recovers a night id or retries the series")
  assert.ok(!programPage.includes("resolveDoorAccessProgramIdFromEvent"), "do not GET events/:id for a listed series id")
  assert.ok(programPage.includes("parseProgramPathId"), "missing/NaN id is not a 404")
  assert.ok(programPage.includes("MISSING_PROGRAM_ID_TITLE"))
  assert.ok(!programPage.includes("fetchDoorAccessProgramsSafe"), "program page must not swallow 404s as []")
  assert.ok(home.includes("programHref(soonestNight.program.id)"))
  assert.ok(home.includes("programHref(p.id)"))
})

test("parseProgramPathId treats empty, undefined, NaN, and <=0 as missing", () => {
  assert.equal(parseProgramPathId("23"), 23)
  assert.equal(parseProgramPathId(" 23 "), 23)
  assert.equal(parseProgramPathId(""), null)
  assert.equal(parseProgramPathId("undefined"), null)
  assert.equal(parseProgramPathId("null"), null)
  assert.equal(parseProgramPathId("NaN"), null)
  assert.equal(parseProgramPathId("0"), null)
  assert.equal(parseProgramPathId("-1"), null)
  assert.equal(parseProgramPathId("abc"), null)
  assert.equal(parseProgramPathId(undefined), null)
  assert.equal(MISSING_PROGRAM_ID_TITLE, "Missing program id")
  assert.equal(MISSING_PROGRAM_ID_DESCRIPTION, "This URL has no program id.")
  assert.ok(!MISSING_PROGRAM_ID_TITLE.includes("not found"))
  assert.ok(!MISSING_PROGRAM_ID_DESCRIPTION.includes("Could not load"))
})

test("D-F11.1: a program links to its SERIES, and a night hangs off that", () => {
  assert.equal(programHref(23), "/business/door-access/23")
  assert.equal(programHref(77), "/business/door-access/77")
  assert.equal(programEditHref(77), "/business/door-access/77/edit")
  assert.equal(nightHref(77, "2026-08-28"), "/business/door-access/77/nights/2026-08-28")
  // The program href must never point at a single night.
  assert.ok(!/nights/.test(programHref(77)))
  assert.ok(!/nights/.test(programEditHref(77)))
})

test("toTimeInput trims a wall-clock string for the time input", () => {
  assert.equal(toTimeInput("21:00:00"), "21:00")
  assert.equal(toTimeInput("9:05"), "09:05")
  assert.equal(toTimeInput(""), "")
  assert.equal(toTimeInput(null), "")
})

test("fromTimeInput pads a time field back to HH:MM:SS", () => {
  assert.equal(fromTimeInput("21:00"), "21:00:00")
  assert.equal(fromTimeInput("9:05"), "09:05:00")
  assert.equal(fromTimeInput("21:00:00"), "21:00:00")
  assert.equal(fromTimeInput(""), "")
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
  assert.equal(sold.value, "-")
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

test("Weekly Cover create/edit CTAs use the shared pink accent, not Bizzy green", () => {
  assert.equal(ACCESS_ACCENT, "#FF3ED1")
  assert.equal(ACCESS_ACCENT_DEEP, "#D10EA3")
  assert.equal(ACCESS_BUTTON_VARIANT, "access")

  const theme = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8")
  assert.ok(theme.includes("--color-access: #FF3ED1"), "theme token must match ACCESS_ACCENT")
  assert.ok(theme.includes("--color-access-deep: #D10EA3"), "theme token must match ACCESS_ACCENT_DEEP")

  const button = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/ui/button.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(button.includes("access:"), "Button must expose the Weekly Cover variant")
  assert.ok(button.includes("from-access-deep to-access"), "access variant uses the shared tokens, not a one-off hex")
  assert.ok(button.includes("access-secondary"), "Save as draft / Reset stay in the pink family")
  assert.ok(button.includes("useWeeklyCoverAccent"), "primary remaps to access under Weekly Cover")
  assert.ok(button.includes('variant === "primary"') || button.includes('variant == null || variant === "primary"'))

  const layout = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/door-access/layout.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(layout.includes("WeeklyCoverAccent"), "every door-access route must wrap the pink provider")

  const weeklyFiles = [
    "../../components/business/v2/door-access/DoorAccessWizard.tsx",
    "../../app/business/(dashboard)/door-access/new/page.tsx",
    "../../app/business/(dashboard)/door-access/[id]/edit/page.tsx",
    "../../app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx",
    "../../app/business/(dashboard)/door-access/page.tsx",
    "../../app/business/(dashboard)/door-access/[id]/page.tsx",
  ]
  for (const rel of weeklyFiles) {
    const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
    assert.ok(
      src.includes("ACCESS_ACCENT") ||
        src.includes("ACCESS_BUTTON_VARIANT") ||
        src.includes("WEEKLY_COVER_CHECKBOX_CLASS") ||
        src.includes("text-access") ||
        src.includes("variant=\"access") ||
        src.includes("WeeklyCoverAccent") ||
        src.includes("DoorAccessWizard"),
      `${rel} must import the pink accent or live under the Weekly Cover wizard/layout`,
    )
    assert.ok(
      !src.includes("text-[#05EB54]") || rel.endsWith("door-access/page.tsx"),
      `${rel} still hard-codes Bizzy green on a Weekly Cover control`,
    )
  }

  const wizard = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/door-access/DoorAccessWizard.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(wizard.includes("ACCESS_ACCENT"), "create/edit wizard imports the pink accent")
  assert.ok(wizard.includes("WEEKLY_COVER_CHECKBOX_CLASS"), "wizard toggles use the shared pink class")
  assert.ok(wizard.includes('variant="access-secondary"'), "Save as draft is the pink secondary")
  assert.ok(!wizard.includes("#05EB54"), "wizard must not copy Bizzy green")

  const night = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(night.includes("focus-visible:ring-access"), "night switch focus ring is pink")
  assert.ok(!night.includes("ring-[#05EB54]"), "night switch must not use the green ring")

  const eventForm = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/events/EventForm.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(!eventForm.includes('variant="access"'), "event create/edit must stay green")
  assert.ok(!eventForm.includes("WeeklyCoverAccent"), "event form must not wrap the Weekly Cover accent")
  assert.ok(eventForm.includes("#05EB54") || eventForm.includes("<Button"), "event form still uses the green path")
})
