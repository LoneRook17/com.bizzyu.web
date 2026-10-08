import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildCheckoutTarget,
  buildQueryString,
  logPromoterClick,
  mintClickToken,
  refFromSearchParams,
  shouldLogClick,
} from "./forward-query.ts"

const BASE = "https://dev.bizzy-deals.com"

test("buildQueryString: ref and other params survive, repeats preserved", () => {
  const qs = buildQueryString({ ref: "KNIGHT-FLYER", x: "1", tag: ["a", "b"], gone: undefined })
  const parsed = new URLSearchParams(qs)
  assert.equal(parsed.get("ref"), "KNIGHT-FLYER")
  assert.equal(parsed.get("x"), "1")
  assert.deepEqual(parsed.getAll("tag"), ["a", "b"])
  assert.equal(parsed.has("gone"), false)
})

test("buildQueryString: empty / missing searchParams → empty string", () => {
  assert.equal(buildQueryString({}), "")
  assert.equal(buildQueryString(undefined), "")
  assert.equal(buildQueryString(null), "")
})

test("buildCheckoutTarget: full query forwarded to Laravel /checkout/:id", () => {
  assert.equal(
    buildCheckoutTarget(BASE, 123, { ref: "KNIGHT-FLYER", x: "1" }),
    `${BASE}/checkout/123?ref=KNIGHT-FLYER&x=1`,
  )
})

test("buildCheckoutTarget: no query → bare checkout URL (no trailing ?)", () => {
  assert.equal(buildCheckoutTarget(BASE, 123, {}), `${BASE}/checkout/123`)
})

test("buildCheckoutTarget: ref is URL-encoded, never dropped", () => {
  const target = buildCheckoutTarget(BASE, 5, { ref: "a b&c" })
  assert.equal(new URL(target).searchParams.get("ref"), "a b&c")
})

test("buildCheckoutTarget: clk token rides along with the forwarded query", () => {
  const target = buildCheckoutTarget(BASE, 7, { ref: "KNIGHT-FLYER", x: "1" }, "abcdef0123456789abcdef0123456789")
  const u = new URL(target)
  assert.equal(u.pathname, "/checkout/7")
  assert.equal(u.searchParams.get("ref"), "KNIGHT-FLYER")
  assert.equal(u.searchParams.get("x"), "1")
  assert.equal(u.searchParams.get("clk"), "abcdef0123456789abcdef0123456789")
  // No token → no clk param at all (direct / ref-less loads stay byte-identical).
  assert.equal(new URL(buildCheckoutTarget(BASE, 7, { x: "1" }, null)).searchParams.has("clk"), false)
})

test("mintClickToken: matches the services idempotency-token guard, unique per call", () => {
  const t = mintClickToken()
  assert.match(t, /^[A-Za-z0-9_-]{8,64}$/)
  assert.notEqual(mintClickToken(), t)
})

test("refFromSearchParams: first value of a repeated ref wins", () => {
  assert.equal(refFromSearchParams({ ref: ["FIRST", "SECOND"] }), "FIRST")
  assert.equal(refFromSearchParams({ ref: "ONLY" }), "ONLY")
  assert.equal(refFromSearchParams({}), undefined)
  assert.equal(refFromSearchParams(undefined), undefined)
})

test("shouldLogClick: real UA + valid code → log; bot UA / bad code / no ref → skip", () => {
  assert.equal(shouldLogClick("KNIGHT-FLYER", "Mozilla/5.0 (iPhone)"), true)
  assert.equal(shouldLogClick("KNIGHT-FLYER", null), true)
  assert.equal(shouldLogClick("KNIGHT-FLYER", "facebookexternalhit/1.1"), false)
  assert.equal(shouldLogClick("KNIGHT-FLYER", "Slackbot-LinkExpanding"), false)
  assert.equal(shouldLogClick("has space", "Mozilla/5.0"), false)
  assert.equal(shouldLogClick("", "Mozilla/5.0"), false)
  assert.equal(shouldLogClick(undefined, "Mozilla/5.0"), false)
})

test("logPromoterClick: POSTs once to /p/:code with the visitor UA", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response("{}", { status: 200 })
  }) as typeof fetch
  const logged = await logPromoterClick("KNIGHT-FLYER", "Mozilla/5.0 (iPhone)", "tok_0123456789abcdef", fakeFetch, "http://api")
  assert.equal(logged, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "http://api/p/KNIGHT-FLYER")
  assert.equal(calls[0].init?.method, "POST")
  assert.deepEqual(calls[0].init?.headers, { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" })
  // The SAME token the redirect forwards as ?clk= — that is the whole dedup.
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { idempotency_token: "tok_0123456789abcdef" })
})

test("logPromoterClick: no token → empty JSON body (NULL-token semantics on the API)", async () => {
  const calls: Array<{ init: RequestInit | undefined }> = []
  const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push({ init })
    return new Response("{}", { status: 200 })
  }) as typeof fetch
  await logPromoterClick("KNIGHT-FLYER", "Mozilla/5.0", null, fakeFetch, "http://api")
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {})
})

test("logPromoterClick: bot UA never hits the endpoint", async () => {
  let hits = 0
  const fakeFetch = (async () => {
    hits++
    return new Response("{}", { status: 200 })
  }) as typeof fetch
  const logged = await logPromoterClick("KNIGHT-FLYER", "Discordbot/2.0", "tok_0123456789abcdef", fakeFetch, "http://api")
  assert.equal(logged, false)
  assert.equal(hits, 0)
})

test("logPromoterClick: network failure is swallowed", async () => {
  const fakeFetch = (async () => {
    throw new Error("boom")
  }) as typeof fetch
  const logged = await logPromoterClick("KNIGHT-FLYER", "Mozilla/5.0", "tok_0123456789abcdef", fakeFetch, "http://api")
  assert.equal(logged, false)
})
