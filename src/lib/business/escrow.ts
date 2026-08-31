// Business escrow — the TYPED CLIENT for the BE ledger read contract
// (BE_LEDGER_CONTRACT.md §7, frozen 2026-08-20). Same DI-B3w pattern as
// payouts.ts: this is the ONE FILE to touch when the real read lands — wire
// shapes and pure helpers live here, and every consumer imports from here,
// never a raw fetch.
//
// BE-D3: the stub seam is GONE. fetchEscrowPanelData() reads the real
// endpoint — services' GET /business/escrow, the §7 twin of core's BE-F route,
// reached through the dashboard's own proxy + cookie. The degrade rule it was
// built around still holds and is now the error path: anything other than a
// good §7 body returns null and the panel renders nothing — never an error
// wall, never a broken dashboard for the businesses that have no escrow.
//
// Contract rules this file enforces:
// - §7 wire shape verbatim; cents everywhere, formatting is the client's job.
// - A4: ONE NUMBER. Escrow credits are written settled and immediately
//   claimable; `pending_cents` stays in the wire shape but is NEVER rendered,
//   and there is no available/pending split anywhere in the UI.
// - §3: available_cents = SUM(amount_cents) of settled rows (reversals are
//   negative settled rows and reduce it). The fixtures are checked against
//   this identity in escrow.test.ts.
//
// Everything below fetchEscrowPanelData() is pure so the Node built-in test
// runner (`npm test`) can exercise it without resolving the api-client chain.

// The proxy base URL. Relative + explicit `.ts`, matching how escrow.test.ts
// imports this module: the Node test runner resolves neither the `@/` alias
// nor an extensionless specifier. api-url.ts has no imports of its own, so it
// costs the runner nothing — api-client.ts, which does pull the alias chain,
// stays lazy-loaded below.
import { getApiBaseUrl } from "../api-url.ts"

// ── Wire shapes (contract §7) ───────────────────────────────────────────────

export type EscrowEntryType =
  | "earning"
  | "withdrawal"
  | "withdrawal_fee"
  | "reversal"
  | "adjustment"

export type EscrowEntryStatus = "pending" | "settled" | "reversed" | "failed"

/** A7: line-skip credits carry `line_skip`, and BE-F serves both types in one
 *  history — an `order`-only list would show line-skip money in the balance
 *  but never in the entries. */
export type EscrowReferenceType = "order" | "payout" | "withdrawal" | "manual" | "line_skip"

export interface EscrowLedgerEntry {
  id: number
  entry_type: EscrowEntryType
  /** Signed integer CENTS: + credit, − debit. Never a float, never dollars. */
  amount_cents: number
  status: EscrowEntryStatus
  reference_type: EscrowReferenceType | null
  reference_id: number | null
  /** "YYYY-MM-DD HH:MM:SS", US/Eastern (platform DATETIME convention). */
  created_at: string
  /**
   * Event the sale belongs to. Optional on the §7 wire; present when services
   * joins the order. History groups by this, never by business name.
   */
  event_id: number | null
  event_name: string | null
  /**
   * Connect Transfer id when services attached one. Optional on the §7 wire;
   * used only to detect an in-flight payout (never rendered).
   */
  stripe_transfer_id: string | null
}

export interface EscrowSummary {
  available_cents: number
  /** In the §7 wire shape but UNUSED in v1 (amendment A4) — never rendered. */
  pending_cents: number
  currency: string
  entries: EscrowLedgerEntry[]
}

/** What the panel consumes. `summary` is §7 verbatim; the other two come from
 *  surfaces that already exist (BusinessProfile.stripe_connect_onboarded and
 *  the /me business name) once the stub is swapped for real reads. */
export interface EscrowPanelData {
  summary: EscrowSummary
  stripeOnboarded: boolean
  businessName: string | null
  /** Profile `business_id`. Used only to key the paid-banner 24h clock. */
  businessId: number | null
}

// ── Normalization (defensive: MySQL/JSON can serialize numbers as strings) ──

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : fallback
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  return s.length ? s : null
}

function positiveInt(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Read event identity from a ledger row. Services may send it flat
 *  (`event_name`) or nested (`event: { id, name }`). Never invent a name
 *  from the business. */
function eventFromRaw(raw: Partial<EscrowLedgerEntry> & { event?: unknown }): {
  event_id: number | null
  event_name: string | null
} {
  const nested = raw.event && typeof raw.event === "object" ? (raw.event as { id?: unknown; event_id?: unknown; name?: unknown }) : null
  const nestedId = nested?.id ?? nested?.event_id
  const eventId = raw.event_id ?? nestedId
  return {
    event_id: eventId == null ? null : num(eventId),
    event_name: strOrNull(raw.event_name) ?? strOrNull(nested?.name),
  }
}

export function normalizeEscrowEntry(raw: Partial<EscrowLedgerEntry> & { event?: unknown }): EscrowLedgerEntry {
  const event = eventFromRaw(raw)
  return {
    id: num(raw.id),
    entry_type: (raw.entry_type ?? "adjustment") as EscrowEntryType,
    amount_cents: num(raw.amount_cents),
    status: (raw.status ?? "settled") as EscrowEntryStatus,
    reference_type: raw.reference_type ?? null,
    reference_id: raw.reference_id == null ? null : num(raw.reference_id),
    created_at: raw.created_at ?? "",
    event_id: event.event_id,
    event_name: event.event_name,
    stripe_transfer_id: strOrNull(raw.stripe_transfer_id),
  }
}

export function normalizeEscrowSummary(raw: Partial<EscrowSummary> | null | undefined): EscrowSummary {
  return {
    available_cents: num(raw?.available_cents),
    pending_cents: num(raw?.pending_cents),
    currency: raw?.currency || "usd",
    entries: Array.isArray(raw?.entries) ? raw.entries.map(normalizeEscrowEntry) : [],
  }
}

// ── Panel state ─────────────────────────────────────────────────────────────

export type EscrowPanelState = "empty" | "claimable" | "ready" | "processing" | "in_transit" | "paid"

/** Stripe / Payouts money the Payments tab already shows. Display only. */
export interface PayoutsMoneyHint {
  in_transit_cents: number
  deposited_cents: number
}

function transferIdInFlight(e: EscrowLedgerEntry): boolean {
  const id = e.stripe_transfer_id?.trim()
  if (!id) return false
  return e.status !== "settled" && e.status !== "failed" && e.status !== "reversed"
}

/** A bank payout is actually moving: pending withdrawal or a Transfer in flight. */
export function hasInFlightEscrowPayout(summary: EscrowSummary): boolean {
  return summary.entries.some((e) => {
    if (e.entry_type !== "withdrawal") return false
    if (e.status === "pending") return true
    return transferIdInFlight(e)
  })
}

/**
 * - `processing`: a payout is actually moving — a pending withdrawal exists,
 *   or a `stripe_transfer_id` is in flight. Never inferred from onboarded +
 *   a leftover balance (that is a lie when Stripe+ledger have zero Transfers).
 * - `ready`: onboarded, money still held, no withdrawal/transfer yet. Hold
 *   until sent; do not claim it is on the way to the bank.
 * - `claimable`: settled money is waiting and Stripe isn't connected.
 * - `in_transit`: escrow cleared (or Payouts reports in-transit) but the
 *   money is not in the bank. Never "Paid" / "to your bank".
 * - `paid`: Payouts confirms a deposit and nothing is still in transit.
 */
export function deriveEscrowPanelState(
  summary: EscrowSummary,
  stripeOnboarded: boolean,
  payouts?: PayoutsMoneyHint | null,
): EscrowPanelState {
  if (hasInFlightEscrowPayout(summary)) return "processing"
  if (summary.available_cents > 0) return stripeOnboarded ? "ready" : "claimable"
  if (summary.entries.length === 0) return "empty"
  if (payouts && payouts.in_transit_cents > 0) return "in_transit"
  if (payouts && payouts.deposited_cents > 0) return "paid"
  if (summary.entries.some((e) => e.entry_type === "withdrawal" && e.status === "settled")) {
    // Escrow→Stripe is not a bank payout. Without a deposited hint, stay honest.
    return "in_transit"
  }
  return "empty"
}

/** The single hero number (A4): what is waiting, moving, or was paid out. */
export function escrowHeroCents(summary: EscrowSummary, state: EscrowPanelState): number {
  if (state === "processing" || state === "in_transit") {
    const pendingOut = summary.entries
      .filter((e) => e.entry_type === "withdrawal" && e.status === "pending")
      .reduce((sum, e) => sum + e.amount_cents, 0)
    if (pendingOut < 0) return -pendingOut
    const settledOut = summary.entries
      .filter((e) => e.entry_type === "withdrawal" && e.status === "settled")
      .reduce((sum, e) => sum + e.amount_cents, 0)
    if (settledOut < 0) return -settledOut
    return summary.available_cents
  }
  if (state === "paid") {
    const settledOut = summary.entries
      .filter((e) => e.entry_type === "withdrawal" && e.status === "settled")
      .reduce((sum, e) => sum + e.amount_cents, 0)
    return -settledOut
  }
  return summary.available_cents
}

// ── Display helpers (pure) ──────────────────────────────────────────────────

export function centsUsd(cents: number): string {
  const abs = Math.abs(cents)
  const s = `$${(abs / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return cents < 0 ? `−${s}` : s
}

/** Ledger-row amount: credits get an explicit +, debits a true minus sign. */
export function signedCentsUsd(cents: number): string {
  return cents > 0 ? `+${centsUsd(cents)}` : centsUsd(cents)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-08-20 19:04:11" → "Aug 20, 2026 · 7:04 PM ET". Pure string math —
 *  the value is already US/Eastern; parsing via Date() would re-interpret it
 *  in the viewer's zone. Falls back to the raw string on anything malformed. */
export function fmtEntryTimestamp(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s)
  if (!m) return s || "-"
  const [, y, mo, d, hh, mi] = m
  const month = MONTHS[Number(mo) - 1]
  if (!month) return s
  const h24 = Number(hh)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const ampm = h24 < 12 ? "AM" : "PM"
  return `${month} ${Number(d)}, ${y} · ${h12}:${mi} ${ampm} ET`
}

export interface EntryLabel {
  title: string
  reference: string | null
}

export function entryLabel(e: EscrowLedgerEntry): EntryLabel {
  const ref =
    e.reference_type === "order" && e.reference_id != null ? `Order #${e.reference_id}` : null
  switch (e.entry_type) {
    case "earning":
      return { title: "Ticket sale", reference: ref }
    case "reversal":
      return { title: "Refund", reference: ref }
    case "withdrawal":
      return { title: "Released from escrow", reference: null }
    case "withdrawal_fee":
      return { title: "Payout fee", reference: null }
    case "adjustment":
      return { title: "Adjustment", reference: ref }
  }
}

/** Row badge for anything that isn't quietly settled. */
export function entryStatusBadge(e: EscrowLedgerEntry): { label: string; variant: "warning" | "danger" | "neutral" } | null {
  if (e.status === "pending") return { label: "Processing", variant: "warning" }
  if (e.status === "failed") return { label: "Failed", variant: "danger" }
  if (e.status === "reversed") return { label: "Reversed", variant: "neutral" }
  return null
}

/** Long ledgers collapse to the newest few with an explicit "show all". */
export const ESCROW_ENTRIES_COLLAPSED = 5

export function visibleEscrowEntries(
  entries: EscrowLedgerEntry[],
  expanded: boolean,
): { rows: EscrowLedgerEntry[]; hiddenCount: number } {
  if (expanded || entries.length <= ESCROW_ENTRIES_COLLAPSED) {
    return { rows: entries, hiddenCount: 0 }
  }
  return {
    rows: entries.slice(0, ESCROW_ENTRIES_COLLAPSED),
    hiddenCount: entries.length - ESCROW_ENTRIES_COLLAPSED,
  }
}

/** One event's slice of the history list. `totalCents` is the sum of the
 *  already-shown row amounts in this group (display organization, not a
 *  new balance). */
export interface EscrowEventGroup {
  key: string
  eventId: number | null
  eventName: string
  totalCents: number
  entries: EscrowLedgerEntry[]
}

/** Fallback when a row has no event identity (payouts, fees, older wires).
 *  Deliberately not the business name. */
export const ESCROW_UNGROUPED_EVENT_NAME = "Other"

/**
 * Group ledger rows by event, preserving first-seen order (newest first on
 * the §7 list). Rows that share an event_id stay together even if the name
 * is missing; name-only rows group by that name. Ungrouped rows land in
 * Other, never under the business.
 */
export function groupEscrowEntriesByEvent(entries: EscrowLedgerEntry[]): EscrowEventGroup[] {
  const groups = new Map<string, EscrowEventGroup>()
  const order: string[] = []
  for (const entry of entries) {
    const name = entry.event_name?.trim() || null
    const key =
      entry.event_id != null
        ? `id:${entry.event_id}`
        : name
          ? `name:${name}`
          : "other"
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        eventId: entry.event_id,
        eventName: name ?? (entry.event_id != null ? `Event #${entry.event_id}` : ESCROW_UNGROUPED_EVENT_NAME),
        totalCents: 0,
        entries: [],
      }
      groups.set(key, group)
      order.push(key)
    } else if (!group.eventName || group.eventName.startsWith("Event #")) {
      if (name) group.eventName = name
    }
    group.entries.push(entry)
    group.totalCents += entry.amount_cents
  }
  return order.map((key) => groups.get(key)!)
}

// ── Demo fixtures ───────────────────────────────────────────────────────────
// Entirely fictional businesses, orders, and amounts. The claimable number
// mirrors the contract §7 example ($423.50) so the stub is recognizably "the
// contract, rendered". Each fixture satisfies the §3 identity
// available = Σ settled amount_cents (asserted in escrow.test.ts).

export type EscrowDemoScenario = "zero" | "claimable" | "processing" | "paid" | "long"

const EARNINGS: EscrowLedgerEntry[] = [
      { id: 5, entry_type: "earning", amount_cents: 12600, status: "settled", reference_type: "order", reference_id: 9975, created_at: "2026-08-19 22:41:07", event_id: 101, event_name: "Late Night", stripe_transfer_id: null },
  { id: 4, entry_type: "reversal", amount_cents: -1750, status: "settled", reference_type: "order", reference_id: 9942, created_at: "2026-08-16 10:12:55", event_id: 102, event_name: "Alumni Mixer", stripe_transfer_id: null },
  { id: 3, entry_type: "earning", amount_cents: 8750, status: "settled", reference_type: "order", reference_id: 9968, created_at: "2026-08-15 21:33:20", event_id: 101, event_name: "Late Night", stripe_transfer_id: null },
  { id: 2, entry_type: "earning", amount_cents: 1750, status: "settled", reference_type: "order", reference_id: 9942, created_at: "2026-08-14 20:05:44", event_id: 102, event_name: "Alumni Mixer", stripe_transfer_id: null },
  { id: 1, entry_type: "earning", amount_cents: 21000, status: "settled", reference_type: "order", reference_id: 9931, created_at: "2026-08-14 19:04:11", event_id: 102, event_name: "Alumni Mixer", stripe_transfer_id: null },
]
const EARNINGS_TOTAL = 42350

const LONG_EVENTS = [
  { id: 201, name: "Late Night" },
  { id: 202, name: "Alumni Mixer" },
  { id: 203, name: "Trivia Hour" },
] as const

/** ~30 rows of steady fictional sales for the layout-stress scenario. */
function longEntries(): { entries: EscrowLedgerEntry[]; total: number } {
  const entries: EscrowLedgerEntry[] = []
  let total = 0
  let id = 40
  for (let i = 0; i < 28; i++) {
    const day = 28 - i // Aug 28 back to Aug 1
    const amount = i % 9 === 4 ? -2250 : 4500 + (i % 5) * 1375
    const type: EscrowEntryType = amount < 0 ? "reversal" : "earning"
    const event = LONG_EVENTS[i % LONG_EVENTS.length]
    entries.push({
      id: id--,
      entry_type: type,
      amount_cents: amount,
      status: "settled",
      reference_type: "order",
      reference_id: 88000 + i * 7,
      created_at: `2026-08-${String(day).padStart(2, "0")} ${String(18 + (i % 5)).padStart(2, "0")}:${String(10 + (i % 47)).padStart(2, "0")}:00`,
      event_id: event.id,
      event_name: event.name,
      stripe_transfer_id: null,
    })
    total += amount
  }
  return { entries, total }
}
const LONG = longEntries()

export const ESCROW_DEMO_FIXTURES: Record<EscrowDemoScenario, EscrowPanelData> = {
  zero: {
    summary: { available_cents: 0, pending_cents: 0, currency: "usd", entries: [] },
    stripeOnboarded: false,
    businessName: "Sample Sandwich Shop",
    businessId: 9001,
  },
  claimable: {
    summary: { available_cents: EARNINGS_TOTAL, pending_cents: 0, currency: "usd", entries: EARNINGS },
    stripeOnboarded: false,
    businessName: "The Corner Tap",
    businessId: 9001,
  },
  processing: {
    summary: {
      available_cents: EARNINGS_TOTAL,
      pending_cents: 0,
      currency: "usd",
      entries: [
        { id: 6, entry_type: "withdrawal", amount_cents: -EARNINGS_TOTAL, status: "pending", reference_type: "payout", reference_id: 501, created_at: "2026-08-20 09:15:02", event_id: null, event_name: null, stripe_transfer_id: "tr_demo_pending" },
        ...EARNINGS,
      ],
    },
    stripeOnboarded: true,
    businessName: "The Corner Tap",
    businessId: 9001,
  },
  paid: {
    summary: {
      available_cents: 0,
      pending_cents: 0,
      currency: "usd",
      entries: [
        { id: 6, entry_type: "withdrawal", amount_cents: -EARNINGS_TOTAL, status: "settled", reference_type: "payout", reference_id: 501, created_at: "2026-08-20 09:15:02", event_id: null, event_name: null, stripe_transfer_id: "tr_demo_settled" },
        ...EARNINGS,
      ],
    },
    stripeOnboarded: true,
    businessName: "The Corner Tap",
    businessId: 9001,
  },
  long: {
    summary: { available_cents: LONG.total, pending_cents: 0, currency: "usd", entries: LONG.entries },
    stripeOnboarded: false,
    businessName: "The Fictional University Alumni Association Late-Night Waffle & Trivia Emporium at North Campus Commons",
    businessId: 9001,
  },
}

export function isEscrowDemoScenario(v: string | null | undefined): v is EscrowDemoScenario {
  return v != null && Object.prototype.hasOwnProperty.call(ESCROW_DEMO_FIXTURES, v)
}

// ── The data-access seam ────────────────────────────────────────────────────

/**
 * BE-D3 — the REAL read. The stub is gone: this now calls BE-F's
 * `GET /api/business/escrow` (contract §7, both reference types) and the
 * existing services profile read for the two non-ledger fields.
 *
 * NEVER THROWS, ALWAYS DEGRADES TO HIDDEN. Every failure — endpoint not
 * deployed (404), unauthenticated (401/403), network, malformed body — returns
 * null, and the panel renders nothing. This is load-bearing: escrow is a
 * minority feature living on the main dashboard, so a bad escrow response must
 * cost nothing to the businesses that have no escrow at all. A zero balance
 * degrades the same way via `deriveEscrowPanelState` → "empty".
 *
 * `demoScenario` (the ?escrow_demo= query param) still selects a fixture for
 * QA/screenshots, and is still honored only outside production builds. It is
 * now an explicit opt-in override of the real read rather than the default.
 */
export async function fetchEscrowPanelData(opts?: {
  demoScenario?: string | null
}): Promise<EscrowPanelData | null> {
  const requested = opts?.demoScenario
  if (process.env.NODE_ENV !== "production" && isEscrowDemoScenario(requested)) {
    const fixture = ESCROW_DEMO_FIXTURES[requested]
    return { ...fixture, summary: normalizeEscrowSummary(fixture.summary) }
  }

  const summary = await fetchEscrowSummary()
  if (!summary) return null

  // Only ask for the profile once there is money to show: the two extra fields
  // decide the CTA, and a business with an empty ledger never renders one.
  if (summary.available_cents === 0 && summary.entries.length === 0) return null

  const profile = await fetchEscrowProfile()

  return {
    summary,
    stripeOnboarded: profile?.stripe_connect_onboarded ?? false,
    businessName: profile?.name ?? null,
    businessId: profile?.business_id ?? null,
  }
}

/**
 * §7 balance + history from SERVICES — `GET /business/escrow`, through the same
 * `/api/proxy` path and the same `biz_token` cookie every other dashboard read
 * uses. Core serves the identical contract at `/api/business/escrow`, but that
 * one is `auth:sanctum` and the dashboard has no Sanctum credential, so it can
 * only ever 401 here. Services' twin needs nothing new from the client.
 *
 * A RAW fetch, not apiClient, and that is deliberate: apiClient turns a 401
 * into a silent refresh and then a hard redirect to /business/login. For a
 * panel whose whole contract is "self-hide on failure", borrowing that
 * behaviour would mean a broken escrow read could log the user out of the
 * dashboard — the exact opposite of degrading quietly. The base URL still
 * comes from getApiBaseUrl(), so the proxy path stays a single source of truth.
 */
async function fetchEscrowSummary(): Promise<EscrowSummary | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/business/escrow`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
    // 404 = not deployed yet. 401/403 = no session, or no active membership.
    // 5xx = broken. All of them mean the same thing to this panel: show nothing.
    if (!res.ok) return null

    const body = await res.json()
    if (!body || typeof body !== "object") return null
    return normalizeEscrowSummary(body as Partial<EscrowSummary>)
  } catch {
    return null
  }
}

/** Business name + Stripe state from the services profile the dashboard already reads. */
async function fetchEscrowProfile(): Promise<{
  name: string | null
  stripe_connect_onboarded: boolean
  business_id: number | null
} | null> {
  try {
    const { apiClient } = await import("./api-client")
    const profile = await apiClient.get<{
      name?: string
      stripe_connect_onboarded?: boolean
      business_id?: unknown
    }>("/business/profile")
    return {
      name: profile?.name ?? null,
      stripe_connect_onboarded: profile?.stripe_connect_onboarded === true,
      business_id: positiveInt(profile?.business_id),
    }
  } catch {
    // The panel is still worth rendering without it: `stripeOnboarded: false`
    // is the conservative read (shows "claim" rather than "ready"), and
    // the name is decorative.
    return null
  }
}
