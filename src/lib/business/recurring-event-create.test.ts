import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  GREEN_RECURRING_PRODUCT_KIND,
  greenRecurringCreatePayload,
} from "./recurring-event-create.ts"

const seed = {
  name: "Trivia Thursdays",
  description: "Weekly trivia",
  venue_id: 12,
  venue_name: "The Hall",
  venue_address: "1 Main",
  days_of_week: [4, 2],
  start_time: "21:00",
  end_time: "02:00",
  type: "Ticketed" as const,
  is_21_plus: true,
  flyer_image_url: "",
  template_tickets: [{ name: "GA", price_usd: 10 }],
  notify_followers_on_publish: false,
  promotion_enabled: false,
}

test("green RC create stamps product_kind=event and never door_access", () => {
  const payload = greenRecurringCreatePayload(seed, new Date("2026-08-27T12:00:00"))
  assert.equal(payload.product_kind, GREEN_RECURRING_PRODUCT_KIND)
  assert.equal(payload.product_kind, "event")
  assert.equal("program_kind" in payload, false)
  assert.equal("date_edits" in payload, false)
  assert.equal(payload.date_range_end, null)
  assert.deepEqual(payload.days_of_week, [2, 4])
})

test("fresh green RC create does not send Custom date_edits", () => {
  const payload = greenRecurringCreatePayload(seed)
  assert.equal("date_edits" in payload, false)
})

test("EventForm branches to the green recurring wizard instead of hardcoding one-off", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/business/v2/events/EventForm.tsx"),
    "utf8",
  )
  assert.ok(src.includes("RecurringEventWizard"), "repeating Event create must open the green wizard")
  assert.ok(src.includes("Repeats weekly") || src.includes("repeats weekly"), "green Event create has a repeating toggle")
  assert.ok(src.includes("!isEditing && form.is_recurring"), "Repeats weekly must not POST a one-off event")
  assert.ok(!src.includes("#05EB54") || src.includes("RecurringEventWizard"), "event path stays green")
})

test("SeriesForm save does not send date_edits or weekday_edits", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/business/v2/recurring/SeriesForm.tsx"),
    "utf8",
  )
  assert.equal(src.includes("date_edits"), false, "series PUT must not rewrite Custom nights via date_edits")
  assert.equal(src.includes("weekday_edits"), false, "green series save is not a Weekly Cover weekday_edits write")
  assert.ok(src.includes("/business/recurring-series"), "series save still uses recurring-series")
})

test("green wizard posts recurring-series, not door-access", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/business/v2/recurring/RecurringEventWizard.tsx"),
    "utf8",
  )
  assert.ok(src.includes("/business/recurring-series"), "green RC uses the event series endpoint")
  assert.ok(!src.includes('"/business/door-access"'), "green RC must not POST Weekly Cover")
  assert.ok(!src.includes("withDoorAccessProgramKind"), "green RC must not stamp program_kind=door_access")
  assert.ok(!src.includes("ACCESS_ACCENT"), "green RC must not use pink Weekly Cover chrome")
  assert.ok(!/Weekly Cover|Cover included|Skip the Line/.test(src), "green RC must not use Cover wording")
  assert.equal(src.includes("date_edits"), false, "fresh create must not send Custom date_edits")
  assert.ok(src.includes('label: "Hours"') && src.includes('label: "Tickets"'), "wizard is nights → hours → tickets")
})
