// Audit Wave 3, F15 — Full Edit and Manage Tickets must put the SAME per-tier
// body on the wire. Before this, Full Edit built its own map and had drifted:
// `quantity: t.quantity || null` for unlimited (the business update path turns
// null into capacity 100), `max_per_person: … || undefined`, raw description,
// and no `is_hidden` echo, so a Full Edit save could clobber what the host set
// on Manage Tickets. These tests pin the shared helper's contract, Manage ↔
// Edit parity on one fixture, byte-identity with the body Manage sent before
// the refactor, and that both components actually route through the helper.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  ticketTierToWire,
  wireMaxPerPerson,
  wirePrice,
  wireQuantity,
  type TicketTierWireInput,
} from "./ticket-tier-wire.ts"
import { tierSurgeToWire } from "./event-tier-surge.ts"
import { persistMaxPerPerson } from "./ticket-limits.ts"
import type { TicketTier } from "./types.ts"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

/** A served row as the Full Edit form holds it (numbers; MySQL flags as 1/0). */
function editTier(overrides: Partial<TicketTier> = {}): TicketTier {
  return {
    ticket_id: 41,
    name: "GA",
    description: "",
    price_usd: 20,
    quantity: 0,
    max_per_person: 0,
    ticket_type: "paid",
    valid_from: "",
    valid_until: "",
    surge_enabled: false,
    surge: [],
    ...overrides,
  }
}

const SURGE_OFF = { surge_enabled: false, surge_steps: [] }

// ── Field rules ─────────────────────────────────────────────────────────────

test("quantity: 0 = unlimited, never null — numbers, strings, legacy null", () => {
  assert.equal(wireQuantity(0), 0)
  assert.equal(wireQuantity(null), 0)
  assert.equal(wireQuantity(undefined), 0)
  assert.equal(wireQuantity(""), 0)
  assert.equal(wireQuantity("abc"), 0)
  assert.equal(wireQuantity("150"), 150)
  assert.equal(wireQuantity(150), 150)
  assert.equal(ticketTierToWire(editTier({ quantity: 0 })).quantity, 0)
  assert.equal(ticketTierToWire(editTier({ quantity: null as unknown as number })).quantity, 0)
  assert.equal(ticketTierToWire(editTier({ quantity: 75 })).quantity, 75)
  // Mid-keystroke the number input holds "" — still 0, never NaN or null.
  assert.equal(ticketTierToWire(editTier({ quantity: "" as unknown as number })).quantity, 0)
})

test("max_per_person: blank / 0 = no cap (null), otherwise an integer ≥ 1", () => {
  assert.equal(wireMaxPerPerson(0), null)
  assert.equal(wireMaxPerPerson(null), null)
  assert.equal(wireMaxPerPerson(undefined), null)
  assert.equal(wireMaxPerPerson(""), null)
  assert.equal(wireMaxPerPerson("0"), null)
  assert.equal(wireMaxPerPerson("4"), 4)
  assert.equal(wireMaxPerPerson(4), 4)
  assert.equal(ticketTierToWire(editTier({ max_per_person: 0 })).max_per_person, null)
  assert.equal(ticketTierToWire(editTier({ max_per_person: undefined })).max_per_person, null)
  assert.equal(ticketTierToWire(editTier({ max_per_person: 2 })).max_per_person, 2)
})

test("a free tier never carries a price", () => {
  assert.equal(wirePrice("free", 12), 0)
  assert.equal(wirePrice("guest", 12), 0)
  assert.equal(wirePrice("paid", "12.50"), 12.5)
  assert.equal(wirePrice("paid", "abc"), 0)
  assert.equal(ticketTierToWire(editTier({ ticket_type: "free", price_usd: 12 })).price_usd, 0)
  assert.equal(ticketTierToWire(editTier({ ticket_type: "paid", price_usd: 12 })).price_usd, 12)
})

test("name is trimmed; blank description travels as null", () => {
  const w = ticketTierToWire(editTier({ name: "  VIP ", description: "   " }))
  assert.equal(w.name, "VIP")
  assert.equal(w.description, null)
  assert.equal(ticketTierToWire(editTier({ description: undefined })).description, null)
  assert.equal(ticketTierToWire(editTier({ description: " drink included " })).description, "drink included")
})

test("scan window: blank clears to null, set values pass through", () => {
  const blank = ticketTierToWire(editTier())
  assert.equal(blank.valid_from, null)
  assert.equal(blank.valid_until, null)
  const set = ticketTierToWire(editTier({ valid_from: "2026-11-01T20:00", valid_until: "2026-11-02T02:00" }))
  assert.equal(set.valid_from, "2026-11-01T20:00")
  assert.equal(set.valid_until, "2026-11-02T02:00")
})

test("is_21_plus only when stated — true/false echoed, undefined omitted", () => {
  assert.equal(ticketTierToWire(editTier({ is_21_plus: true })).is_21_plus, true)
  assert.equal(ticketTierToWire(editTier({ is_21_plus: false })).is_21_plus, false)
  assert.equal(ticketTierToWire(editTier({ is_21_plus: 1 as unknown as boolean })).is_21_plus, true)
  assert.ok(!("is_21_plus" in ticketTierToWire(editTier({ is_21_plus: undefined }))), "unstated 21+ must be omitted")
})

test("is_hidden only when stated — a served hidden tier is echoed hidden, never unhidden by omission", () => {
  // MySQL hands the flag back as 1/0 on the served row.
  assert.equal(ticketTierToWire(editTier({ is_hidden: 1 as unknown as boolean })).is_hidden, true)
  assert.equal(ticketTierToWire(editTier({ is_hidden: true })).is_hidden, true)
  assert.equal(ticketTierToWire(editTier({ is_hidden: 0 as unknown as boolean })).is_hidden, false)
  // A tier the host just added has no flag yet — omit, so create takes the default.
  assert.ok(!("is_hidden" in ticketTierToWire(editTier({ is_hidden: undefined }))), "unstated is_hidden must be omitted")
})

test("surge: off is an explicit clear; on writes {after_sold, price_usd} rungs", () => {
  const off = ticketTierToWire(editTier({ surge_enabled: false, surge: [{ afterSoldInput: "10", priceInput: "25" }] }))
  assert.deepEqual({ surge_enabled: off.surge_enabled, surge_steps: off.surge_steps }, SURGE_OFF)

  const on = ticketTierToWire(
    editTier({
      surge_enabled: true,
      surge: [
        { afterSoldInput: "10", priceInput: "25" },
        { afterSoldInput: "20", priceInput: "30.50" },
        { afterSoldInput: "", priceInput: "40" }, // half-typed rung dropped
      ],
    })
  )
  assert.equal(on.surge_enabled, true)
  assert.deepEqual(on.surge_steps, [
    { after_sold: 10, price_usd: 25 },
    { after_sold: 20, price_usd: 30.5 },
  ])
  // An enabled toggle with no usable rung is still OFF on the wire.
  const empty = ticketTierToWire(editTier({ surge_enabled: true, surge: [] }))
  assert.deepEqual({ surge_enabled: empty.surge_enabled, surge_steps: empty.surge_steps }, SURGE_OFF)
})

test("ticket_id rides along only when the tier has one", () => {
  assert.equal(ticketTierToWire(editTier({ ticket_id: 41 })).ticket_id, 41)
  assert.ok(!("ticket_id" in ticketTierToWire(editTier({ ticket_id: undefined }))))
  assert.ok(!("ticket_id" in ticketTierToWire(editTier({ ticket_id: 0 }))))
  assert.ok(!("ticket_id" in ticketTierToWire({ ...editTier(), ticket_id: null })))
})

// ── Parity ──────────────────────────────────────────────────────────────────

/**
 * What Manage Tickets' `ticketSaveBody` built BEFORE the refactor, verbatim
 * (strings from its form state). Byte-identity with the helper for the same
 * inputs is the proof that Manage's own contract did not move.
 */
function legacyManageBody(editing: {
  name: string
  description: string
  ticket_type: "paid" | "free" | "guest"
  price_usd: string
  quantity: string
  max_per_person: string
  valid_from: string
  valid_until: string
  is_21_plus?: boolean
  surge_enabled: boolean
  surge: { afterSoldInput: string; priceInput: string }[]
  surge_base_price_usd?: number | null
}) {
  return {
    name: editing.name.trim(),
    description: editing.description.trim() || null,
    ticket_type: editing.ticket_type,
    price_usd: editing.ticket_type === "paid" ? parseFloat(editing.price_usd) || 0 : 0,
    quantity: parseInt(editing.quantity) || 0,
    max_per_person: persistMaxPerPerson(editing.max_per_person),
    valid_from: editing.valid_from || null,
    valid_until: editing.valid_until || null,
    ...(editing.is_21_plus === undefined ? {} : { is_21_plus: !!editing.is_21_plus }),
    ...tierSurgeToWire({
      name: editing.name,
      price_usd: editing.ticket_type === "paid" ? parseFloat(editing.price_usd) || 0 : 0,
      quantity: parseInt(editing.quantity) || 0,
      ticket_type: editing.ticket_type === "guest" ? "paid" : editing.ticket_type,
      surge_enabled: editing.surge_enabled,
      surge: editing.surge,
      surge_base_price_usd: editing.surge_base_price_usd ?? null,
    }),
  }
}

/** How ManageSalesTickets.ticketSaveBody now feeds the helper. */
function manageInput(editing: Parameters<typeof legacyManageBody>[0]): TicketTierWireInput {
  return {
    name: editing.name,
    description: editing.description,
    ticket_type: editing.ticket_type,
    price_usd: editing.price_usd,
    quantity: editing.quantity,
    max_per_person: persistMaxPerPerson(editing.max_per_person),
    valid_from: editing.valid_from,
    valid_until: editing.valid_until,
    is_21_plus: editing.is_21_plus,
    surge_enabled: editing.surge_enabled,
    surge: editing.surge,
    surge_base_price_usd: editing.surge_base_price_usd ?? null,
  }
}

const MANAGE_FIXTURES: Array<[string, Parameters<typeof legacyManageBody>[0]]> = [
  [
    "unlimited paid tier, no cap, no 21+, surge off",
    {
      name: " GA ",
      description: "",
      ticket_type: "paid",
      price_usd: "20",
      quantity: "0",
      max_per_person: "",
      valid_from: "",
      valid_until: "",
      surge_enabled: false,
      surge: [],
    },
  ],
  [
    "capped 21+ tier with a window and a live ladder",
    {
      name: "VIP",
      description: "  Includes a drink ",
      ticket_type: "paid",
      price_usd: "35.50",
      quantity: "40",
      max_per_person: "2",
      valid_from: "2026-11-01T20:00",
      valid_until: "2026-11-02T02:00",
      is_21_plus: true,
      surge_enabled: true,
      surge: [
        { afterSoldInput: "10", priceInput: "40" },
        { afterSoldInput: "20", priceInput: "45" },
      ],
      surge_base_price_usd: 35.5,
    },
  ],
  [
    "free tier with a stale price in the box, 21+ explicitly off, 0 cap",
    {
      name: "Free entry",
      description: "   ",
      ticket_type: "free",
      price_usd: "12",
      quantity: "500",
      max_per_person: "0",
      valid_from: "",
      valid_until: "",
      is_21_plus: false,
      surge_enabled: false,
      surge: [],
    },
  ],
  [
    "guest tier keeps its type and sends no price",
    {
      name: "Guest list",
      description: "",
      ticket_type: "guest",
      price_usd: "0",
      quantity: "25",
      max_per_person: "1",
      valid_from: "",
      valid_until: "",
      surge_enabled: false,
      surge: [],
    },
  ],
  [
    "surge toggled on with nothing typed yet is off on the wire",
    {
      name: "Early bird",
      description: "",
      ticket_type: "paid",
      price_usd: "15",
      quantity: "abc",
      max_per_person: "x",
      valid_from: "",
      valid_until: "",
      surge_enabled: true,
      surge: [{ afterSoldInput: "", priceInput: "" }],
    },
  ],
]

test("Manage Tickets body is byte-identical to what it sent before the refactor", () => {
  for (const [label, editing] of MANAGE_FIXTURES) {
    const legacy = legacyManageBody(editing)
    const now = ticketTierToWire(manageInput(editing))
    assert.deepEqual(now, legacy, label)
    assert.equal(JSON.stringify(now), JSON.stringify(legacy), `${label}: key order`)
    assert.ok(!("ticket_id" in now), `${label}: Manage keys the tier by URL, never in the body`)
    assert.ok(!("is_hidden" in now), `${label}: Manage never states is_hidden (hide is its own PUT)`)
  }
})

test("Full Edit and Manage Tickets send the same body for the same tier", () => {
  // The same tier as each editor holds it: Manage as form strings, Edit as the
  // served row (numbers, with its ticket_id).
  const manage = ticketTierToWire(
    manageInput({
      name: "VIP",
      description: "Includes a drink",
      ticket_type: "paid",
      price_usd: "35.5",
      quantity: "0",
      max_per_person: "2",
      valid_from: "2026-11-01T20:00",
      valid_until: "",
      is_21_plus: true,
      surge_enabled: true,
      surge: [{ afterSoldInput: "10", priceInput: "40" }],
      surge_base_price_usd: 35.5,
    })
  )
  const edit = ticketTierToWire(
    editTier({
      ticket_id: 77,
      name: "VIP",
      description: "Includes a drink",
      ticket_type: "paid",
      price_usd: 35.5,
      quantity: 0,
      max_per_person: 2,
      valid_from: "2026-11-01T20:00",
      valid_until: null,
      is_21_plus: true,
      surge_enabled: true,
      surge: [{ afterSoldInput: "10", priceInput: "40" }],
      surge_base_price_usd: 35.5,
    })
  )
  const { ticket_id, ...editBody } = edit
  assert.equal(ticket_id, 77)
  assert.deepEqual(editBody, manage)
  // The two drifts this wave closes, pinned on the Edit side:
  assert.equal(edit.quantity, 0, "unlimited is 0, not null (null became capacity 100 on the update path)")
  assert.equal(edit.max_per_person, 2)
  assert.equal(ticketTierToWire(editTier({ max_per_person: 0 })).max_per_person, null, "cleared cap is an explicit null, not omitted")
})

test("a hidden tier loaded into Full Edit goes back hidden", () => {
  // GET /business/events/:id serves hidden tiers (includeHidden) — Edit must
  // echo the flag so a tier hidden on Manage Tickets stays hidden through a
  // Full Edit save. Visible served rows echo false; brand-new rows omit it.
  const served = [
    editTier({ ticket_id: 1, name: "GA", is_hidden: 0 as unknown as boolean }),
    editTier({ ticket_id: 2, name: "Secret", is_hidden: 1 as unknown as boolean }),
    editTier({ ticket_id: undefined, name: "New tier" }),
  ].map((t) => ticketTierToWire(t))
  assert.equal(served[0].is_hidden, false)
  assert.equal(served[1].is_hidden, true)
  assert.equal(served[1].ticket_id, 2)
  assert.ok(!("is_hidden" in served[2]))
  assert.ok(!("ticket_id" in served[2]))
})

// ── Source pins: both editors route through the helper ─────────────────────

test("EventForm and ManageSalesTickets both build the tier body with ticketTierToWire", () => {
  const eventForm = read("../../components/business/v2/events/EventForm.tsx")
  const manage = read("../../components/business/v2/events/ManageSalesTickets.tsx")

  assert.ok(eventForm.includes('from "@/lib/business/ticket-tier-wire"'), "EventForm must import the shared helper")
  assert.ok(eventForm.includes("form.tickets.map((t) => ticketTierToWire(t))"), "Edit payload must map tiers through the helper")
  assert.ok(!eventForm.includes("quantity: t.quantity || null"), "the null-for-unlimited drift must be gone")
  assert.ok(!eventForm.includes("max_per_person: t.max_per_person || undefined"), "the omitted-cap drift must be gone")
  assert.ok(!eventForm.includes("...tierSurgeToWire(t)"), "EventForm must not build surge keys on its own anymore")

  assert.ok(manage.includes('from "@/lib/business/ticket-tier-wire"'), "ManageSalesTickets must import the shared helper")
  const saveBody = manage.slice(manage.indexOf("function ticketSaveBody"), manage.indexOf("/**", manage.indexOf("function ticketSaveBody")))
  assert.ok(saveBody.includes("return ticketTierToWire("), "ticketSaveBody must delegate to the helper")
  assert.ok(saveBody.includes("persistMaxPerPerson(editing.max_per_person)"), "Manage keeps the 0 = unlimited cap helper")
  assert.ok(!saveBody.includes("parseInt(editing.quantity)"), "Manage must not hand-roll quantity anymore")
})
