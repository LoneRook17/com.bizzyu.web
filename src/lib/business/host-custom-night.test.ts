import { test } from "node:test"
import assert from "node:assert/strict"
import {
  HOST_CUSTOM_CHIP_LABEL,
  hostCustomChipTone,
  isDetachedSeriesLeftover,
  isHostCustomNight,
  isNeverChipOverrideScope,
  isWeeklyCoverKind,
  seriesIdOf,
} from "./host-custom-night.ts"

test("fresh weekday templates are not Custom even when days differ", () => {
  assert.equal(isHostCustomNight({ product_kind: "weekly_cover" }), false)
  assert.equal(
    isHostCustomNight({ product_kind: "weekly_cover" }, { differsFromWeekdaySlot: false }),
    false,
  )
})

test("does not chip from is_customized or has_override alone", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      is_customized: true,
    }),
    false,
  )
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      is_customized: 1,
    }),
    false,
  )
})

test("series_customized_at is the one-date stamp", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      series_customized_at: "2026-08-20 10:00:00",
    }),
    true,
  )
})

test("own flyer override is a later one-date edit", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      flyer_image_url_override: "https://cdn/custom.jpg",
    }),
    true,
  )
})

test("SLOT diverge or off-pattern date is Custom only when the SLOT is established", () => {
  assert.equal(
    isHostCustomNight({ product_kind: "weekly_cover" }, { differsFromWeekdaySlot: true }),
    false,
    "empty SLOT hint without slotEstablished is the series-119 false voter",
  )
  assert.equal(
    isHostCustomNight({ product_kind: "weekly_cover" }, { offPatternDate: true }),
    false,
    "off-pattern without an established weekday pattern is not Custom",
  )
  assert.equal(
    isHostCustomNight(
      { product_kind: "weekly_cover" },
      { differsFromWeekdaySlot: true, slotEstablished: true },
    ),
    true,
  )
  assert.equal(
    isHostCustomNight(
      { product_kind: "weekly_cover" },
      { offPatternDate: true, slotEstablished: true },
    ),
    true,
  )
})

test("Saturday-only with no stamp is not Custom (series 119)", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      series_customized_at: null,
      is_customized: false,
    }),
    false,
  )
  assert.equal(
    isHostCustomNight(
      {
        product_kind: "weekly_cover",
        series_customized_at: null,
      },
      { slotEstablished: false, differsFromWeekdaySlot: true, offPatternDate: true },
    ),
    false,
  )
})

test("override_scope weekday/program/series never chips", () => {
  for (const scope of ["weekday", "program", "series"]) {
    assert.equal(isNeverChipOverrideScope(scope), true)
    assert.equal(
      isHostCustomNight({
        product_kind: "weekly_cover",
        override_scope: scope,
        series_customized_at: "2026-08-20 10:00:00",
        flyer_image_url_override: "https://cdn/x.jpg",
      }),
      false,
      scope,
    )
  }
})

test("WC Custom stays Weekly Cover (pink tone), never a green Event", () => {
  assert.equal(isWeeklyCoverKind({ product_kind: "weekly_cover" }), true)
  assert.equal(
    hostCustomChipTone({
      product_kind: "weekly_cover",
      series_customized_at: "2026-08-20 10:00:00",
    }),
    "wc",
  )
  assert.equal(HOST_CUSTOM_CHIP_LABEL, "Custom")
})

test("green RC Custom stays a green Custom occurrence while in a series", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "event",
      recurring_series_id: 7,
      series_customized_at: "2026-08-20 10:00:00",
    }),
    true,
  )
  assert.equal(
    hostCustomChipTone({
      product_kind: "event",
      recurring_series_id: 7,
      is_customized: true,
    }),
    "event",
  )
})

test("after green RC series-end a leftover night drops Custom", () => {
  assert.equal(
    isDetachedSeriesLeftover({
      product_kind: "event",
      recurring_series_id: null,
      series_customized_at: "2026-08-20 10:00:00",
      is_customized: true,
    }),
    true,
  )
  assert.equal(
    isHostCustomNight({
      product_kind: "event",
      recurring_series_id: null,
      series_customized_at: "2026-08-20 10:00:00",
      is_customized: true,
    }),
    false,
  )
  assert.equal(
    hostCustomChipTone({
      product_kind: "event",
      recurring_series_id: null,
      is_customized: true,
    }),
    null,
  )
})

test("omitted series id on a WC night does not drop Custom", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      series_customized_at: "2026-08-20 10:00:00",
    }),
    true,
  )
})

test("seriesIdOf rejects junk", () => {
  assert.equal(seriesIdOf(7), 7)
  assert.equal(seriesIdOf("7"), 7)
  assert.equal(seriesIdOf(null), null)
  assert.equal(seriesIdOf(0), null)
  assert.equal(seriesIdOf(""), null)
})
