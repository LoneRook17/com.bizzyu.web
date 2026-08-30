import { test } from "node:test"
import assert from "node:assert/strict"
import type { PromoEventBreakdownRow } from "./types.ts"
import {
  groupPromoBreakdownRows,
  promoBreakdownKindLabel,
} from "./promo-breakdown-groups.ts"

function row(over: Partial<PromoEventBreakdownRow> & { event_id: number }): PromoEventBreakdownRow {
  return {
    event_name: `Event ${over.event_id}`,
    event_date: "2026-09-04T22:00:00.000Z",
    recurring_series_id: null,
    series_name: null,
    program_kind: null,
    redemptions: 0,
    revenue_generated: 0,
    ...over,
  }
}

test("nights of one program fold into ONE group with summed uses and revenue", () => {
  const groups = groupPromoBreakdownRows([
    row({ event_id: 1, recurring_series_id: 44, series_name: "Thirsty Thursdays", program_kind: "door_access", redemptions: 40, revenue_generated: 300 }),
    row({ event_id: 2, recurring_series_id: 44, series_name: "Thirsty Thursdays", program_kind: "door_access", redemptions: 22, revenue_generated: 150.5 }),
    row({ event_id: 3, recurring_series_id: 44, series_name: "Thirsty Thursdays", program_kind: "door_access", redemptions: 0, revenue_generated: 0 }),
  ])
  assert.equal(groups.length, 1)
  const g = groups[0]
  assert.equal(g.seriesId, 44)
  assert.equal(g.label, "Thirsty Thursdays")
  assert.equal(g.kind, "door_access")
  assert.equal(g.nights.length, 3)
  assert.equal(g.uses, 62)
  assert.equal(g.revenue, 450.5)
})

test("one-off rows stay standalone entries, never merged with each other", () => {
  const groups = groupPromoBreakdownRows([
    row({ event_id: 7, event_name: "Halloween Bash", redemptions: 5, revenue_generated: 40 }),
    row({ event_id: 8, event_name: "NYE Party", redemptions: 3, revenue_generated: 25 }),
  ])
  assert.equal(groups.length, 2)
  assert.deepEqual(
    groups.map((g) => [g.seriesId, g.label, g.uses, g.revenue, g.nights.length]),
    [
      [null, "Halloween Bash", 5, 40, 1],
      [null, "NYE Party", 3, 25, 1],
    ],
  )
})

test("order-preserving: a group sits where its FIRST row appeared", () => {
  const groups = groupPromoBreakdownRows([
    row({ event_id: 1, recurring_series_id: 44, series_name: "WC", program_kind: "door_access", redemptions: 40 }),
    row({ event_id: 7, event_name: "One-off", redemptions: 30 }),
    row({ event_id: 2, recurring_series_id: 9, series_name: "Green RC", program_kind: "event", redemptions: 20 }),
    row({ event_id: 3, recurring_series_id: 44, series_name: "WC", program_kind: "door_access", redemptions: 10 }),
    row({ event_id: 4, recurring_series_id: 9, series_name: "Green RC", program_kind: "event", redemptions: 5 }),
  ])
  assert.deepEqual(
    groups.map((g) => g.seriesId),
    [44, null, 9],
  )
  assert.equal(groups[0].uses, 50)
  assert.equal(groups[2].uses, 25)
})

test("no row is dropped: groups reconcile to the input totals", () => {
  const rows = [
    row({ event_id: 1, recurring_series_id: 44, series_name: "WC", program_kind: "door_access", redemptions: 4, revenue_generated: 31.25 }),
    row({ event_id: 2, recurring_series_id: 44, series_name: "WC", program_kind: "door_access", redemptions: 0, revenue_generated: 0 }),
    row({ event_id: 3, event_name: "Solo", redemptions: 2, revenue_generated: 18.75 }),
  ]
  const groups = groupPromoBreakdownRows(rows)
  const uses = groups.reduce((s, g) => s + g.uses, 0)
  const revenue = groups.reduce((s, g) => s + g.revenue, 0)
  const nightCount = groups.reduce((s, g) => s + g.nights.length, 0)
  assert.equal(uses, 6)
  assert.equal(revenue, 50)
  assert.equal(nightCount, rows.length)
})

test("SUM()-derived strings are coerced before math", () => {
  const groups = groupPromoBreakdownRows([
    row({ event_id: 1, recurring_series_id: 44, series_name: "WC", program_kind: "door_access", redemptions: "3" as unknown as number, revenue_generated: "25.00" as unknown as number }),
    row({ event_id: 2, recurring_series_id: 44, series_name: "WC", program_kind: "door_access", redemptions: "2" as unknown as number, revenue_generated: "10.50" as unknown as number }),
  ])
  assert.equal(groups[0].uses, 5)
  assert.equal(groups[0].revenue, 35.5)
})

test("missing series identity (older API payloads) degrades to one-off entries", () => {
  const legacy = {
    event_id: 12,
    event_name: "Legacy Night",
    event_date: null,
    redemptions: 1,
    revenue_generated: 9,
  } as PromoEventBreakdownRow
  const groups = groupPromoBreakdownRows([legacy])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].seriesId, null)
  assert.equal(groups[0].label, "Legacy Night")
})

test("nameless rows fall back to something renderable", () => {
  const groups = groupPromoBreakdownRows([
    row({ event_id: 5, event_name: null }),
    row({ event_id: 6, recurring_series_id: 3, series_name: null, program_kind: "event" }),
  ])
  assert.equal(groups[0].label, "#5")
  assert.equal(groups[1].label, "Series 3")
})

test("a later row can fill in a group's missing name and kind", () => {
  const groups = groupPromoBreakdownRows([
    row({ event_id: 1, recurring_series_id: 8, series_name: null, program_kind: null }),
    row({ event_id: 2, recurring_series_id: 8, series_name: "Late Name", program_kind: "event" }),
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].label, "Late Name")
  assert.equal(groups[0].kind, "event")
})

test("kind labels: door_access is Weekly Cover, series kinds are Recurring event, one-offs none", () => {
  assert.equal(promoBreakdownKindLabel("door_access"), "Weekly Cover")
  assert.equal(promoBreakdownKindLabel("weekly_cover"), "Weekly Cover")
  assert.equal(promoBreakdownKindLabel("event"), "Recurring event")
  assert.equal(promoBreakdownKindLabel(null), null)
})
