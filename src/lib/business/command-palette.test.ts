import test from "node:test"
import assert from "node:assert/strict"
import {
  buildDealItems,
  buildEventItems,
  buildPageItems,
  dedupeItems,
  eventHint,
  filterPaletteItems,
  groupPaletteItems,
  isCommandPaletteHotkey,
  itemMatchesQuery,
  type PaletteItem,
  type PaletteNavContext,
} from "./command-palette.ts"

const hybrid: PaletteNavContext = {
  showDeals: true,
  showEvents: true,
  isPending: false,
  role: "owner",
  canViewPayouts: true,
}

function page(label: string, href = `/${label.toLowerCase()}`): PaletteItem {
  return { id: `page:${href}`, kind: "page", label, href, keywords: label }
}

test("⌘K / Ctrl+K is the palette toggle; other chords are ignored", () => {
  assert.equal(isCommandPaletteHotkey({ key: "k", metaKey: true, ctrlKey: false }), true)
  assert.equal(isCommandPaletteHotkey({ key: "K", metaKey: false, ctrlKey: true }), true)
  assert.equal(isCommandPaletteHotkey({ key: "k", metaKey: false, ctrlKey: false }), false)
  assert.equal(isCommandPaletteHotkey({ key: "k", metaKey: true, ctrlKey: false, altKey: true }), false)
  assert.equal(isCommandPaletteHotkey({ key: "k", metaKey: true, ctrlKey: false, repeat: true }), false)
  assert.equal(isCommandPaletteHotkey({ key: "Enter", metaKey: true, ctrlKey: false }), false)
})

test("page list follows mode, pending lock, and payouts access", () => {
  const ownerHybrid = buildPageItems(hybrid)
  assert.ok(ownerHybrid.some((item) => item.href === "/business/events"))
  assert.ok(ownerHybrid.some((item) => item.href === "/business/deals"))
  assert.ok(ownerHybrid.some((item) => item.href === "/business/payouts"))
  assert.ok(ownerHybrid.some((item) => item.href === "/business/help"))

  const dealsOnly = buildPageItems({ ...hybrid, showDeals: true, showEvents: false })
  assert.equal(dealsOnly.some((item) => item.href === "/business/events"), false)
  assert.equal(dealsOnly.some((item) => item.href === "/business/promo-codes"), false)
  assert.ok(dealsOnly.some((item) => item.href === "/business/deals"))

  const pending = buildPageItems({ ...hybrid, isPending: true })
  assert.equal(pending.some((item) => item.href === "/business/marketing"), false)
  assert.equal(pending.some((item) => item.href === "/business/analytics"), false)
  assert.equal(pending.some((item) => item.href === "/business/payouts"), false)
  assert.ok(pending.some((item) => item.href === "/business/events"))

  const staff = buildPageItems({
    ...hybrid,
    role: "staff",
    canViewPayouts: false,
  })
  assert.equal(staff.some((item) => item.href === "/business/payouts"), false)
})

test("query tokens must all match label, hint, or keywords", () => {
  const item: PaletteItem = {
    id: "event:1",
    kind: "event",
    label: "Friday Night",
    href: "/business/events/1",
    hint: "The Dungeon",
    keywords: "Friday Night The Dungeon published",
  }
  assert.equal(itemMatchesQuery(item, ""), true)
  assert.equal(itemMatchesQuery(item, "friday"), true)
  assert.equal(itemMatchesQuery(item, "dungeon"), true)
  assert.equal(itemMatchesQuery(item, "friday dungeon"), true)
  assert.equal(itemMatchesQuery(item, "escrow"), false)
})

test("empty query keeps every page but caps records; typed query returns all matches", () => {
  const pages = [page("Home", "/business"), page("Events", "/business/events")]
  const events = Array.from({ length: 12 }, (_, i) =>
    buildEventItems([{ event_id: i + 1, name: `Night ${i + 1}`, venue_name: "The Dungeon" }])[0],
  )
  const empty = filterPaletteItems([...pages, ...events], "")
  assert.equal(empty.filter((item) => item.kind === "page").length, 2)
  assert.equal(empty.filter((item) => item.kind === "event").length, 8)

  const typed = filterPaletteItems([...pages, ...events], "night 12")
  assert.deepEqual(typed.map((item) => item.label), ["Night 12"])
})

test("command palette does not list Weekly Cover nights or cancelled events", () => {
  assert.deepEqual(
    buildEventItems([
      { event_id: 774, name: "The Devil Dungeon Cover", product_kind: "weekly_cover", status: "published" },
      { event_id: 1, name: "Friday", status: "published" },
      { event_id: 2, name: "Cancelled show", status: "cancelled" },
    ]).map((item) => item.id),
    ["event:1"],
  )
})

test("command palette drops unstamped leftover nights of a host-ended series", () => {
  assert.deepEqual(
    buildEventItems(
      [
        {
          event_id: 774,
          name: "The Devil Dungeon Cover",
          access_kind: "event",
          recurring_series_id: 66,
          status: "published",
        },
        { event_id: 1, name: "Friday", status: "published" },
      ],
      [66],
    ).map((item) => item.id),
    ["event:1"],
  )
})

test("event and deal builders point at existing manage surfaces", () => {
  assert.deepEqual(buildEventItems([{ event_id: 9, name: "Escrow Test", venue_name: "The Dungeon", status: "draft" }]), [
    {
      id: "event:9",
      kind: "event",
      label: "Escrow Test",
      href: "/business/events/9",
      hint: "The Dungeon · Draft",
      keywords: "Escrow Test The Dungeon draft",
    },
  ])
  assert.equal(eventHint({ venue_name: "The Dungeon" }), "The Dungeon")
  assert.deepEqual(buildDealItems([{ id: 4, deal_title: "$5 wells", deal_category: "Drinks" }]), [
    {
      id: "deal:4",
      kind: "deal",
      label: "$5 wells",
      href: "/business/deals/4",
      hint: "Drinks",
      keywords: "$5 wells Drinks",
    },
  ])
})

test("dedupe and grouping keep pages, events, then deals", () => {
  const items: PaletteItem[] = [
    ...buildDealItems([{ id: 1, deal_title: "Wells" }]),
    ...buildEventItems([{ event_id: 2, name: "Friday" }]),
    page("Home", "/business"),
    ...buildEventItems([{ event_id: 2, name: "Friday" }]),
  ]
  const unique = dedupeItems(items)
  assert.equal(unique.filter((item) => item.id === "event:2").length, 1)
  assert.deepEqual(groupPaletteItems(unique).map((group) => group.label), ["Pages", "Events", "Deals"])
})
