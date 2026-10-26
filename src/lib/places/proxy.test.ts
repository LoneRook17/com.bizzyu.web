import { test } from "node:test"
import assert from "node:assert/strict"
import {
  AUTOCOMPLETE_MAX_INPUT,
  INVALID_PLACE_ID_ERROR,
  RATE_LIMITED_ERROR,
  createPlacesProxy,
  isValidPlaceId,
  normalizeAutocompleteInput,
} from "./proxy.ts"

const KEY = "AIza-TEST-KEY-NEVER-LOGGED-0123456789"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function makeProxy(overrides: Partial<Parameters<typeof createPlacesProxy>[0]> = {}) {
  const calls: string[] = []
  const warnings: unknown[][] = []
  const proxy = createPlacesProxy({
    getApiKey: () => KEY,
    fetchImpl: async (url) => {
      calls.push(url)
      if (url.includes("/autocomplete/")) {
        return jsonResponse({
          status: "OK",
          predictions: [{ description: "1 Main St, Fort Myers, FL", place_id: "ChIJtest_main_st_0001" }],
        })
      }
      return jsonResponse({ status: "OK", result: { geometry: { location: { lat: 26.64, lng: -81.87 } } } })
    },
    log: { warn: (...args: unknown[]) => warnings.push(args) },
    ...overrides,
  })
  return { proxy, calls, warnings }
}

test("normalizeAutocompleteInput collapses whitespace and trims", () => {
  assert.equal(normalizeAutocompleteInput("  1   Main \n St "), "1 Main St")
  assert.equal(normalizeAutocompleteInput(null), "")
})

test("isValidPlaceId accepts Google-shaped ids and rejects garbage", () => {
  assert.equal(isValidPlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4"), true)
  assert.equal(isValidPlaceId("GhIJQWDl0CIeQUARxks3icF8U8A"), true)
  assert.equal(isValidPlaceId("short"), false)
  assert.equal(isValidPlaceId("ChIJ<script>alert(1)</script>"), false)
  assert.equal(isValidPlaceId("x".repeat(401)), false)
  assert.equal(isValidPlaceId(null), false)
})

test("autocomplete: short input returns empty predictions without calling Google", async () => {
  const { proxy, calls } = makeProxy()
  const r = await proxy.autocomplete("ab", "1.1.1.1")
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { predictions: [] })
  assert.equal(calls.length, 0)
})

test("autocomplete: over-long input is a 400 and never reaches Google", async () => {
  const { proxy, calls } = makeProxy()
  const r = await proxy.autocomplete("a".repeat(AUTOCOMPLETE_MAX_INPUT + 1), "1.1.1.1")
  assert.equal(r.status, 400)
  assert.equal(calls.length, 0)
})

test("autocomplete: missing key still returns empty predictions (unchanged contract)", async () => {
  const { proxy, calls } = makeProxy({ getApiKey: () => undefined })
  const r = await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { predictions: [] })
  assert.equal(calls.length, 0)
})

test("autocomplete: happy path maps predictions and sends the key only to Google", async () => {
  const { proxy, calls } = makeProxy()
  const r = await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, {
    predictions: [{ description: "1 Main St, Fort Myers, FL", place_id: "ChIJtest_main_st_0001" }],
  })
  assert.equal(calls.length, 1)
  assert.ok(calls[0].startsWith("https://maps.googleapis.com/maps/api/place/autocomplete/json?"))
  assert.ok(calls[0].includes(`key=${encodeURIComponent(KEY)}`))
})

test("autocomplete: over the per-IP limit → 429, and the limit is per IP", async () => {
  const { proxy, calls } = makeProxy({
    limits: { autocomplete: { burstWindowMs: 60_000, burstMax: 2, dailyMax: 100 } },
  })
  assert.equal((await proxy.autocomplete("1 Main St", "9.9.9.9")).status, 200)
  assert.equal((await proxy.autocomplete("2 Main St", "9.9.9.9")).status, 200)
  const third = await proxy.autocomplete("3 Main St", "9.9.9.9")
  assert.equal(third.status, 429)
  assert.deepEqual(third.body, { error: RATE_LIMITED_ERROR })
  assert.equal(calls.length, 2, "the 429 never reached Google")
  // A different IP is unaffected.
  assert.equal((await proxy.autocomplete("1 Main St", "8.8.8.8")).status, 200)
})

test("autocomplete: the daily cap also yields 429", async () => {
  const { proxy } = makeProxy({
    limits: { autocomplete: { burstWindowMs: 1, burstMax: 100, dailyMax: 1 } },
  })
  assert.equal((await proxy.autocomplete("1 Main St", "7.7.7.7")).status, 200)
  assert.equal((await proxy.autocomplete("2 Main St", "7.7.7.7")).status, 429)
})

test("autocomplete: a cache hit does not call Google twice (case/whitespace-insensitive)", async () => {
  const { proxy, calls } = makeProxy()
  await proxy.autocomplete("1 Main St", "1.1.1.1")
  await proxy.autocomplete("  1  main st ", "1.1.1.1")
  await proxy.autocomplete("1 MAIN ST", "2.2.2.2")
  assert.equal(calls.length, 1)
  assert.equal(proxy.cacheSizes().autocomplete, 1)
})

test("autocomplete: the cache expires after its TTL", async () => {
  let t = 1_000_000
  const { proxy, calls } = makeProxy({ now: () => t, cacheTtlMs: 60_000 })
  await proxy.autocomplete("1 Main St", "1.1.1.1")
  t += 59_000
  await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.equal(calls.length, 1)
  t += 2_000
  await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.equal(calls.length, 2)
})

test("autocomplete: upstream failure → empty predictions, not cached, key never logged", async () => {
  let fail = true
  const { proxy, calls, warnings } = makeProxy({
    fetchImpl: async (url) => {
      calls.push(url)
      if (fail) return jsonResponse({ error_message: `bad key ${KEY}` }, 500)
      return jsonResponse({ status: "OK", predictions: [] })
    },
  })
  const r = await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { predictions: [] })
  assert.equal(proxy.cacheSizes().autocomplete, 0, "an outage is not cached")
  fail = false
  await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.equal(calls.length, 2, "retried once the outage cleared")
  const logged = JSON.stringify(warnings)
  assert.ok(logged.length > 0, "the failure was logged")
  assert.ok(!logged.includes(KEY), "the key never appears in a log line")
  assert.ok(!logged.includes("maps.googleapis.com"), "the full URL (which carries the key) is not logged")
})

test("autocomplete: a Google error status (REQUEST_DENIED) is logged by status only", async () => {
  const { proxy, warnings } = makeProxy({
    fetchImpl: async () => jsonResponse({ status: "REQUEST_DENIED", error_message: `denied for ${KEY}` }),
  })
  const r = await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.deepEqual(r.body, { predictions: [] })
  const logged = JSON.stringify(warnings)
  assert.ok(logged.includes("REQUEST_DENIED"))
  assert.ok(!logged.includes(KEY))
})

test("autocomplete: a thrown fetch is a quiet empty result", async () => {
  const { proxy, warnings } = makeProxy({
    fetchImpl: async () => {
      throw new Error(`ECONNRESET while calling ?key=${KEY}`)
    },
  })
  const r = await proxy.autocomplete("1 Main St", "1.1.1.1")
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { predictions: [] })
  assert.ok(!JSON.stringify(warnings).includes(KEY))
})

test("details: missing place_id keeps the null contract; bad shape is a 400", async () => {
  const { proxy, calls } = makeProxy()
  assert.deepEqual(await proxy.details(null, "1.1.1.1"), { status: 200, body: { lat: null, lng: null } })
  assert.deepEqual(await proxy.details("", "1.1.1.1"), { status: 200, body: { lat: null, lng: null } })
  const bad = await proxy.details("../../etc/passwd", "1.1.1.1")
  assert.equal(bad.status, 400)
  assert.deepEqual(bad.body, { error: INVALID_PLACE_ID_ERROR })
  assert.equal(calls.length, 0)
})

test("details: happy path, cache, and 429", async () => {
  const { proxy, calls } = makeProxy({
    limits: { details: { burstWindowMs: 60_000, burstMax: 2, dailyMax: 100 } },
  })
  const r = await proxy.details("ChIJtest_main_st_0001", "1.1.1.1")
  assert.deepEqual(r, { status: 200, body: { lat: 26.64, lng: -81.87 } })
  // Same id → cache (still counts against the limiter, but no Google call).
  await proxy.details("ChIJtest_main_st_0001", "1.1.1.1")
  assert.equal(calls.length, 1)
  const third = await proxy.details("ChIJtest_other_place_0002", "1.1.1.1")
  assert.equal(third.status, 429)
  assert.equal(calls.length, 1)
})

test("details: missing key returns nulls without calling Google", async () => {
  const { proxy, calls } = makeProxy({ getApiKey: () => undefined })
  assert.deepEqual(await proxy.details("ChIJtest_main_st_0001", "1.1.1.1"), {
    status: 200,
    body: { lat: null, lng: null },
  })
  assert.equal(calls.length, 0)
})

test("details: a non-numeric location is reported as nulls and not cached forever", async () => {
  const { proxy } = makeProxy({
    fetchImpl: async () => jsonResponse({ status: "OK", result: { geometry: { location: { lat: "x" } } } }),
  })
  assert.deepEqual(await proxy.details("ChIJtest_main_st_0001", "1.1.1.1"), {
    status: 200,
    body: { lat: null, lng: null },
  })
})
