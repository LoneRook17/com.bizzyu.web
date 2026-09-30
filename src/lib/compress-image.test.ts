import { test } from "node:test"
import assert from "node:assert/strict"
import {
  MAX_DATA_URL_CHARS,
  MAX_IMAGE_EDGE_PX,
  JPEG_QUALITY,
  IMAGE_STILL_TOO_LARGE,
  dataUrlWithinLimit,
  fittedSize,
} from "./compress-image.ts"

test("fittedSize caps the long edge at 1600 and keeps aspect ratio", () => {
  assert.deepEqual(fittedSize(4000, 2500), { width: 1600, height: 1000 })
  assert.deepEqual(fittedSize(1000, 2000), { width: 800, height: 1600 })
  assert.deepEqual(fittedSize(3000, 3000), { width: 1600, height: 1600 })
  assert.deepEqual(fittedSize(800, 600), { width: 800, height: 600 })
  assert.equal(MAX_IMAGE_EDGE_PX, 1600)
  assert.equal(JPEG_QUALITY, 0.8)
})

test("a data URL over the cap is rejected with the too-large message", () => {
  assert.equal(dataUrlWithinLimit("data:image/jpeg;base64,abc"), true)
  assert.equal(dataUrlWithinLimit(""), false)
  assert.equal(dataUrlWithinLimit("x".repeat(MAX_DATA_URL_CHARS + 1)), false)
  assert.match(IMAGE_STILL_TOO_LARGE, /too large/)
})
