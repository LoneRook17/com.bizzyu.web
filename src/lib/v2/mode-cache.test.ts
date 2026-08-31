import { test } from "node:test"
import assert from "node:assert/strict"
import {
  DASHBOARD_MODE_STORAGE_KEY,
  parseDashboardMode,
  readCachedDashboardMode,
  resolveDashboardMode,
  writeCachedDashboardMode,
} from "./mode-cache.ts"

test("parseDashboardMode accepts only the three live modes", () => {
  assert.equal(parseDashboardMode("deals"), "deals")
  assert.equal(parseDashboardMode("events"), "events")
  assert.equal(parseDashboardMode("hybrid"), "hybrid")
  assert.equal(parseDashboardMode(null), null)
  assert.equal(parseDashboardMode("line-skips"), null)
})

test("cache round-trips a chosen mode", () => {
  const store = new Map<string, string>()
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  }
  writeCachedDashboardMode("events", storage)
  assert.equal(store.get(DASHBOARD_MODE_STORAGE_KEY), "events")
  assert.equal(readCachedDashboardMode(storage), "events")
})

test("resolveDashboardMode prefers /me, then the cache, so a stale me cannot loop", () => {
  assert.equal(resolveDashboardMode("hybrid", "deals"), "hybrid")
  assert.equal(resolveDashboardMode(null, "events"), "events")
  assert.equal(resolveDashboardMode(undefined, null), null)
})
