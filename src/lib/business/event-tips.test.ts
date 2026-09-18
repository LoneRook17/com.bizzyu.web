// Tipping Slice 3: event analytics shows Tips separate from Revenue.
//
// `revenue.tips` is absent on services deploys that predate Slice 3, so the
// reader must coerce missing / null / NaN to 0. All Tips UI (tile + info note,
// Tips by worker, the Door Performance Tips column) renders only when
// tipsVisible() / doorTipsVisible() say so: tipping is on for the business, or
// the event has tip history. The source pins keep every analytics view reading
// tips through the helpers, and keep tips out of the Revenue figure.
//
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  DOOR_TIPS_COLUMN_TITLE,
  DOOR_TIPS_HINT,
  REVENUE_CAPTION_WITH_TIPS,
  TIPS_BY_WORKER_TITLE,
  TIPS_INFO_NOTE,
  TIPS_TILE_TITLE,
  doorTipsVisible,
  eventTips,
  eventTipsAmount,
  eventTipsVisible,
  hasTips,
  scannerTips,
  takeHomeWithTips,
  tipCountLabel,
  tipStatusLabel,
  tipsByWorker,
  tipsVisible,
} from "./event-tips.ts"

const SRC = join(process.cwd(), "src")

const VIEWS = [
  "components/business/v2/events/EventAnalyticsView.tsx",
  "components/business/dashboard/EventAnalyticsView.tsx",
  "components/business/v2/analytics/EventsOverview.tsx",
]

// Every surface that renders an analytics view must hand it the per-scanner
// rows, so the Tips tile gets the same scanner OR as the app.
const VIEW_HOSTS = [
  "app/business/(dashboard)/events/[id]/manage/analytics/page.tsx",
  "app/business/_legacy/(dashboard)/events/[id]/manage/analytics/page.tsx",
  "components/business/v2/analytics/EventsOverview.tsx",
  "components/business/dashboard/EventsOverview.tsx",
]

test("reads tips in USD from the revenue object", () => {
  assert.equal(eventTips({ tips: 1.5 }), 1.5)
  assert.equal(eventTips({ tips: 42 }), 42)
})

test("missing tips (services not deployed yet) reads as 0", () => {
  assert.equal(eventTips({}), 0)
  assert.equal(eventTips(undefined), 0)
  assert.equal(eventTips(null), 0)
})

test("null, NaN, Infinity and junk tips read as 0", () => {
  assert.equal(eventTips({ tips: null }), 0)
  assert.equal(eventTips({ tips: NaN }), 0)
  assert.equal(eventTips({ tips: Infinity }), 0)
  assert.equal(eventTips({ tips: "abc" }), 0)
  assert.equal(eventTips({ tips: "" }), 0)
  assert.equal(eventTips({ tips: {} }), 0)
})

test("negative tips read as 0", () => {
  assert.equal(eventTips({ tips: -3 }), 0)
})

test("numeric string tips (mysql DECIMAL) are coerced", () => {
  assert.equal(eventTips({ tips: "12.50" }), 12.5)
})

test("hasTips is false at 0 and when the field is missing", () => {
  assert.equal(hasTips({}), false)
  assert.equal(hasTips(undefined), false)
  assert.equal(hasTips({ tips: 0 }), false)
  assert.equal(hasTips({ tips: NaN }), false)
})

test("hasTips is true when there are tips", () => {
  assert.equal(hasTips({ tips: 0.01 }), true)
  assert.equal(hasTips({ tips: 1.5 }), true)
})

test("take-home incl. tips comes only from the API, null when absent", () => {
  assert.equal(takeHomeWithTips({ take_home_with_tips: 101.5 }), 101.5)
  assert.equal(takeHomeWithTips({ tips: 1.5 }), null)
  assert.equal(takeHomeWithTips({ take_home_with_tips: null }), null)
  assert.equal(takeHomeWithTips({ take_home_with_tips: NaN }), null)
  assert.equal(takeHomeWithTips(undefined), null)
})

test("tips copy never calls tips revenue", () => {
  assert.equal(TIPS_TILE_TITLE, "Tips")
  assert.doesNotMatch(TIPS_TILE_TITLE, /revenue/i)
  assert.match(TIPS_INFO_NOTE, /not included in revenue/i)
})

test("info note covers revenue, transfer and worker payout, with no em dashes", () => {
  assert.match(TIPS_INFO_NOTE, /not included in revenue/i)
  assert.match(TIPS_INFO_NOTE, /transferred to your business/i)
  assert.match(TIPS_INFO_NOTE, /paying out workers from tips is your responsibility/i)
  assert.doesNotMatch(TIPS_INFO_NOTE, /[\u2013\u2014]/)
  assert.doesNotMatch(REVENUE_CAPTION_WITH_TIPS, /[\u2013\u2014]/)
})

test("Revenue caption with tips is door-only and does not claim to match the payout", () => {
  assert.doesNotMatch(REVENUE_CAPTION_WITH_TIPS, /matches stripe payout/i)
  assert.match(REVENUE_CAPTION_WITH_TIPS, /tips are shown separately/i)
})

for (const rel of VIEWS) {
  test(`${rel} renders Tips through the helpers, gated on eventTipsVisible, with the info note`, () => {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(src.includes("{eventTipsVisible(data, perScanner) && ("), "Tips tile must be gated on eventTipsVisible (flags OR scanner tips, same as the app)")
    assert.ok(!src.includes("{tipsVisible(data) && ("), "Tips tile must not gate on the flags alone")
    assert.ok(!/hasTips\(data\.revenue\) && \(\s*<(Card|div)/.test(src), "Tips tile must not be gated on hasTips (tip-on at $0 still shows)")
    assert.ok(/<TipsByWorker data=\{data\}/.test(src), "Tips tile must carry the Tips by worker breakdown")
    assert.ok(!/tips_visible|tipping_enabled|tips_by_worker/.test(src), "views must not read the raw visibility / breakdown fields")
    assert.ok(src.includes("{TIPS_INFO_NOTE}"), "Tips tile must show the shared info note")
    assert.ok(
      src.includes("hasTips(data.revenue) ? REVENUE_CAPTION_WITH_TIPS"),
      "Revenue caption must not claim to match the payout when there are tips",
    )
    assert.ok(src.includes("eventTipsAmount(data, perScanner)"), "Tips amount must come from eventTipsAmount")
    assert.ok(src.includes("TIPS_TILE_TITLE"), "Tips tile must use the shared title")
    assert.ok(!/revenue\??\.tips/.test(src), "views must not read revenue.tips directly")
  })

  test(`${rel} keeps Revenue on revenue.revenue and never adds tips into it`, () => {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(src.includes("data.revenue?.revenue ?? 0"), "Revenue tile must still read revenue.revenue")
    assert.ok(!/\+\s*eventTips\(|eventTips\([^)]*\)\s*\+/.test(src), "tips must never be summed on the web")
  })
}

// Door Performance: tips break down per scanner / staff, the same way door
// sales are attributed. `tips` is absent on older services deploys.

test("scannerTips reads a row's tips and coerces missing / junk to 0", () => {
  assert.equal(scannerTips({ tips: 1.5 }), 1.5)
  assert.equal(scannerTips({ tips: "1.50" }), 1.5)
  assert.equal(scannerTips({}), 0)
  assert.equal(scannerTips({ tips: null }), 0)
  assert.equal(scannerTips({ tips: NaN }), 0)
  assert.equal(scannerTips({ tips: -2 }), 0)
  assert.equal(scannerTips(null), 0)
  assert.equal(scannerTips(undefined), 0)
})

test("Door Performance tips copy", () => {
  assert.equal(DOOR_TIPS_COLUMN_TITLE, "Tips")
  assert.ok(DOOR_TIPS_HINT.includes("not included in sales"))
})

const DOOR_CARDS = [
  "components/business/v2/events/DoorPerformanceCard.tsx",
  "components/business/dashboard/DoorPerformanceCard.tsx",
]

for (const rel of DOOR_CARDS) {
  test(`${rel} has a sortable Tips column that never folds into sales / revenue`, () => {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(src.includes('clickHeader("tips")'), "Tips column must be sortable")
    assert.ok(src.includes("showTips = false"), "Tips column must be off unless the page says tips are visible")
    assert.ok(/\{showTips && <th /.test(src), "Tips header must be gated on showTips")
    assert.ok(/\{showTips && <td /.test(src), "Tips cell must be gated on showTips")
    assert.ok(/\{showTips && <p [^>]*>\{DOOR_TIPS_HINT\}/.test(src), "Tips hint must be gated on showTips")
    assert.ok(src.includes("{DOOR_TIPS_COLUMN_TITLE}"), "Tips column must use the shared title")
    assert.ok(src.includes("(scannerTips(r))"), "Tips cell must read through scannerTips ($0.00 when missing)")
    assert.ok(!/\br\.tips\b/.test(src), "cards must not read row.tips directly")
    assert.ok(!/\+\s*scannerTips\(|scannerTips\([^)]*\)\s*\+/.test(src), "tips must never be summed into sales / revenue")
  })
}

// Visibility: tip-off business with no tip history sees NO Tips UI. Tipping
// on, or an event that already collected tips, keeps it (even after tipping is
// later turned off). The API computes `tips_visible`.

test("tipsVisible: tipping off + no tip history hides Tips", () => {
  assert.equal(tipsVisible({ tips_visible: false, tipping_enabled: false, revenue: { tips: 0 } }), false)
})

test("tipsVisible: tipping off + tip history stays visible", () => {
  assert.equal(tipsVisible({ tips_visible: true, tipping_enabled: false, revenue: { tips: 1.5 } }), true)
  // History whose tip was refunded away: the API flag alone keeps it visible.
  assert.equal(tipsVisible({ tips_visible: true, tipping_enabled: false, revenue: { tips: 0 } }), true)
})

test("tipsVisible: tipping on shows Tips at $0", () => {
  assert.equal(tipsVisible({ tips_visible: true, tipping_enabled: true, revenue: { tips: 0 } }), true)
})

test("tipsVisible fallback for a services deploy without tips_visible", () => {
  assert.equal(tipsVisible({ tipping_enabled: true, revenue: {} }), true)
  assert.equal(tipsVisible({ revenue: { tips: 1.5 } }), true)
  assert.equal(tipsVisible({ revenue: { tips: 0 } }), false)
  assert.equal(tipsVisible({ revenue: {} }), false)
  assert.equal(tipsVisible({}), false)
  assert.equal(tipsVisible(null), false)
  assert.equal(tipsVisible(undefined), false)
})

test("tipsVisible never hides tips that exist", () => {
  assert.equal(tipsVisible({ tips_visible: false, revenue: { tips: 2 } }), true)
  assert.equal(tipsVisible({ tips_visible: 0, tipping_enabled: "0", revenue: { tips: "2.00" } }), true)
})

test("tipsVisible accepts boolean-ish flags: true, 1, \"true\", \"1\"", () => {
  for (const on of [true, 1, "true", "1", " TRUE "]) {
    assert.equal(tipsVisible({ tips_visible: on, revenue: {} }), true, `tips_visible=${JSON.stringify(on)}`)
    assert.equal(tipsVisible({ tipping_enabled: on, revenue: {} }), true, `tipping_enabled=${JSON.stringify(on)}`)
  }
  for (const off of [false, 0, "false", "0", "", "yes", 2, null, undefined, {}, []]) {
    assert.equal(tipsVisible({ tips_visible: off, tipping_enabled: off, revenue: {} }), false, `flag=${JSON.stringify(off)}`)
  }
})

// Same rule as the Flutter app:
// `_showTips => analytics.tipsVisible || perScanner.any(displayTips > 0)`.
test("eventTipsVisible: flags off but a scanner row has tips stays visible", () => {
  const off = { tips_visible: false, tipping_enabled: false, revenue: { tips: 0 } }
  assert.equal(eventTipsVisible(off, [{ tips: 0 }, { tips: 2 }]), true)
  assert.equal(eventTipsVisible(off, [{ tips: "2.00" }]), true)
  assert.equal(eventTipsVisible(null, [{ tips: 2 }]), true)
  assert.equal(eventTipsVisible(off, [{ tips: 0 }, {}, null]), false)
  assert.equal(eventTipsVisible(off, []), false)
  assert.equal(eventTipsVisible(off, null), false)
  assert.equal(eventTipsVisible(off), false)
})

test("eventTipsVisible: flags, tip history, or a Tips by worker total", () => {
  assert.equal(eventTipsVisible({ tips_visible: 1, revenue: {} }), true)
  assert.equal(eventTipsVisible({ tipping_enabled: "true", revenue: {} }), true)
  assert.equal(eventTipsVisible({ tips_visible: false, revenue: { tips: 2 } }), true)
  assert.equal(eventTipsVisible({ tips_visible: false, revenue: {}, tips_by_worker: [{ staff_key: "u1", tips_total: 2 }] }), true)
  assert.equal(eventTipsVisible({ tips_visible: false, revenue: {}, tips_by_worker: [{ staff_key: "u1", tips_total: 0 }] }), false)
  assert.equal(eventTipsVisible({ tips_visible: false, revenue: {}, tips_by_worker: "junk" }), false)
  assert.equal(eventTipsVisible(undefined, undefined), false)
})

test("eventTipsAmount: revenue.tips first, then Tips by worker, then scanner rows", () => {
  assert.equal(eventTipsAmount({ revenue: { tips: 2 } }, [{ tips: 5 }]), 2)
  assert.equal(eventTipsAmount({ revenue: {}, tips_by_worker: [{ tips_total: 1.5 }, { tips_total: 0.5 }] }, [{ tips: 5 }]), 2)
  assert.equal(eventTipsAmount({ revenue: { tips: 0 } }, [{ tips: 1.25 }, { tips: 0.75 }, {}, null]), 2)
  assert.equal(eventTipsAmount({ revenue: {} }), 0)
  assert.equal(eventTipsAmount(null, null), 0)
})

test("doorTipsVisible: per-scanner flag, analytics flag, or any row with tips", () => {
  assert.equal(doorTipsVisible(true, null, []), true)
  assert.equal(doorTipsVisible(undefined, { tips_visible: true }, []), true)
  assert.equal(doorTipsVisible(undefined, null, [{ tips: 0 }, { tips: 1.5 }]), true)
  assert.equal(doorTipsVisible(false, { tips_visible: false, revenue: { tips: 0 } }, [{ tips: 0 }, {}]), false)
  assert.equal(doorTipsVisible(undefined, null, null), false)
  assert.equal(doorTipsVisible(undefined, undefined, undefined), false)
  assert.equal(doorTipsVisible(1, null, []), true)
  assert.equal(doorTipsVisible("true", null, []), true)
  assert.equal(doorTipsVisible(undefined, { tipping_enabled: "1" }, []), true)
})

// Tips by worker: one collapsed row per worker, expanding lists each tip.

const WORKERS = {
  tips_by_worker: [
    {
      staff_key: "user:7", staff_user_id: 7, staff_name: "Owner Olly", scanner_label: null, tips_total: 1,
      transactions: [{ order_id: 12, tip_usd: 1, door_usd: 8, tip_status: "preset", created_at: "2026-09-01T21:30:00.000Z" }],
    },
    {
      staff_key: "sessname:maya", staff_user_id: null, staff_name: "Maya", scanner_label: "Side door", tips_total: "3.50",
      transactions: [
        { order_id: 11, tip_usd: 1.5, door_usd: 10, tip_status: "preset", created_at: "2026-09-01T21:00:00.000Z" },
        { order_id: 10, tip_usd: "2.00", door_usd: "20.00", tip_status: "custom", created_at: "2026-09-01T20:00:00.000Z" },
      ],
    },
  ],
}

test("tipsByWorker normalizes workers, highest total first, transactions in API order", () => {
  const workers = tipsByWorker(WORKERS)
  assert.deepEqual(workers.map((w) => [w.key, w.name, w.scannerLabel, w.total]), [
    ["sessname:maya", "Maya", "Side door", 3.5],
    ["user:7", "Owner Olly", null, 1],
  ])
  assert.deepEqual(workers[0].transactions, [
    { orderId: 11, tipUsd: 1.5, doorUsd: 10, statusLabel: "Preset", createdAt: "2026-09-01T21:00:00.000Z" },
    { orderId: 10, tipUsd: 2, doorUsd: 20, statusLabel: "Custom", createdAt: "2026-09-01T20:00:00.000Z" },
  ])
})

test("tipsByWorker is empty on an older services deploy and drops junk", () => {
  assert.deepEqual(tipsByWorker({}), [])
  assert.deepEqual(tipsByWorker(null), [])
  assert.deepEqual(tipsByWorker(undefined), [])
  assert.deepEqual(tipsByWorker({ tips_by_worker: "nope" }), [])
  const workers = tipsByWorker({ tips_by_worker: [null, 5, { staff_user_id: null, tips_total: NaN, transactions: [null, { tip_usd: -1 }] }] })
  assert.equal(workers.length, 1)
  assert.equal(workers[0].name, "Unknown")
  assert.equal(workers[0].total, 0)
  assert.deepEqual(workers[0].transactions, [{ orderId: null, tipUsd: 0, doorUsd: null, statusLabel: null, createdAt: null }])
})

test("tipsByWorker names a worker whose account was removed", () => {
  assert.equal(tipsByWorker({ tips_by_worker: [{ staff_key: "user:9", staff_user_id: 9, staff_name: null, tips_total: 1, transactions: [] }] })[0].name, "Removed staff")
})

test("tip status + count labels", () => {
  assert.equal(tipStatusLabel("preset"), "Preset")
  assert.equal(tipStatusLabel("custom"), "Custom")
  assert.equal(tipStatusLabel("none"), null)
  assert.equal(tipStatusLabel(undefined), null)
  assert.equal(tipCountLabel(1), "1 tip")
  assert.equal(tipCountLabel(3), "3 tips")
  assert.equal(TIPS_BY_WORKER_TITLE, "Tips by worker")
})

test("TipsByWorker accordion starts collapsed and reads through the helper", () => {
  const src = readFileSync(join(SRC, "components/business/v2/events/TipsByWorker.tsx"), "utf8")
  assert.ok(src.includes("useState<Record<string, boolean>>({})"), "no worker may start expanded")
  assert.ok(src.includes("aria-expanded={expanded}"), "rows must be real disclosure buttons")
  assert.ok(src.includes("tipsByWorker(data)"), "must read through tipsByWorker")
  assert.ok(!/tips_by_worker/.test(src), "must not read the raw field")
  assert.doesNotMatch(src, /[\u2013\u2014]/)
})

for (const rel of [
  "app/business/(dashboard)/events/[id]/manage/analytics/page.tsx",
  "app/business/_legacy/(dashboard)/events/[id]/manage/analytics/page.tsx",
]) {
  test(`${rel} gates the Door Performance Tips column on doorTipsVisible`, () => {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(src.includes("showTips={doorTipsVisible(perScannerTipsVisible, data, perScanner)}"))
    assert.ok(src.includes("setPerScannerTipsVisible(res.tips_visible)"))
  })
}

for (const rel of VIEW_HOSTS) {
  test(`${rel} passes the per-scanner rows into the analytics view`, () => {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(/<(EventAnalyticsView|EventDetail) data=\{(data|detail)\} perScanner=\{perScanner\} \/>/.test(src))
    assert.ok(src.includes("/per-scanner`"), "must fetch the per-scanner rows")
  })
}
