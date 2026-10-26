import { test } from "node:test"
import assert from "node:assert/strict"
import { LOGOUT_FAILED_MESSAGE, runLogout } from "./logout-flow.ts"

function harness(serverLogout: () => Promise<unknown>) {
  const calls = { clearBizSession: 0, clearState: 0, navigate: 0, notified: [] as string[], reported: [] as unknown[], slept: [] as number[] }
  const deps = {
    serverLogout,
    clearBizSession: () => void calls.clearBizSession++,
    clearState: () => void calls.clearState++,
    navigate: () => void calls.navigate++,
    notify: (m: string) => void calls.notified.push(m),
    report: (e: unknown) => void calls.reported.push(e),
    sleep: async (ms: number) => void calls.slept.push(ms),
    retryDelayMs: 7,
  }
  return { calls, deps }
}

test("success path: one call, cookies + state cleared, lands on login", async () => {
  let n = 0
  const { calls, deps } = harness(async () => void n++)
  const r = await runLogout(deps)
  assert.deepEqual(r, { outcome: "server_cleared", attempts: 1 })
  assert.equal(n, 1)
  assert.equal(calls.clearBizSession, 1)
  assert.equal(calls.clearState, 1)
  assert.equal(calls.navigate, 1)
  assert.deepEqual(calls.notified, [])
  assert.deepEqual(calls.slept, [])
})

test("first attempt fails, retry succeeds: no error shown, navigates", async () => {
  let n = 0
  const { calls, deps } = harness(async () => {
    n++
    if (n === 1) throw new Error("ECONNRESET")
  })
  const r = await runLogout(deps)
  assert.deepEqual(r, { outcome: "server_cleared", attempts: 2 })
  assert.deepEqual(calls.slept, [7])
  assert.equal(calls.clearBizSession, 1)
  assert.equal(calls.clearState, 1)
  assert.equal(calls.navigate, 1)
  assert.deepEqual(calls.notified, [])
})

test("both attempts fail: user is told, stays signed in, no navigation", async () => {
  let n = 0
  const boom = new Error("502 Bad Gateway")
  const { calls, deps } = harness(async () => {
    n++
    throw boom
  })
  const r = await runLogout(deps)
  assert.deepEqual(r, { outcome: "server_failed", attempts: 2 })
  assert.equal(n, 2)
  // Exactly one retry, then stop.
  assert.deepEqual(calls.slept, [7])
  // The multi-variant marker clear still runs …
  assert.equal(calls.clearBizSession, 1)
  // … but the UI must not pretend the (httpOnly, server-side) session is gone.
  assert.equal(calls.clearState, 0)
  assert.equal(calls.navigate, 0)
  assert.deepEqual(calls.notified, [LOGOUT_FAILED_MESSAGE])
  assert.deepEqual(calls.reported, [boom])
})

test("the failure copy says the user is still signed in", () => {
  assert.match(LOGOUT_FAILED_MESSAGE, /still signed in/i)
  assert.match(LOGOUT_FAILED_MESSAGE, /try again/i)
})
