import { test } from "node:test"
import assert from "node:assert/strict"
import {
  HOST_CUSTOM_CHIP_LABEL,
  hostCustomChipTone,
  isHostCustomNight,
  isWeeklyCoverKind,
  seriesIdOf,
} from "./host-custom-night.ts"

test("fresh weekday templates are not Custom even when days differ", () => {
  const monday = isHostCustomNight({ product_kind: "weekly_cover" })
  const wednesday = isHostCustomNight({ product_kind: "weekly_cover" })
  const friday = isHostCustomNight({ product_kind: "weekly_cover" })
  assert.equal(monday, false)
  assert.equal(wednesday, false)
  assert.equal(friday, false)
})

test("wire flags from services #104 are Custom", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      is_customized: true,
    }),
    true,
  )
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      is_customized: 1,
    }),
    true,
  )
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      series_customized_at: "2026-08-20 10:00:00",
    }),
    true,
  )
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      has_override: true,
    }),
    true,
  )
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      flyer_image_url_override: "https://cdn/custom.jpg",
    }),
    true,
  )
})

test("host-created far date without an occurrence row is Custom, not ungenerated", () => {
  assert.equal(
    isHostCustomNight({
      product_kind: "weekly_cover",
      host_created_date: true,
    }),
    true,
  )
})

test("WC Custom stays Weekly Cover (pink tone), never a green Event", () => {
  assert.equal(isWeeklyCoverKind({ product_kind: "weekly_cover" }), true)
  assert.equal(
    hostCustomChipTone({
      product_kind: "weekly_cover",
      is_customized: true,
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
      is_customized: true,
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
