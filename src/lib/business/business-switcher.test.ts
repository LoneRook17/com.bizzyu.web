// Unit tests for the dashboard business switcher helpers.
//
// The contract under test:
//  (1) the switcher shows only for more than one business, and a /me payload
//      from a services build without `available_businesses` reads as none —
//      so a single-business user's sidebar is unchanged;
//  (2) a successful switch POSTs the target id, clears the stored venue (it
//      belongs to the business being left), then navigates to /business, in
//      that order;
//  (3) a refused switch fails closed: it rejects, and neither clears storage
//      nor navigates;
//  (4) the venue key is the one venue-context.tsx actually uses.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  POST_SWITCH_PATH,
  SELECTED_VENUE_STORAGE_KEY,
  SWITCH_BUSINESS_PATH,
  performBusinessSwitch,
  readAvailableBusinesses,
  showBusinessSwitcher,
} from "./business-switcher.ts"
import type { BusinessSummary } from "./types.ts"

const biz = (business_id: number, is_current = false): BusinessSummary => ({
  business_id,
  name: `Business ${business_id}`,
  logo_url: null,
  role: "manager",
  status: "approved",
  is_current,
})

test("no switcher for zero or one business", () => {
  assert.equal(showBusinessSwitcher([]), false)
  assert.equal(showBusinessSwitcher([biz(1, true)]), false)
})

test("switcher for two or more businesses", () => {
  assert.equal(showBusinessSwitcher([biz(1, true), biz(2)]), true)
})

test("a /me without available_businesses reads as none", () => {
  for (const value of [undefined, null, "x", 3, {}]) {
    assert.deepEqual(readAvailableBusinesses(value), [])
    assert.equal(showBusinessSwitcher(readAvailableBusinesses(value)), false)
  }
  const list = [biz(1, true), biz(2)]
  assert.deepEqual(readAvailableBusinesses(list), list)
})

test("a successful switch posts, clears the stored venue, then navigates", async () => {
  const calls: string[] = []
  await performBusinessSwitch(999935, {
    post: async (path, body) => {
      calls.push(`post ${path} ${JSON.stringify(body)}`)
    },
    storage: { removeItem: (key) => { calls.push(`remove ${key}`) } },
    navigate: (path) => { calls.push(`navigate ${path}`) },
  })
  assert.deepEqual(calls, [
    `post ${SWITCH_BUSINESS_PATH} {"business_id":999935}`,
    `remove ${SELECTED_VENUE_STORAGE_KEY}`,
    `navigate ${POST_SWITCH_PATH}`,
  ])
  assert.equal(POST_SWITCH_PATH, "/business")
})

test("a refused switch fails closed: no storage change, no navigation", async () => {
  const calls: string[] = []
  const refused = new Error("No active membership in that business")
  await assert.rejects(
    performBusinessSwitch(42, {
      post: async () => { throw refused },
      storage: { removeItem: (key) => { calls.push(`remove ${key}`) } },
      navigate: (path) => { calls.push(`navigate ${path}`) },
    }),
    refused,
  )
  assert.deepEqual(calls, [])
})

test("storage that throws does not block the navigation", async () => {
  const calls: string[] = []
  await performBusinessSwitch(7, {
    post: async () => {},
    storage: { removeItem: () => { throw new Error("blocked") } },
    navigate: (path) => { calls.push(path) },
  })
  assert.deepEqual(calls, ["/business"])
})

test("no storage at all still navigates", async () => {
  const calls: string[] = []
  await performBusinessSwitch(7, { post: async () => {}, storage: null, navigate: (p) => { calls.push(p) } })
  assert.deepEqual(calls, ["/business"])
})

test("the venue key matches venue-context.tsx", () => {
  const src = readFileSync(new URL("./venue-context.tsx", import.meta.url), "utf8")
  assert.ok(src.includes(`const VENUE_STORAGE_KEY = "${SELECTED_VENUE_STORAGE_KEY}"`))
})

test("auth-context never clears the session inside switchBusiness", () => {
  const src = readFileSync(new URL("./auth-context.tsx", import.meta.url), "utf8")
  const start = src.indexOf("const switchBusiness")
  assert.ok(start > 0)
  const body = src.slice(start, src.indexOf("return (", start))
  assert.ok(body.includes("performBusinessSwitch"))
  assert.ok(!body.includes("clearBizSession"))
})

test("the sidebar mounts the business switcher above the venue switcher, gated on more than one", () => {
  const src = readFileSync(new URL("../../components/business/v2/Sidebar.tsx", import.meta.url), "utf8")
  const brand = src.indexOf("{/* brand */}")
  const business = src.indexOf("{/* business switcher")
  const venue = src.indexOf("{/* venue switcher */}")
  assert.ok(brand > 0 && business > brand && venue > business)
  assert.ok(src.slice(business, venue).includes("showBusinessSwitcher(availableBusinesses) && ("))
})
