import { test } from "node:test"
import assert from "node:assert/strict"
import {
  eventEndInstant,
  eventHasEnded,
  eventSaleState,
  saleClosedCopy,
  wallClockToInstant,
} from "./event-sale-state.ts"

// SALVAJE 2074: Sat Oct 17 2026 22:00 → Sun Oct 18 02:00 America/New_York.
const salvaje = {
  status: "published",
  cancellation_status: "none",
  start_date_time: "2026-10-17 22:00:00",
  end_date_time: "2026-10-18 02:00:00",
  timezone: "America/New_York",
}
const et = (iso: string) => wallClockToInstant(iso, "America/New_York")!

test("wall clock in the event zone → the right instant (EDT in October, EST in January)", () => {
  assert.equal(wallClockToInstant("2026-10-18 02:00:00", "America/New_York")!.toISOString(), "2026-10-18T06:00:00.000Z")
  assert.equal(wallClockToInstant("2026-01-15 21:00:00", "America/New_York")!.toISOString(), "2026-01-16T02:00:00.000Z")
  assert.equal(wallClockToInstant("2026-10-21 09:00:00", "America/Los_Angeles")!.toISOString(), "2026-10-21T16:00:00.000Z")
  assert.equal(wallClockToInstant("2026-10-18T06:00:00Z", "America/New_York")!.toISOString(), "2026-10-18T06:00:00.000Z")
  assert.equal(wallClockToInstant("", "America/New_York"), null)
})

test("overnight end on the next day; exactly-at-end is ended; the Monday sale is ended", () => {
  assert.equal(eventHasEnded(salvaje, et("2026-10-18 01:00:00")), false)
  assert.equal(eventHasEnded(salvaje, et("2026-10-18 02:00:00")), true)
  assert.equal(eventHasEnded(salvaje, et("2026-10-19 18:55:00")), true)
})

test("end not after start is read as the next day; missing end falls back to start + 12h", () => {
  const sameDay = { ...salvaje, end_date_time: "2026-10-17 02:00:00" }
  assert.equal(eventHasEnded(sameDay, et("2026-10-17 23:30:00")), false)
  assert.equal(eventHasEnded(sameDay, et("2026-10-18 02:30:00")), true)
  const noEnd = { ...salvaje, end_date_time: null }
  assert.equal(eventEndInstant(noEnd)!.toISOString(), et("2026-10-18 10:00:00").toISOString())
  assert.equal(eventEndInstant({ ...salvaje, start_date_time: null, end_date_time: null }), null)
})

test("a Los Angeles event is judged in its own zone", () => {
  const la = { ...salvaje, timezone: "America/Los_Angeles", start_date_time: "2026-10-21 06:00:00", end_date_time: "2026-10-21 09:00:00" }
  assert.equal(eventHasEnded(la, et("2026-10-21 11:30:00")), false) // 08:30 PT
  assert.equal(eventHasEnded(la, et("2026-10-21 12:30:00")), true) // 09:30 PT
})

test("eventSaleState: the server verdict wins, else status, cancellation, then end", () => {
  assert.equal(eventSaleState(salvaje, et("2026-10-18 00:30:00")), null)
  assert.equal(eventSaleState(salvaje, et("2026-10-19 18:55:00"))?.code, "event_ended")
  assert.equal(eventSaleState({ ...salvaje, status: "draft" }, et("2026-10-18 00:30:00"))?.code, "event_not_published")
  assert.equal(eventSaleState({ ...salvaje, cancellation_status: "processing" }, et("2026-10-18 00:30:00"))?.code, "event_cancelled")
  // A missing status on an old payload is not a refusal.
  assert.equal(eventSaleState({ ...salvaje, status: null }, et("2026-10-18 00:30:00")), null)
  // Server fields from services GET /ui/events/:id.
  assert.equal(eventSaleState({ ...salvaje, has_ended: false, sale_refusal: null }, et("2026-10-19 18:55:00")), null)
  const srv = eventSaleState({ ...salvaje, sale_refusal: { code: "event_ended", message: "Gone." } }, et("2026-10-18 00:30:00"))
  assert.deepEqual(srv, { code: "event_ended", headline: "Event ended", message: "Gone." })
})

test("saleClosedCopy maps every code and falls back for unknown ones", () => {
  assert.equal(saleClosedCopy("event_ended").headline, "Event ended")
  assert.equal(saleClosedCopy("ticket_sales_closed").headline, "Sales closed")
  assert.equal(saleClosedCopy("ticket_sales_not_open").headline, "Not on sale yet")
  assert.equal(saleClosedCopy("something_else", "Server says no").message, "Server says no")
  assert.equal(saleClosedCopy(null).headline, "Not available")
})
