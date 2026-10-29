import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  buildDraftPayload,
  defaultEndForStart,
  draftEditorHref,
  validateDraftFields,
} from "./create-draft.ts"

const NOW = new Date(2026, 9, 29, 12, 0) // 2026-10-29 noon local

test("defaultEndForStart adds four hours and keeps the datetime-local shape", () => {
  assert.equal(defaultEndForStart("2026-10-31T21:00"), "2026-11-01T01:00")
  assert.equal(defaultEndForStart("2026-12-31T22:30"), "2027-01-01T02:30")
  assert.equal(defaultEndForStart("2026-10-31T21:00", 2), "2026-10-31T23:00")
  assert.equal(defaultEndForStart(""), "")
  assert.equal(defaultEndForStart("nope"), "")
})

test("validateDraftFields mirrors the editor's Details rules", () => {
  const ok = { name: "Halloween Bash", start_date_time: "2026-10-31T21:00", end_date_time: "2026-11-01T01:00", venue_id: 5 }
  assert.deepEqual(validateDraftFields(ok, NOW), {})
  assert.equal(validateDraftFields({ ...ok, name: "  " }, NOW).name, "Event name is required")
  assert.ok(validateDraftFields({ ...ok, name: "x".repeat(101) }, NOW).name?.includes("100"))
  assert.equal(validateDraftFields({ ...ok, venue_id: null }, NOW).venue_id, "Pick a venue")
  assert.equal(validateDraftFields({ ...ok, start_date_time: "" }, NOW).start_date_time, "Start date is required")
  assert.equal(
    validateDraftFields({ ...ok, start_date_time: "2026-10-01T21:00" }, NOW).start_date_time,
    "Start date must be in the future",
  )
  assert.equal(validateDraftFields({ ...ok, end_date_time: "" }, NOW).end_date_time, "End date is required")
  assert.equal(
    validateDraftFields({ ...ok, end_date_time: "2026-10-31T20:00" }, NOW).end_date_time,
    "End date must be after start date",
  )
})

test("buildDraftPayload is a real save_as_draft POST, Ticketed with the placeholder tier", () => {
  const body = buildDraftPayload(
    { name: " Halloween Bash ", start_date_time: "2026-10-31T21:00", end_date_time: "2026-11-01T01:00", venue_id: 5 },
    { id: 5, name: "The Dungeon", address: "1 Main St" },
  )
  assert.equal(body.name, "Halloween Bash")
  assert.equal(body.venue_id, 5)
  assert.equal(body.venue_name, "The Dungeon")
  assert.equal(body.venue_address, "1 Main St")
  assert.equal(body.type, "Ticketed")
  assert.equal(body.save_as_draft, true)
  assert.equal(body.is_recurring, false)
  // services refuses a Ticketed create with no tier ("Ticketed events must
  // include at least one ticket tier"), so the draft carries the wizard's
  // default General Admission tier for the host to price in the editor.
  assert.deepEqual(body.tickets, [
    { name: "General Admission", description: "", price_usd: 0, quantity: 0, max_per_person: 0, ticket_type: "paid" },
  ])
})

test("the draft lands in the editor for that id", () => {
  assert.equal(draftEditorHref(77), "/business/events/77/edit")
})

test("the modal posts through the draft helper and routes to the editor", () => {
  const modal = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/events/CreateEventModal.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(modal.includes("buildDraftPayload"), "the POST body comes from the pure helper")
  assert.ok(modal.includes('apiClient.post') && modal.includes('"/business/events"'), "creates through the existing create API")
  assert.ok(modal.includes("draftEditorHref"), "then opens the editor for the new id")
  assert.ok(modal.includes("/business/create"), "Weekly Cover creation stays reachable from the modal")
  assert.ok(modal.includes("Create draft"), "the CTA is Create draft")
})
