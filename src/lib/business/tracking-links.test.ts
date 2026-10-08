// Manage Event → Tracking Links (Wave 2B). Pins the label rule (mirrors the
// services TRACKING_LABEL_MAX), the archived filter, the row upsert and the
// explainer copy Luke specified word for word.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  TRACKING_LABEL_MAX,
  TRACKING_LINKS_TOOLTIP,
  checkTrackingLabel,
  countArchived,
  isArchived,
  trackingLinkDisplayName,
  upsertTrackingLink,
  visibleTrackingLinks,
} from "./tracking-links.ts"
import type { HostTrackingLink } from "./types.ts"

function link(over: Partial<HostTrackingLink> = {}): HostTrackingLink {
  return {
    id: 1,
    event_id: 2177,
    code: "flyer-sunday-funknight-2026-10-11",
    label: "Flyer v2",
    share_url: "https://example.test/event/2177?ref=flyer-sunday-funknight-2026-10-11",
    archived_at: null,
    created_at: "2026-10-07 20:15:24",
    clicks: 3,
    orders: 1,
    tickets: 1,
    revenue_cents: 0,
    ...over,
  }
}

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

test("label max matches the services constant (80)", () => {
  assert.equal(TRACKING_LABEL_MAX, 80)
})

test("label is required, trimmed, whitespace-collapsed, capped at 80", () => {
  assert.deepEqual(checkTrackingLabel(""), { ok: false, error: "Give the link a name." })
  assert.deepEqual(checkTrackingLabel("   "), { ok: false, error: "Give the link a name." })
  assert.deepEqual(checkTrackingLabel("  Dash   Test "), { ok: true, label: "Dash Test" })
  assert.deepEqual(checkTrackingLabel("x".repeat(80)), { ok: true, label: "x".repeat(80) })
  const tooLong = checkTrackingLabel("x".repeat(81))
  assert.equal(tooLong.ok, false)
  assert.match((tooLong as { error: string }).error, /80/)
})

test("archived = archived_at set; filter hides them unless asked", () => {
  const live = link({ id: 73 })
  const gone = link({ id: 74, archived_at: "2026-10-07 20:15:26" })
  assert.equal(isArchived(live), false)
  assert.equal(isArchived(gone), true)
  assert.deepEqual(visibleTrackingLinks([live, gone], false).map((l) => l.id), [73])
  assert.deepEqual(visibleTrackingLinks([live, gone], true).map((l) => l.id), [73, 74])
  assert.equal(countArchived([live, gone]), 1)
})

test("display name falls back to the code when a row has no label", () => {
  assert.equal(trackingLinkDisplayName(link()), "Flyer v2")
  assert.equal(trackingLinkDisplayName(link({ label: "  " })), "flyer-sunday-funknight-2026-10-11")
  assert.equal(trackingLinkDisplayName(link({ label: null })), "flyer-sunday-funknight-2026-10-11")
})

test("upsert replaces a known row in place and prepends a new one", () => {
  const a = link({ id: 73 })
  const b = link({ id: 74 })
  const renamed = link({ id: 74, label: "Renamed" })
  assert.deepEqual(upsertTrackingLink([a, b], renamed).map((l) => l.label), ["Flyer v2", "Renamed"])
  const fresh = link({ id: 75, label: "Dash Test" })
  assert.deepEqual(upsertTrackingLink([a, b], fresh).map((l) => l.id), [75, 73, 74])
})

test("tooltip is Luke's exact wording", () => {
  assert.equal(
    TRACKING_LINKS_TOOLTIP,
    "Each link tracks clicks and ticket purchases. If someone clicks more than one link, the last one they clicked gets credit.",
  )
})

test("page wires the tooltip, the owner/manager gate and the real endpoints", () => {
  const page = read("../../app/business/(dashboard)/events/[id]/manage/tracking-links/page.tsx")
  assert.match(page, /TRACKING_LINKS_TOOLTIP/)
  assert.match(page, /business_role === "owner" \|\| .*business_role === "manager"/)
  assert.match(page, /const base = `\/business\/events\/\$\{id\}\/tracking-links`/)
  assert.match(page, /`\$\{base\}\/\$\{.*\.id\}`/)
  assert.match(page, /maxLength=\{TRACKING_LABEL_MAX\}/)

  // The manage hub lists the tile next to Promoters, owners/managers only.
  const hub = read("../../app/business/(dashboard)/events/[id]/manage/page.tsx")
  const promoters = hub.indexOf('title: "Promoters"')
  const tracking = hub.indexOf('title: "Tracking links"')
  assert.ok(promoters > -1 && tracking > -1, "both tiles present")
  assert.ok(tracking > promoters, "Tracking links sits right after Promoters")
  assert.match(hub.slice(tracking, tracking + 200), /show: canEdit/)
})
