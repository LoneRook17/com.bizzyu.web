import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  applyEventAsCreateTemplate,
  applyProgramAsCreateTemplate,
  createdProgramHref,
  createFromTemplateHref,
  createFromTemplateStaysWeeklyCover,
  eventCreateFromHref,
  programCreateFromHref,
  shouldRedirectEventTemplateToWeeklyCover,
  stripTicketIds,
} from "./create-from-template.ts"
import { programHref } from "./door-access.ts"
import type { DoorAccessProgram } from "./door-access.ts"
import type { EventDetail } from "./types.ts"

const namedEvent = {
  event_id: 12,
  access_kind: "event",
  recurring_series_id: null,
} as const

const weeklyNight = {
  event_id: 24,
  access_kind: "door_access",
  recurring_series_id: 9,
} as const

test("named events open events/new?from= so the form can apply the source", () => {
  assert.equal(eventCreateFromHref(12), "/business/events/new?from=12")
  assert.equal(createFromTemplateHref(namedEvent), "/business/events/new?from=12")
  assert.equal(createFromTemplateStaysWeeklyCover(namedEvent), false)
})

test("Weekly Cover create-from-template stays on the door-access series path", () => {
  assert.equal(programCreateFromHref(9), "/business/door-access/new?from=9")
  assert.equal(createFromTemplateHref(weeklyNight), "/business/door-access/new?from=9")
  assert.equal(createFromTemplateHref({ program_id: 9 }), "/business/door-access/new?from=9")
  assert.equal(createFromTemplateStaysWeeklyCover(weeklyNight), true)
  assert.equal(shouldRedirectEventTemplateToWeeklyCover(weeklyNight), true)
  assert.equal(shouldRedirectEventTemplateToWeeklyCover(namedEvent), false)
  assert.ok(!createFromTemplateHref(weeklyNight).includes("/business/recurring"))
  assert.ok(!createFromTemplateHref(weeklyNight).includes("/business/events/new"))
})

test("weekly_cover alias still routes to the Weekly Cover wizard", () => {
  assert.equal(
    createFromTemplateHref({ event_id: 26, access_kind: "weekly_cover", recurring_series_id: 9 }),
    "/business/door-access/new?from=9",
  )
})

test("create-from-template does not regress programHref after publish", () => {
  assert.equal(createdProgramHref(77), programHref(77))
  assert.equal(programHref(77), "/business/door-access/77")
})

test("applying an event template copies tickets and artwork and drops ids and dates", () => {
  const event = {
    name: "Rumble",
    description: "Fight night",
    venue_id: 3,
    venue_name: "The Dungeon",
    venue_address: "1 Main",
    type: "Ticketed",
    is_21_plus: true,
    flyer_image_url: "https://cdn.example/flyer.jpg",
    tickets: [{ ticket_id: 88, name: "GA", price_usd: 15, quantity: 100, ticket_type: "paid", sold_count: 4 }],
    promotion_enabled: 1,
    promotion_commission_type: "percent",
    promotion_commission_value: 1000,
    artwork_template: "night",
    artwork_accent: "magenta",
  } as unknown as EventDetail
  const applied = applyEventAsCreateTemplate(event)
  assert.equal(applied.name, "Rumble")
  assert.equal(applied.flyer_image_url, "https://cdn.example/flyer.jpg")
  assert.equal(applied.artwork_template, "night")
  assert.equal(applied.artwork_accent, "magenta")
  assert.equal(applied.start_date_time, "")
  assert.equal(applied.end_date_time, "")
  assert.deepEqual(applied.tickets, [
    { name: "GA", price_usd: 15, quantity: 100, ticket_type: "paid" },
  ])
  assert.ok(!("ticket_id" in (applied.tickets?.[0] ?? {})))
})

test("applying a Weekly Cover program resets the window and drops source tier keys", () => {
  const program = {
    id: 9,
    name: "Weekly Cover",
    date_range_start: "2026-01-01",
    date_range_end: "2026-06-01",
    template_tickets: [
      { tier_key: "cover", name: "Cover", price_usd: 5, quantity: 0, max_per_person: 0, ticket_type: "paid" },
    ],
  } as unknown as DoorAccessProgram
  const applied = applyProgramAsCreateTemplate(program, "2026-08-23")
  assert.equal(applied.name, "Weekly Cover")
  assert.equal(applied.date_range_start, "2026-08-23")
  assert.equal(applied.date_range_end, null)
  assert.equal(applied.template_tickets[0].name, "Cover")
  assert.equal(applied.template_tickets[0].tier_key, "")
})

test("stripTicketIds leaves a usable new-ticket payload", () => {
  assert.deepEqual(
    stripTicketIds([{ ticket_id: 1, name: "VIP", price_usd: 40, quantity: 10, ticket_type: "paid" }]),
    [{ name: "VIP", price_usd: 40, quantity: 10, ticket_type: "paid" }],
  )
})

test("create pages apply the source instead of opening a blank form", () => {
  const eventNew = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/events/new/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.match(eventNew, /applyEventAsCreateTemplate/)
  assert.match(eventNew, /shouldRedirectEventTemplateToWeeklyCover/)
  const programNew = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/door-access/new/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.match(programNew, /applyProgramAsCreateTemplate/)
  assert.match(programNew, /fetchDoorAccessSeries/)
  assert.match(programNew, /DoorAccessWizard/)
})

test("event detail Duplicate and WC program Use as template call createFromTemplateHref", () => {
  const eventPage = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/events/[id]/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.match(eventPage, /createFromTemplateHref/)
  assert.ok(!eventPage.includes("/business/events/${id}/duplicate"), "must not keep the empty API duplicate")
  const programPage = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/door-access/[id]/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.match(programPage, /createFromTemplateHref|programCreateFromHref/)
})
