import { test } from "node:test"
import assert from "node:assert/strict"
import { getClientIp, turnstileFailOpenAllowed, verifyTurnstile } from "./verifyTurnstile.ts"

const quiet = { warn: () => {}, error: () => {} }
const withSecret = { TURNSTILE_SECRET_KEY: "0x-test-secret" }

function siteverify(body: unknown, status = 200) {
  return async () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

test("fail-open is only allowed in the test env or with the explicit flag", () => {
  assert.equal(turnstileFailOpenAllowed({}), false)
  assert.equal(turnstileFailOpenAllowed({ NODE_ENV: "production" }), false)
  assert.equal(turnstileFailOpenAllowed({ NODE_ENV: "development" }), false)
  assert.equal(turnstileFailOpenAllowed({ NODE_ENV: "test" }), true)
  assert.equal(turnstileFailOpenAllowed({ TURNSTILE_FAIL_OPEN: "1" }), true)
  assert.equal(turnstileFailOpenAllowed({ TURNSTILE_FAIL_OPEN: "true" }), false, "only the literal 1 opts in")
})

test("missing secret → NOT ok (misconfigured) outside test / fail-open; siteverify never called", async () => {
  let calls = 0
  const errors: unknown[][] = []
  const r = await verifyTurnstile("tok", "", "1.1.1.1", {
    env: { NODE_ENV: "production" },
    fetchImpl: async () => {
      calls++
      return new Response("{}")
    },
    log: { warn: () => {}, error: (...a: unknown[]) => errors.push(a) },
  })
  assert.deepEqual(r, { ok: false, reason: "misconfigured" })
  assert.equal(calls, 0)
  assert.equal(errors.length, 1, "the misconfiguration is logged as an error")
})

test("missing secret → ok only under NODE_ENV=test or TURNSTILE_FAIL_OPEN=1", async () => {
  assert.deepEqual(await verifyTurnstile("tok", "", null, { env: { NODE_ENV: "test" }, log: quiet }), { ok: true })
  assert.deepEqual(await verifyTurnstile("tok", "", null, { env: { TURNSTILE_FAIL_OPEN: "1" }, log: quiet }), {
    ok: true,
  })
  assert.deepEqual(await verifyTurnstile("tok", "", null, { env: { NODE_ENV: "development" }, log: quiet }), {
    ok: false,
    reason: "misconfigured",
  })
})

test("honeypot is rejected before anything else, even with no secret", async () => {
  const r = await verifyTurnstile("tok", "http://spam.example", null, { env: {}, log: quiet })
  assert.deepEqual(r, { ok: false, reason: "honeypot" })
})

test("missing token with a secret configured → missing_token (no network)", async () => {
  let calls = 0
  const r = await verifyTurnstile("", "", null, {
    env: withSecret,
    fetchImpl: async () => {
      calls++
      return new Response("{}")
    },
    log: quiet,
  })
  assert.deepEqual(r, { ok: false, reason: "missing_token" })
  assert.equal(calls, 0)
})

test("success path still ok, and posts secret + response + remoteip to siteverify", async () => {
  const seen: Array<{ url: string; body: string }> = []
  const r = await verifyTurnstile("tok-123", "", "203.0.113.9", {
    env: withSecret,
    fetchImpl: async (url, init) => {
      seen.push({ url, body: String(init?.body) })
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    },
    log: quiet,
  })
  assert.deepEqual(r, { ok: true })
  assert.equal(seen.length, 1, "siteverify was called exactly once")
  assert.equal(seen[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify")
  const params = new URLSearchParams(seen[0].body)
  assert.equal(params.get("secret"), "0x-test-secret")
  assert.equal(params.get("response"), "tok-123")
  assert.equal(params.get("remoteip"), "203.0.113.9")
})

test("siteverify success:false → invalid", async () => {
  const r = await verifyTurnstile("tok", "", null, {
    env: withSecret,
    fetchImpl: siteverify({ success: false, "error-codes": ["invalid-input-response"] }),
    log: quiet,
  })
  assert.deepEqual(r, { ok: false, reason: "invalid" })
})

test("aborted / thrown fetch → NOT ok (error), never fail open", async () => {
  const r = await verifyTurnstile("tok", "", null, {
    env: withSecret,
    fetchImpl: async () => {
      const e = new Error("The operation was aborted")
      e.name = "AbortError"
      throw e
    },
    log: quiet,
  })
  assert.deepEqual(r, { ok: false, reason: "error" })
})

test("timeout fires the abort signal and the result is NOT ok", async () => {
  const r = await verifyTurnstile("tok", "", null, {
    env: withSecret,
    timeoutMs: 10,
    fetchImpl: (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const e = new Error("aborted")
          e.name = "AbortError"
          reject(e)
        })
      }),
    log: quiet,
  })
  assert.deepEqual(r, { ok: false, reason: "error" })
})

test("non-2xx siteverify HTTP status → NOT ok (error)", async () => {
  const r = await verifyTurnstile("tok", "", null, {
    env: withSecret,
    fetchImpl: siteverify({ success: true }, 503),
    log: quiet,
  })
  assert.deepEqual(r, { ok: false, reason: "error" })
})

test("unparsable siteverify body → NOT ok (error)", async () => {
  const r = await verifyTurnstile("tok", "", null, {
    env: withSecret,
    fetchImpl: async () => new Response("<html>cf error</html>", { status: 200 }),
    log: quiet,
  })
  assert.deepEqual(r, { ok: false, reason: "error" })
})

test("a truthy-but-not-true success field does not pass", async () => {
  const r = await verifyTurnstile("tok", "", null, {
    env: withSecret,
    fetchImpl: siteverify({ success: "true" }),
    log: quiet,
  })
  assert.deepEqual(r, { ok: false, reason: "invalid" })
})

test("getClientIp prefers the first x-forwarded-for hop", () => {
  const req = new Request("https://x.test/", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } })
  assert.equal(getClientIp(req), "203.0.113.9")
  const real = new Request("https://x.test/", { headers: { "x-real-ip": "198.51.100.4" } })
  assert.equal(getClientIp(real), "198.51.100.4")
  assert.equal(getClientIp(new Request("https://x.test/")), null)
})
