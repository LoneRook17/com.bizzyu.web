import test from "node:test"
import assert from "node:assert/strict"
import {
  inactiveSeriesIdSet,
  isApprovedCanceledStatus,
  isSeriesActive,
  shouldListWeeklyCoverNightOnGuest,
  weeklyCoverNightHasSales,
  weeklyCoverNightNeedsPendingCancel,
  weeklyCoverNightVisibleOnDash,
  weeklyCoverProgramVisibleOnDash,
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

test("inactiveSeriesIdSet only collects explicit offs", () => {
  const ids = inactiveSeriesIdSet(
    [{ id: 66, is_active: 0 }, { id: 23, is_active: 1 }],
    [{ id: 9, is_active: false }],
  )
  assert.deepEqual([...ids].sort((a, b) => a - b), [9, 66])
})
