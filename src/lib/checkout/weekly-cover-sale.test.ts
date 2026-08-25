import test from "node:test"
import assert from "node:assert/strict"
import {
  isWeeklyCoverPublicPayload,
  publicEventIdsFromPayloads,
  weeklyCoverSaleOpenForPayloads,
} from "./weekly-cover-sale.ts"
import { weeklyCoverWebSaleOpen } from "../business/weekly-cover-visibility.ts"

test("weeklyCoverWebSaleOpen: ended WC is never buyable", () => {
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: false }), false)
  assert.equal(
    weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: null, listedOnPublicCatalog: false }),
    false,
    "guest catalog omission fails closed when the detail omits series_is_active",
  )
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: true }), true)
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: true, seriesActive: null }), true, "catalog unknown does not blank live WC")
  assert.equal(weeklyCoverWebSaleOpen({ isWeeklyCover: false, seriesActive: false }), true, "named events are not this rule")
})

test("weeklyCoverSaleOpenForPayloads reads nested series.is_active and catalog ids", () => {
  assert.equal(
    weeklyCoverSaleOpenForPayloads({
      checkoutPayload: {
        event: {
          event_id: 774,
          product_kind: "weekly_cover",
          series: { is_active: 0 },
        },
      },
    }),
    false,
  )
  assert.equal(
    weeklyCoverSaleOpenForPayloads({
      uiPayload: { event_id: 774, product_kind: "weekly_cover", series_is_active: 0 },
    }),
    false,
  )
  assert.equal(
    weeklyCoverSaleOpenForPayloads({
      checkoutPayload: { event: { event_id: 774, product_kind: "weekly_cover" } },
      publicListIds: new Set([1, 2]),
    }),
    false,
  )
  assert.equal(
    weeklyCoverSaleOpenForPayloads({
      checkoutPayload: { event: { event_id: 621, product_kind: "weekly_cover" } },
      publicListIds: new Set([621]),
    }),
    true,
  )
})

test("isWeeklyCoverPublicPayload reads nested series program_kind", () => {
  assert.equal(
    isWeeklyCoverPublicPayload({
      event_id: 774,
      access_kind: "event",
      series: { program_kind: "door_access", is_active: 0 },
    }),
    true,
  )
  assert.equal(
    weeklyCoverSaleOpenForPayloads({
      uiPayload: {
        event_id: 774,
        access_kind: "event",
        series: { program_kind: "door_access", is_active: 0 },
      },
    }),
    false,
    "unstamped leftover night of an ended WC series is not buyable",
  )
})

test("publicEventIdsFromPayloads reads venue and catalog event lists", () => {
  assert.deepEqual(
    [...publicEventIdsFromPayloads({ events: [{ event_id: 10 }] }, [{ event_id: 774 }])].sort((a, b) => a - b),
    [10, 774],
  )
})
