import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  addShellDraftId,
  excludeShellDrafts,
  isShellDraft,
  readShellDraftIds,
  removeShellDraftId,
  shellDraftsKey,
} from "./shell-drafts.ts"

function memStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), map: m }
}

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

test("ids are kept per business and survive a round trip", () => {
  const s = memStorage()
  addShellDraftId(s, 267, 990204137)
  addShellDraftId(s, 267, 990204138)
  addShellDraftId(s, 268, 5)
  assert.deepEqual([...readShellDraftIds(s, 267)].sort(), [990204137, 990204138])
  assert.deepEqual([...readShellDraftIds(s, 268)], [5])
  assert.equal(shellDraftsKey(267), "bizzy.shellDrafts:267")
  assert.ok(isShellDraft(s, 267, 990204137))
  assert.ok(!isShellDraft(s, 267, 5))
  removeShellDraftId(s, 267, 990204137)
  assert.deepEqual([...readShellDraftIds(s, 267)], [990204138])
})

test("bad storage contents and missing business degrade to an empty set", () => {
  const s = memStorage()
  s.setItem(shellDraftsKey(267), "not json")
  assert.deepEqual([...readShellDraftIds(s, 267)], [])
  s.setItem(shellDraftsKey(267), JSON.stringify({ a: 1 }))
  assert.deepEqual([...readShellDraftIds(s, 267)], [])
  assert.deepEqual([...readShellDraftIds(s, null)], [])
  assert.deepEqual([...readShellDraftIds(null, 267)], [])
  addShellDraftId(null, 267, 1) // no throw
  addShellDraftId(s, null, 1)
  assert.deepEqual([...readShellDraftIds(s, 267)], [])
})

test("the live-after-approve promoter skips the host's own shell drafts", () => {
  assert.deepEqual(excludeShellDrafts([1, 2, 3], new Set([2])), [1, 3])
  assert.deepEqual(excludeShellDrafts([1, 2, 3], new Set()), [1, 2, 3])
})

test("every promoter and publisher is wired to the guard", () => {
  const sweep = read("../../components/business/v2/LiveAfterApprove.tsx")
  assert.ok(sweep.includes("excludeShellDrafts"), "the D3 sweep skips shell drafts")
  const detail = read("../../app/business/(dashboard)/events/[id]/page.tsx")
  assert.ok(detail.includes("isShellDraft"), "the detail page's auto-publish skips shell drafts")
  assert.ok(detail.includes("removeShellDraftId"), "a manual Publish on the detail page releases the guard")
  const modal = read("../../components/business/v2/events/CreateEventModal.tsx")
  assert.ok(modal.includes("addShellDraftId"), "the modal records the draft it made")
  const form = read("../../components/business/v2/events/EventForm.tsx")
  assert.ok(form.includes("removeShellDraftId"), "the editor's Publish releases the guard")
  const overview = read("../../app/business/(dashboard)/events/[id]/manage/page.tsx")
  assert.ok(overview.includes("removeShellDraftId"), "Overview's Publish releases the guard")
})
