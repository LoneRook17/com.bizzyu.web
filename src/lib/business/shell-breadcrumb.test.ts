import { test } from "node:test"
import assert from "node:assert/strict"
import { shellPageLabel, shellRoleLabel } from "./shell-breadcrumb.ts"

test("top bar page label follows the sidebar section, not the leaf route", () => {
  assert.equal(shellPageLabel("/business"), "Home")
  assert.equal(shellPageLabel("/business/"), "Home")
  assert.equal(shellPageLabel("/business/events"), "Events")
  assert.equal(shellPageLabel("/business/events/42/manage/tickets"), "Events")
  assert.equal(shellPageLabel("/business/door-access/7/nights/2026-10-30"), "Events")
  assert.equal(shellPageLabel("/business/recurring/3"), "Events")
  assert.equal(shellPageLabel("/business/promo-codes"), "Universal promo codes")
  assert.equal(shellPageLabel("/business/team"), "Team")
  assert.equal(shellPageLabel("/business/settings"), "Settings")
  assert.equal(shellPageLabel("/business/somewhere-new"), "Home")
})

test("sidebar footer names the role, owners read as the workspace owner", () => {
  assert.equal(shellRoleLabel("owner", "a@b.co"), "Workspace owner")
  assert.equal(shellRoleLabel("manager", "a@b.co"), "Manager")
  assert.equal(shellRoleLabel("staff"), "Staff")
  assert.equal(shellRoleLabel(undefined, "a@b.co"), "a@b.co")
  assert.equal(shellRoleLabel(null, null), "")
})
