import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  inactiveSeriesIdSet,
  isApprovedCanceledStatus,
  isSeriesActive,
  readIsActiveFlag,
  readSeriesActiveFromPublicEvent,
  seriesActiveFromRecurringResponse,
  shouldKeepLookaheadWeeklyCoverNight,
  shouldListWeeklyCoverNightOnGuest,
  weeklyCoverNightHasSales,
  weeklyCoverNightNeedsPendingCancel,
  weeklyCoverNightVisibleOnDash,
  weeklyCoverProgramVisibleOnDash,
  weeklyCoverWebSaleOpen,
} from "./weekly-cover-visibility.ts"

const unsold = { status: "published", ticket_sales_count: 0 }
const sold = { status: "published", ticket_sales_count: 3 }
const canceled = { status: "cancelled", ticket_sales_count: 0 }
const canceledSold = { status: "cancelled", ticket_sales_count: 4 }
const pending = { status: "published", ticket_sales_count: 2, cancellation_status: "pending" as const }

test("isSeriesActive only treats an explicit 0/false as inactive", () => {
  assert.equal(isSeriesActive(true), true)
  assert.equal(isSeriesActive(1), true)
  assert.equal(isSeriesActive("1"), true)
  assert.equal(isSeriesActive(undefined), true, "omitted flag is unknown, not deleted")
  assert.equal(isSeriesActive(false), false)
  assert.equal(isSeriesActive(0), false)
  assert.equal(isSeriesActive("0"), false)
})

test("rule 1: series cancel, 0 sales — every night card gone", () => {
  assert.equal(weeklyCoverNightVisibleOnDash(unsold, false), false)
  assert.equal(weeklyCoverNightVisibleOnDash({ status: "published" }, false), false)
  assert.equal(weeklyCoverProgramVisibleOnDash({ is_active: 0 }), false)
  assert.equal(weeklyCoverProgramVisibleOnDash({ is_active: false }), false)
})

test("rule 2: series cancel, some sales — sold stays pending-cancel; unsold gone", () => {
  assert.equal(weeklyCoverNightVisibleOnDash(sold, false), true)
  assert.equal(weeklyCoverNightVisibleOnDash(unsold, false), false)
  assert.equal(weeklyCoverNightNeedsPendingCancel(sold, false), true)
  assert.equal(weeklyCoverNightNeedsPendingCancel(unsold, false), false)
  assert.equal(weeklyCoverNightNeedsPendingCancel(pending, true), true)
  assert.equal(weeklyCoverNightHasSales({ passes_sold: 1 }), true)
  assert.equal(weeklyCoverNightHasSales({ paid_orders: 2 }), true)
  assert.equal(weeklyCoverNightHasSales({ total_revenue: "12.00" }), true)
})

test("rule 3: single night cancel after approve — only that night leaves", () => {
  assert.equal(isApprovedCanceledStatus("cancelled"), true)
  assert.equal(isApprovedCanceledStatus("unpublished"), true)
  assert.equal(weeklyCoverNightVisibleOnDash(canceled, true), false)
  assert.equal(weeklyCoverNightVisibleOnDash(canceledSold, true), false)
  assert.equal(weeklyCoverNightVisibleOnDash(unsold, true), true)
  assert.equal(weeklyCoverNightVisibleOnDash(sold, true), true)
  assert.equal(weeklyCoverProgramVisibleOnDash({ is_active: 1 }), true)
  assert.equal(weeklyCoverNightNeedsPendingCancel(canceledSold, false), false)
})

test("guest lists hide unpublished and canceled WC nights", () => {
  assert.equal(shouldListWeeklyCoverNightOnGuest("published"), true)
  assert.equal(shouldListWeeklyCoverNightOnGuest("approved"), true)
  assert.equal(shouldListWeeklyCoverNightOnGuest(null), true, "omitted status stays")
  assert.equal(shouldListWeeklyCoverNightOnGuest("draft"), false)
  assert.equal(shouldListWeeklyCoverNightOnGuest("cancelled"), false)
  assert.equal(shouldListWeeklyCoverNightOnGuest("unpublished"), false)
  assert.equal(shouldListWeeklyCoverNightOnGuest("pending_approval"), false)
})

test("readSeriesActiveFromPublicEvent does not treat event is_active as series activity", () => {
  assert.equal(readIsActiveFlag(0), false)
  assert.equal(readIsActiveFlag(1), true)
  assert.equal(readIsActiveFlag(undefined), null)
  assert.equal(readSeriesActiveFromPublicEvent({ event_id: 774, is_active: 1, series_is_active: 0 }), false)
  assert.equal(readSeriesActiveFromPublicEvent({ event_id: 774, is_active: 0 }), null)
  assert.equal(readSeriesActiveFromPublicEvent({ event: { series: { is_active: 0 } } }), false)
  assert.equal(seriesActiveFromRecurringResponse({ series: { is_active: 0 } }), false)
  assert.equal(seriesActiveFromRecurringResponse({ is_active: 1 }), true)
  assert.equal(seriesActiveFromRecurringResponse({}), null)
})

test("weeklyCoverWebSaleOpen: ended WC never sells; catalog unknown does not blank live WC", () => {
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: false }), false)
  assert.equal(
    weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: null, listedOnPublicCatalog: false }),
    false,
  )
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: true }), true)
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: null }), true)
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: false, seriesActive: false }), true)
})

test("lookahead does not resurrect a leftover published night of an ended series", () => {
  assert.equal(shouldKeepLookaheadWeeklyCoverNight(false, true, "published"), false)
  assert.equal(shouldKeepLookaheadWeeklyCoverNight(null, false, "published"), false)
  assert.equal(shouldKeepLookaheadWeeklyCoverNight(true, false, "published"), true)
  assert.equal(shouldKeepLookaheadWeeklyCoverNight(null, true, "published"), true)
  assert.equal(
    shouldKeepLookaheadWeeklyCoverNight(null, false, "draft"),
    true,
    "draft escrow lookahead still fills in when series activity is unknown",
  )
})

test("manage hub fail-closes an ended unsold series instead of a live editor", () => {
  const hub = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/events/[id]/manage/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(hub.includes("seriesActiveFromRecurringResponse"))
  assert.ok(hub.includes("endedUnsold"))
  assert.ok(hub.includes("This series has ended"))
})

test("inactiveSeriesIdSet only collects explicit offs", () => {
  const ids = inactiveSeriesIdSet(
    [{ id: 66, is_active: 0 }, { id: 23, is_active: 1 }],
    [{ id: 9, is_active: false }],
  )
  assert.deepEqual([...ids].sort((a, b) => a - b), [9, 66])
})
