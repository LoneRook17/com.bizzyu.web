import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  MANAGE_TILE_TO_TAB,
  activeManageTab,
  manageBase,
  manageSubNav,
  manageTabs,
} from "./manage-tabs.ts"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

test("five tabs, in the locked order, with the brief's labels", () => {
  assert.deepEqual(
    manageTabs(7).map((t) => t.label),
    ["Overview", "Tickets", "Guests", "Promo & tracking", "Settings"],
  )
  assert.equal(manageTabs(7)[0].href, "/business/events/7/manage")
  assert.equal(manageBase("abc"), "/business/events/abc/manage")
})

test("every old hub tile lands in exactly one tab", () => {
  const keys = new Set(manageTabs(1).map((t) => t.key))
  for (const [tile, tab] of Object.entries(MANAGE_TILE_TO_TAB)) {
    assert.ok(keys.has(tab), `${tile} maps to an unknown tab ${tab}`)
  }
  // Nothing the old page offered is missing from the map.
  for (const tile of [
    "Edit event", "Edit night", "Manage Tickets", "Managers & co-hosts", "Event analytics",
    "Promo codes", "Promoters", "Tracking links", "Announcements", "Scan", "Check-in history",
    "Redemption list",
  ]) {
    assert.ok(tile in MANAGE_TILE_TO_TAB, `${tile} dropped from the route map`)
  }
  // Door Code stays gone (BETA, Luke PRD 2026-10-29).
  assert.ok(!("Door code" in MANAGE_TILE_TO_TAB))
})

test("the active tab follows the route, longest prefix wins", () => {
  const id = 42
  assert.equal(activeManageTab("/business/events/42/manage", id), "overview")
  assert.equal(activeManageTab("/business/events/42/manage/", id), "overview")
  assert.equal(activeManageTab("/business/events/42/manage/tickets", id), "tickets")
  assert.equal(activeManageTab("/business/events/42/manage/checkins", id), "guests")
  assert.equal(activeManageTab("/business/events/42/manage/scanner", id), "guests")
  assert.equal(activeManageTab("/business/events/42/manage/promote", id), "promote")
  assert.equal(activeManageTab("/business/events/42/manage/promo-codes", id), "promote")
  assert.equal(activeManageTab("/business/events/42/manage/promoters", id), "promote")
  assert.equal(activeManageTab("/business/events/42/manage/tracking-links", id), "promote")
  assert.equal(activeManageTab("/business/events/42/manage/announcements", id), "promote")
  assert.equal(activeManageTab("/business/events/42/manage/settings", id), "settings")
  assert.equal(activeManageTab("/business/events/42/manage/team", id), "settings")
  // Unknown subpaths fall back to Overview rather than no tab.
  assert.equal(activeManageTab("/business/events/42/manage/whatever", id), "overview")
})

test("sub-nav mirrors the old tiles' visibility rules", () => {
  const owner = { isDoorAccess: false, canEdit: true, seriesActive: true }
  const staff = { isDoorAccess: false, canEdit: false, seriesActive: true }
  assert.deepEqual(
    manageSubNav("promote", 1, owner).map((l) => l.label),
    ["Promo & tracking", "Promo codes", "Promoters", "Tracking links", "Announcements"],
  )
  // Staff: no promo codes (owner/manager only), no tracking links (403 upstream).
  assert.deepEqual(
    manageSubNav("promote", 1, staff).map((l) => l.label),
    ["Promo & tracking", "Promoters", "Announcements"],
  )
  // An ended WC series loses promo codes (seriesActive gate), keeps the rest.
  assert.deepEqual(
    manageSubNav("promote", 1, { isDoorAccess: true, canEdit: true, seriesActive: false }).map((l) => l.label),
    ["Promo & tracking", "Promoters", "Tracking links", "Announcements"],
  )
  assert.deepEqual(
    manageSubNav("guests", 1, owner).map((l) => l.label),
    ["Check-in history", "Scan"],
  )
  assert.deepEqual(
    manageSubNav("guests", 1, { ...owner, isDoorAccess: true }).map((l) => l.label),
    ["Redemption list", "Scan"],
  )
  assert.deepEqual(manageSubNav("settings", 1, owner).map((l) => l.label), ["Settings", "Managers & co-hosts"])
  assert.deepEqual(manageSubNav("overview", 1, owner), [])
  assert.deepEqual(manageSubNav("tickets", 1, owner), [])
})

test("the manage layout renders the tabs as links and follows the route", () => {
  const layout = read("../../app/business/(dashboard)/events/[id]/manage/layout.tsx")
  assert.ok(layout.includes("manageTabs("), "tabs come from the shared map")
  assert.ok(layout.includes("activeManageTab("), "active state follows the pathname")
  assert.ok(layout.includes("manageSubNav("), "multi-page tabs get the second row")
  assert.ok(layout.includes("<Link"), "tabs are links, not buttons")
  assert.ok(!layout.includes("DoorCodeCard"), "Door Code stays gone")
})
