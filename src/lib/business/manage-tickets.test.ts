// Luke QA: Manage Tickets label, max-per-person 0 = unlimited, and the
// shared list UX (drag handle + sold-out) must stay on ManageSalesTickets
// for event edit. Weekly Cover nights draft on the night page and Save night.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { persistMaxPerPerson } from "./ticket-limits.ts"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

test("event hub and tickets editor say Manage Tickets", () => {
  const hub = read("../../app/business/(dashboard)/events/[id]/manage/page.tsx")
  const ticketsPage = read("../../app/business/(dashboard)/events/[id]/manage/tickets/page.tsx")

  assert.ok(hub.includes('title: "Manage Tickets"'), "EVENT SETUP tile must be Manage Tickets")
  assert.ok(!hub.includes('title: "Manage sales"'), "do not keep the Manage sales tile label")
  assert.ok(ticketsPage.includes('title="Manage Tickets"'), "tickets page title must be Manage Tickets")
  assert.ok(!ticketsPage.includes("Manage sales"), "tickets page must not say Manage sales")
})

test("max per person 0 is valid and persists as no limit", () => {
  assert.equal(persistMaxPerPerson(""), null)
  assert.equal(persistMaxPerPerson("  "), null)
  assert.equal(persistMaxPerPerson("0"), null)
  assert.equal(persistMaxPerPerson("00"), null)
  assert.equal(persistMaxPerPerson("1"), 1)
  assert.equal(persistMaxPerPerson("4"), 4)

  const manage = read("../../components/business/v2/events/ManageSalesTickets.tsx")
  assert.ok(manage.includes("persistMaxPerPerson"), "shared save body must use the 0 = unlimited helper")
  assert.ok(manage.includes("Max per person (0 = unlimited)"))
  assert.ok(manage.includes("Quantity (0 = unlimited)"))

  const maxField = manage.slice(manage.indexOf("Max per person (0 = unlimited)"))
  const input = maxField.slice(0, maxField.indexOf("</Input>"))
  assert.ok(input.includes('min="0"'), "HTML min must accept 0 so the browser does not block save")
  assert.ok(!input.includes('min="1"'), "min=1 is the validation that blocked Cover and Rumble")
})

test("shared ticket editor keeps sold-out toggle and drag handle", () => {
  const manage = read("../../components/business/v2/events/ManageSalesTickets.tsx")
  const editor = read("../../components/business/v2/door-access/NightTicketsEditor.tsx")
  const ticketsPage = read("../../app/business/(dashboard)/events/[id]/manage/tickets/page.tsx")

  assert.ok(manage.includes('aria-label="Drag to reorder"'), "drag handle from the old Manage Tickets list")
  assert.ok(manage.includes("useDragControls"))
  assert.ok(manage.includes("tickets/reorder"), "drop still persists the full order")
  assert.ok(manage.includes("Mark sold out"))
  assert.ok(manage.includes("force_sold_out"))
  assert.ok(manage.includes("EVENT_TICKET_ROW_ACTIONS"))
  assert.ok(manage.includes("soldOut: true"))

  assert.ok(ticketsPage.includes("ManageSalesTickets"), "event Manage Tickets uses the shared editor")
  assert.ok(editor.includes("TicketEditForm"), "Weekly Cover night edit keeps the shared ticket card")
  assert.ok(!editor.includes("<ManageSalesTickets"), "night page must not PUT /business/events/:id/tickets")
  assert.ok(editor.includes("allowReorder={false}"), "night override cannot store ticket order")
})
