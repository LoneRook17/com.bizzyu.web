// Analytics list preview cap (Luke QA). Upcoming events, Weekly Access, and
// Deals must be a ~4-row scroll box, not an unbounded ledger and not a
// 4w / 12w / 6m pager. Runs with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  ANALYTICS_LIST_FULL_CLASS,
  ANALYTICS_LIST_PREVIEW_CLASS,
  ANALYTICS_LIST_PREVIEW_ROW_COUNT,
  sortAnalyticsEvents,
} from "./analytics-list.ts"

const SRC = join(process.cwd(), "src")

function read(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8")
}

test("preview shows about 4 rows", () => {
  assert.equal(ANALYTICS_LIST_PREVIEW_ROW_COUNT, 4)
})

test("preview caps height and scrolls inside the box", () => {
  assert.ok(ANALYTICS_LIST_PREVIEW_CLASS.includes("overflow-y-auto"), "must allow vertical scroll")
  assert.match(ANALYTICS_LIST_PREVIEW_CLASS, /max-h-\[24rem\]/, "must cap visible height at about 4 rows")
})

test("Section can preview or go full-page", () => {
  const shared = read("components/business/v2/analytics/shared.tsx")
  assert.ok(shared.includes("ANALYTICS_LIST_PREVIEW_CLASS"), "compact lists still share the preview cap")
  assert.ok(shared.includes("ANALYTICS_LIST_FULL_CLASS"), "full-page lists drop the 24rem box")
  assert.ok(
    shared.includes("from \"@/lib/business/analytics-list\""),
    "Section must import the shared list classes, not a one-off max-height",
  )
})

test("upcoming analytics lists soonest first, furthest last", () => {
  const rows = sortAnalyticsEvents(
    [
      { start_date_time: "2026-09-26 22:00:00" },
      { start_date_time: "2026-09-19 22:00:00" },
      { start_date_time: "2026-09-24 22:00:00" },
    ],
    "upcoming",
  )
  assert.deepEqual(
    rows.map((r) => r.start_date_time),
    ["2026-09-19 22:00:00", "2026-09-24 22:00:00", "2026-09-26 22:00:00"],
  )
})

test("past analytics lists most recent first", () => {
  const rows = sortAnalyticsEvents(
    [
      { start_date_time: "2026-08-01 22:00:00" },
      { start_date_time: "2026-08-20 22:00:00" },
    ],
    "past",
  )
  assert.equal(rows[0].start_date_time, "2026-08-20 22:00:00")
})

const OVERVIEWS: Array<[string, string]> = [
  ["components/business/v2/analytics/EventsOverview.tsx", "Upcoming events"],
  ["components/business/v2/analytics/LineSkipsOverview.tsx", "ANALYTICS_ACCESS_ACTIVE_SECTION"],
  ["components/business/v2/analytics/DealsOverview.tsx", "Active deals"],
]

test("Events, Weekly Access, and Deals lists go through Section", () => {
  for (const [rel, heading] of OVERVIEWS) {
    const src = read(rel)
    assert.ok(src.includes("<Section"), `${rel} must render lists inside Section so the scroll-cap applies`)
    assert.ok(src.includes(heading), `${rel} is missing its open-by-default list heading`)
  }
})

test("Upcoming events badge stays the full upcoming count", () => {
  const src = read("components/business/v2/analytics/EventsOverview.tsx")
  assert.ok(src.includes('upcomingTitle: "Upcoming events"'), "default Events copy must keep the Upcoming events heading")
  assert.ok(
    src.includes("title={copy.upcomingTitle} count={upcoming.length}"),
    "badge must stay the total upcoming count, not a visible-row slice",
  )
  assert.ok(src.includes("sortAnalyticsEvents"), "lists must sort soonest / most-recent first")
})

test("Analytics overviews do not paginate with 4w / 12w / 6m", () => {
  for (const [rel] of OVERVIEWS) {
    const src = read(rel)
    assert.doesNotMatch(src, /4 weeks|12 weeks|6 months/, `${rel} must not add a lookahead pager`)
  }
})
