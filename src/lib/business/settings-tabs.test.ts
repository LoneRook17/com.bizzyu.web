// Settings tab visibility by role (Tipping Slice 1 leftover). `node --test`.
//
// Staff QA: Settings → Tipping tab → red "Couldn't load tipping settings"
// because GET /business/tipping is owner/manager only. The tab must not
// exist for staff/promoter, and a ?tab=tipping deep link must land somewhere
// safe instead of mounting the 403-bound form.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ALL_SETTINGS_TABS,
  DEFAULT_SETTINGS_TAB,
  resolveSettingsTab,
  visibleSettingsTabs,
} from "./settings-tabs.ts"

test("visibleSettingsTabs: owner and manager see every tab, Tipping included, in order", () => {
  assert.deepEqual(visibleSettingsTabs("owner"), [...ALL_SETTINGS_TABS])
  assert.deepEqual(visibleSettingsTabs("manager"), [...ALL_SETTINGS_TABS])
})

test("visibleSettingsTabs: staff / promoter / unknown roles never get a Tipping tab", () => {
  for (const role of ["staff", "promoter", null, undefined, ""]) {
    const tabs = visibleSettingsTabs(role)
    assert.ok(!tabs.includes("tipping"), `tipping leaked for role=${String(role)}`)
    // Only Tipping is removed — the rest of Settings is untouched for staff.
    assert.deepEqual(tabs, ALL_SETTINGS_TABS.filter((t) => t !== "tipping"))
  }
})

test("resolveSettingsTab: a visible tab is returned as-is", () => {
  assert.equal(resolveSettingsTab("payments", "staff"), "payments")
  assert.equal(resolveSettingsTab("tipping", "owner"), "tipping")
  assert.equal(resolveSettingsTab("tipping", "manager"), "tipping")
})

test("resolveSettingsTab: ?tab=tipping for staff falls back to Profile, no error flash", () => {
  assert.equal(resolveSettingsTab("tipping", "staff"), DEFAULT_SETTINGS_TAB)
  assert.equal(resolveSettingsTab("tipping", "promoter"), DEFAULT_SETTINGS_TAB)
  assert.equal(resolveSettingsTab("tipping", undefined), DEFAULT_SETTINGS_TAB)
})

test("resolveSettingsTab: unknown / missing values fall back to Profile for every role", () => {
  assert.equal(resolveSettingsTab(null, "owner"), DEFAULT_SETTINGS_TAB)
  assert.equal(resolveSettingsTab(undefined, "staff"), DEFAULT_SETTINGS_TAB)
  assert.equal(resolveSettingsTab("billing", "owner"), DEFAULT_SETTINGS_TAB)
  assert.equal(resolveSettingsTab("", "manager"), DEFAULT_SETTINGS_TAB)
})
