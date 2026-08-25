/**
 * Weekly Cover's per-weekday / per-date pricing layer for the dashboard.
 *
 * WHY THIS FILE EXISTS. Until now the dashboard's Weekly Cover wizard wrote one
 * `template_tickets` list and nothing else: a single price for every night of
 * every weekday, forever. The app has shipped a per-weekday and per-date model
 * for a while (`lib/pages/main/host/series/night_edit.dart`), and the two
 * clients therefore wrote different documents to the same endpoints. This is the
 * dashboard's half of closing that.
 *
 * THE THING THAT FORCED THE SHAPE. Surge cannot live on a program template.
 * `parseSurgeIntent` is called from exactly two places in services — the
 * per-night tier override upsert, and `assertNightEditSurge`, which validates
 * `weekday_edits` / `date_edits` — and never on `template_tickets`. Surge is
 * stored on `door_access_tier_overrides.surge_steps` (svc migration 033). So
 * "add surge to the dashboard" and "add a per-weekday layer to the dashboard"
 * are not two tasks; the override rows are the only place a ladder can go.
 *
 * WIRE RULES THAT ARE NOT NEGOTIABLE, each one a bug someone already paid for:
 *
 *   1. `flyer_image_url` is OMITTED when a night is inheriting, carries a URL
 *      when the night has its own, and is an explicit `null` only when the host
 *      removed one. Services' `extractNightFlyer` reads `hasOwnProperty`, so an
 *      unconditional `flyer_image_url: null` on a night write REMOVES the
 *      artwork from every night the host had customised. See `nightToWire`.
 *
 *   2. Surge WRITES `{after_sold, price_usd}` and READS
 *      `{threshold_sold, price_cents, price_usd}`. Services normalises the
 *      write (`thresholdFromStep` accepts either) but stores and echoes the
 *      second shape. Reading only `after_sold` silently resets every ladder to
 *      the default. See `surgeStepsFromWire`.
 *
 *   3. `template_tickets` must carry REAL prices, derived from the first
 *      configured night — not the $0 placeholders the product pick seeds. Every
 *      night inherits the template, so if a per-night override ever fails to
 *      apply the program must still sell at a real price instead of free. See
 *      `templateTicketsFromNights`.
 *
 *   4. Tier keys are `cover` / `skip`, matching what the app sends, so a
 *      program built on either client binds its overrides to the same rows.
 *      Per-day inventions (`cover-wed`) are what 400s a night write.
 *
 *   5. WEEKDAY TEMPLATE vs CUSTOM (Luke, 2026-08-25). A Thursday slot set at
 *      create/edit — tickets, prices, doors, capacity, AND flyer — is the
 *      weekday template. Every future Thursday gets that full setup.
 *      Flyer-only on the Thursday slot is a fail. Custom is a later edit of
 *      one date. Series/program save must not send that night's local fields
 *      as if they should be restamped onto it, and must not seed the Thursday
 *      template from a Custom night.
 *
 * Everything here is pure. No fetch, no React — the wizard and the tests both
 * drive it.
 */

import type { DoorAccessNight, DoorAccessProgram, DoorAccessTemplateTier } from "./door-access"
import type { RecurringTemplateTicket } from "./types"

// ── Products ────────────────────────────────────────────────────────────────

/** What a Weekly Cover program sells. Picked first; seeds the tiers. */
export const WC_PRODUCTS = ["cover", "skip", "both"] as const
export type WcProducts = (typeof WC_PRODUCTS)[number]

export type NightTierKind = "cover" | "skip"

export const WC_PRODUCT_COPY: Record<WcProducts, { title: string; blurb: string }> = {
  cover: { title: "Weekly Cover", blurb: "Entry to the bar, sold ahead. The classic." },
  skip: { title: "Skip the Line", blurb: "Straight past the door line. Cover can be included." },
  both: { title: "Both", blurb: "Cover and Skip the Line, priced per night." },
}

/**
 * Program name the app derives. The dashboard never asks for one on create —
 * Flutter writes `{Venue} Cover` and `date_range_end: null`.
 */
export function derivedWeeklyCoverName(venueName: string | null | undefined): string {
  const venue = (venueName ?? "").trim()
  return venue === "" ? "Weekly Cover" : `${venue} Cover`
}

/**
 * Program name for a Weekly Cover write.
 *
 * CREATE always derives `{Venue} Cover`. A typed leftover, a clone's source
 * name, or `initialData.name` must not win. EDIT keeps the saved name (the app
 * does not re-derive or show a name field on Sell/Days).
 */
export function weeklyCoverProgramName(opts: {
  isEdit: boolean
  venueName?: string | null
  existingName?: string | null
}): string {
  if (opts.isEdit) {
    const existing = (opts.existingName ?? "").trim()
    if (existing !== "") return existing
  }
  return derivedWeeklyCoverName(opts.venueName)
}

/** CREATE sends null. EDIT keeps whatever is already saved. */
export function weeklyCoverProgramDescription(opts: {
  isEdit: boolean
  existingDescription?: string | null
}): string | null {
  if (!opts.isEdit) return null
  if (opts.existingDescription == null) return null
  const trimmed = String(opts.existingDescription).trim()
  return trimmed === "" ? null : trimmed
}

/** Flutter days-step title, specialized when they picked only one product. */
export function daysQuestion(products: WcProducts | null): string {
  if (products === "cover") return "What days do you have cover?"
  if (products === "skip") return "What days do you have skip the line?"
  return "What days do you have cover or skip the line?"
}

/**
 * Unset night-row subtitle. Flutter shows the $0 placeholders so the host
 * sees what they still owe, not a blank "set this up" line.
 */
export function nightUnsetSubtitle(products: WcProducts | null): string {
  if (products === "skip") return "Set doors open & close / Skip $0"
  if (products === "cover") return "Set doors open & close / Cover $0"
  return "Set doors open & close / Cover $0 / Skip $0"
}

/**
 * Flutter WC create numbers screens 1-9. We skip 1 (venue picker: the
 * dashboard is already scoped) and the create-funnel choice lives on
 * `/business/create`. The wizard is screens 2-9. A pink bar fills to
 * `step / 9`.
 *
 *   2 Sell · 3 Days · 4 Nights list · 5 Prices editor · 6 Copy + continue
 *   7 Calendar · 8 Door / promoter · 9 Review
 */
export function flutterWizardStep(opts: {
  wizardIndex: number
  editorOpen?: boolean
  nightsSaved?: number
}): number {
  switch (opts.wizardIndex) {
    case 0:
      return 2
    case 1:
      return 3
    case 2:
      if (opts.editorOpen) return 5
      if ((opts.nightsSaved ?? 0) > 0) return 6
      return 4
    case 3:
      return 7
    case 4:
      return 8
    default:
      return 9
  }
}

/** Host-facing label for the nights, by product. Drives the day cards. */
export function nightLabelFor(products: WcProducts | null): string {
  if (products === "skip") return "Skip the Line"
  if (products === "both") return "Cover & Skip the Line"
  return "Cover"
}

/** "cover" / "skip the line" / "cover or skip the line" — for question copy. */
export function productsPhrase(products: WcProducts | null): string {
  if (products === "cover") return "cover"
  if (products === "skip") return "skip the line"
  return "cover or skip the line"
}

/**
 * The canonical tier key for a kind — byte-identical to the app's
 * `canonicalDoorAccessTierKey`. Services reconciles `skip` with
 * `skip-the-line` through `normalizeTierKind`, so `skip` is safe and is what
 * the app already writes.
 */
export function canonicalTierKey(kind: NightTierKind): string {
  return kind === "skip" ? "skip" : "cover"
}

/** Per-day and timestamp keys a client minted. These must never reach the wire. */
const CLIENT_INVENTED_KEY =
  /^(cover|skip)-(\d+|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i

export function looksClientInventedTierKey(key: string | null | undefined): boolean {
  const trimmed = (key ?? "").trim()
  return trimmed !== "" && CLIENT_INVENTED_KEY.test(trimmed)
}

/** A stored key we can keep, or the canonical one for this kind. */
export function resolveTierKey(kind: NightTierKind, stored?: string | null): string {
  const trimmed = (stored ?? "").trim()
  if (trimmed !== "" && !looksClientInventedTierKey(trimmed)) return trimmed
  return canonicalTierKey(kind)
}

const SKIP_NAME = /skip|line/i

/** A tier's kind, from an explicit `kind` when present, else its name. */
export function tierKindFrom(kind: unknown, name?: unknown): NightTierKind {
  const raw = String(kind ?? "").trim().toLowerCase()
  if (raw !== "") {
    if (raw === "cover") return "cover"
    if (raw.includes("skip") || raw.includes("line")) return "skip"
  }
  return SKIP_NAME.test(String(name ?? "")) ? "skip" : "cover"
}

export function defaultTierName(kind: NightTierKind): string {
  return kind === "skip" ? "Skip the Line" : "Cover"
}

/** The default blurb for a Weekly Cover tier. Says what a guest is buying. */
export function defaultTierDescription(opts: {
  kind: NightTierKind
  includesCover: boolean
  venueName?: string
  dayName?: string
}): string {
  const venue = (opts.venueName ?? "").trim()
  const at = venue === "" ? "" : ` at ${venue}`
  const on = opts.dayName ? ` on ${opts.dayName}s` : ""
  if (opts.kind !== "skip") return `Cover${at}${on}. Grants entry.`
  return opts.includesCover
    ? `Skip the line${at}${on}. Cover included.`
    : `Skip the line${at}${on}. Cover not included, paid separately.`
}

// ── Drafts ──────────────────────────────────────────────────────────────────

/**
 * One rung of a surge ladder, as the form holds it. Text inputs, like
 * `RecurringTierRow`, so a half-typed number is never coerced to 0 mid-keystroke.
 */
export interface SurgeStepDraft {
  afterSoldInput: string
  priceInput: string
}

export interface NightTierDraft {
  /** Present once the server has minted one. Round-tripped untouched. */
  tier_key?: string
  kind: NightTierKind
  name: string
  description: string
  priceInput: string
  quantityInput: string
  maxPerPersonInput: string
  /** This tier is off for this night. Not the same as the night being closed. */
  is_disabled: boolean
  /** Skip tiers only: buying it also gets them in. */
  includes_cover: boolean
  /** Per-tier 21+. Any 21+ tier lights the night's badge, matching the app. */
  is_21_plus: boolean
  surge_enabled: boolean
  surge: SurgeStepDraft[]
  valid_from_time: string
  valid_until_time: string
  valid_from_day_offset: number
  valid_until_day_offset: number
}

/**
 * One night's configuration — a weekday template or a single game-day date.
 *
 * FLYER PROVENANCE, the part that is easy to get wrong. `flyerImageUrl` is this
 * night's OWN artwork and the only one that ever reaches the wire.
 * `inheritedFlyerUrl` is what the night currently shows while it has none (the
 * program flyer, or the venue photo standing in) — display only. `flyerRemoved`
 * is the host having cleared an own flyer, the one case that sends an explicit
 * null.
 */
export interface NightDraft {
  startTime: string
  endTime: string
  is21Plus: boolean
  isClosed: boolean
  flyerImageUrl: string
  flyerRemoved: boolean
  inheritedFlyerUrl: string
  tiers: NightTierDraft[]
}

export const EMPTY_SURGE_STEP: SurgeStepDraft = { afterSoldInput: "10", priceInput: "" }

export function emptyTier(kind: NightTierKind): NightTierDraft {
  return {
    kind,
    name: defaultTierName(kind),
    description: "",
    priceInput: "",
    quantityInput: "0",
    maxPerPersonInput: "0",
    is_disabled: false,
    includes_cover: kind === "skip",
    is_21_plus: false,
    surge_enabled: false,
    surge: [],
    valid_from_time: "",
    valid_until_time: "",
    valid_from_day_offset: 0,
    valid_until_day_offset: 0,
  }
}

/** The tiers a product choice starts with. Mirrors `seedWcTiersFromProducts`. */
export function seedTiersForProducts(products: WcProducts): NightTierDraft[] {
  const out: NightTierDraft[] = []
  if (products !== "skip") out.push(emptyTier("cover"))
  if (products !== "cover") out.push(emptyTier("skip"))
  return out
}

/**
 * A fresh night, seeded from the program-wide defaults.
 *
 * The program flyer arrives as INHERITED, never as the night's own — seeding it
 * as own is what made every save post the template's flyer back as a per-night
 * override, pinning it onto every night and blocking later program artwork edits.
 */
export function seedNightDraft(opts: {
  products: WcProducts | null
  startTime: string
  endTime: string
  is21Plus?: boolean
  inheritedFlyerUrl?: string
  venueName?: string
  dayName?: string
}): NightDraft {
  const tiers = seedTiersForProducts(opts.products ?? "cover")
  for (const tier of tiers) {
    tier.description = defaultTierDescription({
      kind: tier.kind,
      includesCover: tier.includes_cover,
      venueName: opts.venueName,
      dayName: opts.dayName,
    })
  }
  return {
    startTime: opts.startTime,
    endTime: opts.endTime,
    is21Plus: !!opts.is21Plus,
    isClosed: false,
    flyerImageUrl: "",
    flyerRemoved: false,
    inheritedFlyerUrl: opts.inheritedFlyerUrl ?? "",
    tiers,
  }
}

export function cloneNightDraft(draft: NightDraft): NightDraft {
  return {
    ...draft,
    tiers: draft.tiers.map((t) => ({ ...t, surge: t.surge.map((s) => ({ ...s })) })),
  }
}

/**
 * Copy one weekday's setup onto another, re-seeding the day-specific blurbs so
 * "Thursday Cover" becomes "Friday". Prices, hours, surge and 21+ come across
 * untouched; artwork does not — a flyer is chosen for a night, not inherited
 * sideways from one.
 */
export function copyNightToDay(
  source: NightDraft,
  opts: { venueName?: string; dayName?: string }
): NightDraft {
  const next = cloneNightDraft(source)
  next.flyerImageUrl = ""
  next.flyerRemoved = false
  for (const tier of next.tiers) {
    tier.description = defaultTierDescription({
      kind: tier.kind,
      includesCover: tier.includes_cover,
      venueName: opts.venueName,
      dayName: opts.dayName,
    })
  }
  return next
}

// ── Numbers ─────────────────────────────────────────────────────────────────

export function parsePrice(input: string): number {
  const n = parseFloat(input)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** 0 = unlimited on both paths. A blank or junk value is unlimited, not an error. */
export function parseCount(input: string): number {
  const n = parseInt(input, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function parseThreshold(input: string): number {
  const n = parseInt(input, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// ── Wire: writes ────────────────────────────────────────────────────────────

export interface SurgeStepWire {
  after_sold: number
  price_usd: number
}

/**
 * The surge ladder as services takes it on a write. `after_sold` is accepted by
 * `thresholdFromStep` alongside `threshold_sold`; sending the app's spelling
 * keeps one shape on the wire for both clients.
 */
export function surgeStepsToWire(tier: NightTierDraft): SurgeStepWire[] {
  if (!tier.surge_enabled) return []
  return tier.surge
    .map((step) => ({
      after_sold: parseThreshold(step.afterSoldInput),
      price_usd: parsePrice(step.priceInput),
    }))
    .filter((step) => step.after_sold > 0 && step.price_usd > 0)
}

export interface NightTierWire {
  tier_key: string
  name: string
  description: string | null
  price_usd: number
  quantity: number
  max_per_person: number
  is_disabled: boolean
  kind: NightTierKind
  includes_cover: boolean
  ticket_type: "paid" | "free"
  surge_enabled: boolean
  surge_steps: SurgeStepWire[]
  valid_from_time: string | null
  valid_until_time: string | null
  valid_from_day_offset: number
  valid_until_day_offset: number
}

export function tierToWire(tier: NightTierDraft): NightTierWire {
  const price = parsePrice(tier.priceInput)
  const steps = surgeStepsToWire(tier)
  const hasWindow = tier.valid_from_time !== "" || tier.valid_until_time !== ""
  const description = tier.description.trim()
  return {
    tier_key: resolveTierKey(tier.kind, tier.tier_key),
    name: tier.name.trim() || defaultTierName(tier.kind),
    description: description === "" ? null : description,
    price_usd: price,
    quantity: parseCount(tier.quantityInput),
    max_per_person: parseCount(tier.maxPerPersonInput),
    is_disabled: tier.is_disabled,
    kind: tier.kind,
    includes_cover: tier.kind === "skip" && tier.includes_cover,
    ticket_type: price > 0 ? "paid" : "free",
    // Surge off must travel as an explicit empty list, not an omission: that is
    // how `parseSurgeIntent` is told to clear a stored ladder rather than leave
    // it in place. `surge_enabled: false` says the same thing; both are sent.
    surge_enabled: steps.length > 0,
    surge_steps: steps,
    valid_from_time: hasWindow && tier.valid_from_time !== "" ? tier.valid_from_time : null,
    valid_until_time: hasWindow && tier.valid_until_time !== "" ? tier.valid_until_time : null,
    valid_from_day_offset: tier.valid_from_time !== "" ? tier.valid_from_day_offset : 0,
    valid_until_day_offset: tier.valid_until_time !== "" ? tier.valid_until_day_offset : 0,
  }
}

/**
 * One night write — the value of a `date_edits[date]` entry, and the body of
 * `PUT …/nights/:date`. Weekday templates use `weekdayTemplateToWire` instead.
 *
 * Sparse on purpose: an omitted field is left alone. The one field that must
 * never be sent speculatively is `flyer_image_url` — see rule 1 at the top.
 */
export function nightToWire(draft: NightDraft): Record<string, unknown> {
  const own = draft.flyerImageUrl.trim()
  const body: Record<string, unknown> = {
    is_closed: draft.isClosed,
    is_21_plus: draft.is21Plus || draft.tiers.some((t) => !t.is_disabled && t.is_21_plus),
  }
  if (draft.startTime !== "") body.start_time = draft.startTime
  if (draft.endTime !== "") body.end_time = draft.endTime
  if (draft.tiers.length > 0) body.tiers = draft.tiers.map(tierToWire)

  // Own flyer → the URL. Removed → explicit null. Inheriting → the key is not
  // here at all, so `extractNightFlyer` reads `mentioned: false`.
  if (own !== "") body.flyer_image_url = own
  else if (draft.flyerRemoved) body.flyer_image_url = null

  return body
}

/**
 * The Thursday (etc.) weekday template: tickets, prices, doors, capacity, and
 * flyer. Every future Thursday gets this full setup. Sending only a flyer on
 * the slot is a fail — doors and tiers always travel with it.
 */
export function weekdayTemplateToWire(draft: NightDraft): Record<string, unknown> {
  const own = draft.flyerImageUrl.trim()
  const body: Record<string, unknown> = {
    is_closed: draft.isClosed,
    is_21_plus: draft.is21Plus || draft.tiers.some((t) => !t.is_disabled && t.is_21_plus),
    start_time: draft.startTime,
    end_time: draft.endTime,
    tiers: draft.tiers.map(tierToWire),
  }
  if (own !== "") body.flyer_image_url = own
  else if (draft.flyerRemoved) body.flyer_image_url = null
  return body
}

/** `weekday_edits` — ISO weekday (as a string key) → full weekday template. */
export function weekdayEditsToWire(
  edits: Record<number, NightDraft>,
  daysOfWeek: number[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const day of [...daysOfWeek].sort((a, b) => a - b)) {
    const draft = edits[day]
    if (!draft) continue
    out[String(day)] = weekdayTemplateToWire(draft)
  }
  return out
}

/**
 * `date_edits` — Y-m-d → night write.
 *
 * Off-schedule dates are dropped rather than sent: services 400s a
 * `date_edits` key that is not a scheduled night, and one bad date would take
 * the whole create down with it. The calendar already refuses to open them, so
 * this is the belt to that braces.
 */
export function dateEditsToWire(
  edits: Record<string, NightDraft>,
  daysOfWeek: number[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const date of Object.keys(edits).sort()) {
    const weekday = isoWeekdayOfDate(date)
    if (weekday == null || !daysOfWeek.includes(weekday)) continue
    out[date] = nightToWire(edits[date])
  }
  return out
}

/**
 * `template_tickets`, derived from the first configured night.
 *
 * Rule 3 at the top of this file: the template is what every night inherits, so
 * it has to carry real prices. Taking the product pick's $0 placeholders instead
 * means one failed override sells the door for free.
 *
 * Disabled tiers are left out — a tier that is off on the first night is not the
 * program's shape. If nothing is configured yet, the seeded placeholders stand
 * in so the payload is still well-formed for `validate-step`.
 */
export function templateTicketsFromNights(opts: {
  daysOfWeek: number[]
  weekdayEdits: Record<number, NightDraft>
  fallbackTiers: NightTierDraft[]
}): RecurringTemplateTicket[] {
  const source = firstConfiguredNight(opts.daysOfWeek, opts.weekdayEdits)
  const tiers = source
    ? source.tiers.filter((t) => !t.is_disabled)
    : opts.fallbackTiers.filter((t) => !t.is_disabled)
  const usable = tiers.length > 0 ? tiers : opts.fallbackTiers
  return usable.map((tier, i) => {
    const wire = tierToWire(tier)
    return {
      tier_key: wire.tier_key,
      name: wire.name,
      description: wire.description,
      price_usd: wire.price_usd,
      quantity: wire.quantity,
      max_per_person: wire.max_per_person,
      ticket_type: wire.ticket_type,
      is_hidden: 0,
      sort_order: i + 1,
      valid_from_time: wire.valid_from_time,
      valid_until_time: wire.valid_until_time,
      valid_from_day_offset: wire.valid_from_day_offset,
      valid_until_day_offset: wire.valid_until_day_offset,
    }
  })
}

/** The first picked weekday that has at least one live tier. */
export function firstConfiguredNight(
  daysOfWeek: number[],
  weekdayEdits: Record<number, NightDraft>
): NightDraft | null {
  for (const day of [...daysOfWeek].sort((a, b) => a - b)) {
    const draft = weekdayEdits[day]
    if (!draft) continue
    if (draft.isClosed) continue
    if (draft.tiers.some((t) => !t.is_disabled)) return draft
  }
  return null
}

// ── The promoter gate ───────────────────────────────────────────────────────

/**
 * Every paid price this draft can charge.
 *
 * Deliberately the same universe services counts in `paidPricesFromNightEdits`:
 * template tiers, plus each weekday's and each picked date's, plus every surge
 * rung. A narrower answer here refuses the host locally and the payload's prices
 * never get the chance to be read — which is exactly the "my program is priced
 * but the promoter toggle says it is free" bug. A closed night sells nothing and
 * a disabled tier is not on sale, so neither is evidence that the program charges.
 */
export function paidPricesFromDraft(opts: {
  templateTickets: RecurringTemplateTicket[]
  weekdayEdits: Record<number, NightDraft>
  dateEdits: Record<string, NightDraft>
}): number[] {
  const out: number[] = []
  for (const tier of opts.templateTickets) {
    if ((tier.price_usd ?? 0) > 0) out.push(tier.price_usd)
  }
  const nights = [...Object.values(opts.weekdayEdits), ...Object.values(opts.dateEdits)]
  for (const night of nights) {
    if (night.isClosed) continue
    for (const tier of night.tiers) {
      if (tier.is_disabled) continue
      const price = parsePrice(tier.priceInput)
      if (price > 0) out.push(price)
      for (const step of surgeStepsToWire(tier)) out.push(step.price_usd)
    }
  }
  return out
}

export function hasPaidPrice(prices: number[]): boolean {
  return prices.length > 0
}

/** Cheapest paid price anywhere — the cap on a fixed promoter commission. */
export function cheapestPaidPrice(prices: number[]): number | null {
  if (prices.length === 0) return null
  return prices.reduce((a, b) => (a < b ? a : b))
}

// ── Wire: reads ─────────────────────────────────────────────────────────────

function numOf(raw: unknown, fallback = 0): number {
  const n = typeof raw === "string" ? Number(raw) : raw
  return typeof n === "number" && Number.isFinite(n) ? n : fallback
}

function truthy(raw: unknown): boolean {
  return raw === true || raw === 1 || raw === "1" || raw === "true"
}

/**
 * READ SHAPE ≠ WRITE SHAPE — rule 2 at the top of this file.
 *
 * We send `{after_sold, price_usd}`; services stores and echoes
 * `{threshold_sold, price_cents, price_usd}` (svc migration 033). Reading only
 * `after_sold` falls to the default, so a ladder saved as "after 7 sold"
 * re-opens as "after 10 sold" — the price is right and the threshold is quietly
 * wrong, which is the worst version of this bug.
 */
export function surgeStepsFromWire(raw: unknown): SurgeStepDraft[] {
  if (!Array.isArray(raw)) return []
  const out: SurgeStepDraft[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const step = item as Record<string, unknown>
    const threshold = step.after_sold ?? step.threshold_sold ?? step.after_this_sells
    const cents = step.price_cents == null ? null : numOf(step.price_cents, NaN)
    const usd =
      step.price_usd != null
        ? numOf(step.price_usd)
        : cents != null && Number.isFinite(cents)
          ? cents / 100
          : 0
    const after = numOf(threshold, 0)
    if (after <= 0 && usd <= 0) continue
    out.push({
      afterSoldInput: String(after > 0 ? after : 10),
      priceInput: usd > 0 ? trimMoney(usd) : "",
    })
  }
  return out
}

/** "10" not "10.00"; "12.50" stays. Keeps a round price from looking typed-over. */
export function trimMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

/** "HH:MM:SS" → "HH:MM" for a time input. Blank stays blank. */
export function toTimeValue(raw: unknown): string {
  const s = String(raw ?? "").trim()
  if (s === "") return ""
  return s.slice(0, 5)
}

/** One tier from a served night or template row. */
export function tierFromWire(raw: Record<string, unknown>): NightTierDraft {
  const kind = tierKindFrom(raw.kind, raw.name)
  const steps = surgeStepsFromWire(raw.surge_steps)
  const price = numOf(raw.price_usd)
  const from = toTimeValue(raw.valid_from_time)
  const until = toTimeValue(raw.valid_until_time)
  return {
    tier_key: typeof raw.tier_key === "string" && raw.tier_key.trim() !== "" ? raw.tier_key : undefined,
    kind,
    name: String(raw.name ?? "").trim() || defaultTierName(kind),
    description: raw.description == null ? "" : String(raw.description),
    priceInput: price > 0 ? trimMoney(price) : "",
    quantityInput: String(numOf(raw.quantity)),
    maxPerPersonInput: String(numOf(raw.max_per_person)),
    is_disabled: truthy(raw.is_disabled) || truthy(raw.disabled),
    includes_cover: kind === "skip" ? raw.includes_cover == null || truthy(raw.includes_cover) : false,
    is_21_plus: truthy(raw.is_21_plus),
    // A ladder that came back is on, whatever the flag says — Laravel and MySQL
    // both hand booleans back as 1/0 and `=== true` would drop a real ladder.
    surge_enabled: truthy(raw.surge_enabled) || steps.length > 0,
    surge: steps,
    valid_from_time: from,
    valid_until_time: until,
    valid_from_day_offset: numOf(raw.valid_from_day_offset),
    valid_until_day_offset: numOf(raw.valid_until_day_offset),
  }
}

/** Surge waves stamped as extra `…-surge-N` tickets fold back onto their parent. */
export function collapseTiers(tiers: NightTierDraft[]): NightTierDraft[] {
  const parents: NightTierDraft[] = []
  const extras: NightTierDraft[] = []
  for (const tier of tiers) {
    if (tier.tier_key && tier.tier_key.includes("-surge-") && !tier.surge_enabled) extras.push(tier)
    else parents.push(tier)
  }
  for (const extra of extras) {
    const parentKey = extra.tier_key!.split("-surge-")[0]
    const parent =
      parents.find((p) => p.tier_key === parentKey) ?? parents.find((p) => p.name === extra.name)
    if (!parent) {
      parents.push(extra)
      continue
    }
    parent.surge_enabled = true
    parent.surge.push({
      afterSoldInput: parent.quantityInput,
      priceInput: extra.priceInput,
    })
  }
  return parents
}

/**
 * This night's OWN flyer, if it has one.
 *
 * `flyer_image_url` on a served night is the RESOLVED artwork — night, then
 * program, then venue photo — so reading it directly treats an inherited image
 * as the night's own and makes every save stamp it back as an override. An
 * explicit `flyer_image_url_override` is the only unambiguous signal; failing
 * that, a resolved URL that differs from what the program and venue offer is
 * this night's own.
 *
 * Date-local Custom editors use this. Weekday templates use
 * `weekdayTemplateFlyer` — a Thursday poster that matches the program flyer
 * is still the Thursday slot's flyer and must be sent on that slot.
 */
export function nightOwnFlyer(
  night: Record<string, unknown>,
  program?: { flyer_image_url?: string | null; photo_url?: string | null } | null
): string {
  const override = String(night.flyer_image_url_override ?? "").trim()
  if (override !== "") return override
  const resolved = String(night.flyer_image_url ?? "").trim()
  if (resolved === "") return ""
  const programFlyer = String(program?.flyer_image_url ?? "").trim()
  const venuePhoto = String(program?.photo_url ?? "").trim()
  if (resolved === programFlyer || resolved === venuePhoto) return ""
  return resolved
}

/**
 * The flyer that belongs on a WEEKDAY template slot.
 *
 * A Thursday poster set at create often equals the program flyer (the first
 * night is Thursday). Treating that match as "inherited" would omit
 * `flyer_image_url` on the Thursday slot on the next edit save, and future
 * Thursdays would lose the poster. Venue photo is still display-only.
 */
export function weekdayTemplateFlyer(
  night: Record<string, unknown>,
  program?: { flyer_image_url?: string | null; photo_url?: string | null } | null
): string {
  const override = String(night.flyer_image_url_override ?? "").trim()
  if (override !== "") return override
  const resolved = String(night.flyer_image_url ?? "").trim()
  if (resolved === "") return ""
  const venuePhoto = String(program?.photo_url ?? "").trim()
  if (resolved === venuePhoto) return ""
  return resolved
}

/** Hydrate a night editor from a night the server returned. */
export function nightDraftFromWire(
  night: DoorAccessNight & Record<string, unknown>,
  program: DoorAccessProgram
): NightDraft {
  const rawTiers = Array.isArray((night as Record<string, unknown>).tiers)
    ? ((night as Record<string, unknown>).tiers as unknown[])
    : []
  const tiers = collapseTiers(
    rawTiers
      .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
      .map(tierFromWire)
  )
  return {
    startTime: toTimeValue(night.start_time) || toTimeValue(program.start_time),
    endTime: toTimeValue(night.end_time) || toTimeValue(program.end_time),
    is21Plus: truthy((night as Record<string, unknown>).is_21_plus) || program.is_21_plus,
    isClosed: !!night.is_closed,
    flyerImageUrl: nightOwnFlyer(night as Record<string, unknown>, program),
    flyerRemoved: false,
    inheritedFlyerUrl: String(program.flyer_image_url ?? program.photo_url ?? ""),
    tiers: tiers.length > 0 ? tiers : templateTiersToDrafts(program.template_tickets),
  }
}

/**
 * Weekday-editor draft. Same as a night draft except the flyer is the weekday
 * template poster — including when it matches the program flyer.
 */
export function weekdayDraftFromWire(
  night: DoorAccessNight & Record<string, unknown>,
  program: DoorAccessProgram
): NightDraft {
  return {
    ...nightDraftFromWire(night, program),
    flyerImageUrl: weekdayTemplateFlyer(night, program),
  }
}

/** Program template rows as editor drafts — the fallback when a night has none. */
export function templateTiersToDrafts(template: DoorAccessTemplateTier[]): NightTierDraft[] {
  return [...template]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((t) => tierFromWire(t as unknown as Record<string, unknown>))
}

/** Which product a saved program is selling, read back off its tiers. */
export function productsFromTiers(tiers: NightTierDraft[]): WcProducts {
  const hasSkip = tiers.some((t) => t.kind === "skip")
  const hasCover = tiers.some((t) => t.kind === "cover")
  if (hasSkip && hasCover) return "both"
  return hasSkip ? "skip" : "cover"
}

// ── Weekday hydration ───────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(["cancelled", "deleted", "pending_deletion"])

function isTerminal(night: DoorAccessNight): boolean {
  return TERMINAL_STATUSES.has(String(night.status ?? "")) || night.is_closed
}

/**
 * A date-local Custom night. `is_customized` is the wire flag (including a
 * leftover `series_customized_at` stamp). Series/program save must not treat
 * this night as the weekday template.
 */
export function isCustomWeeklyCoverNight(night: { is_customized?: unknown }): boolean {
  return truthy(night.is_customized)
}

function nightFlyerKey(night: Record<string, unknown>): string {
  const override = String(night.flyer_image_url_override ?? "").trim()
  if (override !== "") return override
  return String(night.flyer_image_url ?? "").trim()
}

/** A night's signature, for deciding what the weekday's consensus is. */
function nightSignature(night: DoorAccessNight & Record<string, unknown>): string {
  const tiers = [...(night.tiers ?? [])]
    .map((t) => {
      const raw = t as unknown as Record<string, unknown>
      const surge = surgeStepsFromWire(raw.surge_steps)
        .map((s) => `${s.afterSoldInput}:${s.priceInput}`)
        .sort()
        .join(",")
      return `${t.tier_key}:${t.price_usd}:${t.quantity ?? ""}:${t.is_disabled ? 1 : 0}:${surge}`
    })
    .sort()
    .join("|")
  const plus = truthy((night as Record<string, unknown>).is_21_plus) ? 1 : 0
  const flyer = nightFlyerKey(night as Record<string, unknown>)
  return `${toTimeValue(night.start_time)}|${toTimeValue(night.end_time)}|${night.is_closed ? 1 : 0}|${plus}|${flyer}|${tiers}`
}

/** The one signature a clear majority of siblings share, if there is one. */
function modeOf(signatures: string[]): string | null {
  if (signatures.length === 0) return null
  if (signatures.length === 1) return signatures[0]
  const counts = new Map<string, number>()
  for (const s of signatures) counts.set(s, (counts.get(s) ?? 0) + 1)
  let max = 0
  for (const c of counts.values()) if (c > max) max = c
  if (max < 2) return null
  const winners = [...counts.entries()].filter(([, c]) => c === max).map(([s]) => s)
  return winners.length === 1 ? winners[0] : null
}

/**
 * The night a WEEKDAY editor should read its saved values from.
 *
 * DO NOT reach for `weekday_edits` on a program GET. Services accepts that map
 * on a write and never echoes it back, so a weekday editor seeded from it opens
 * on template defaults and the host's saved Monday price is invisible — then the
 * next save pushes the template back over it. The durable record of "Mondays are
 * $15" is the Mondays themselves.
 *
 * Custom nights are never the weekday. Seeding from one would send that date's
 * tickets/prices/doors/flyer as the Thursday template on the next program save
 * and restamp them onto other Thursdays — and onto the Custom night itself.
 * Consensus is among the remaining future nights of that weekday. If every
 * remaining night is Custom, there is no template to read and this returns null.
 */
export function weekdayHydrationNight(opts: {
  isoWeekday: number
  nights: DoorAccessNight[]
  today?: string
}): DoorAccessNight | null {
  const floor = opts.today ?? todayIso()
  const candidates = opts.nights.filter(
    (n) =>
      isoWeekdayOfDate(n.occurrence_date) === opts.isoWeekday &&
      n.occurrence_date >= floor &&
      !isCustomWeeklyCoverNight(n)
  )
  if (candidates.length === 0) return null

  const live = candidates.filter((n) => !isTerminal(n))
  if (live.length > 1) {
    const signatures = live.map((n) => nightSignature(n as DoorAccessNight & Record<string, unknown>))
    const mode = modeOf(signatures)
    if (mode != null) {
      const hit = live.find((_, i) => signatures[i] === mode)
      if (hit) return hit
    }
  }
  return live[0] ?? candidates[0]
}

/**
 * Weekday-template flyer per ISO weekday, for program night-card display.
 *
 * Custom nights are never the weekday — same rule as `weekdayHydrationNight`.
 * A later edit of one date is Custom; that date's flyer stays on that date.
 */
export function weekdayFlyerByDayFromNights(opts: {
  program: DoorAccessProgram
  nights: DoorAccessNight[]
  today?: string
}): Record<number, string> {
  const out: Record<number, string> = {}
  for (const day of opts.program.days_of_week) {
    const src = weekdayHydrationNight({
      isoWeekday: day,
      nights: opts.nights,
      today: opts.today,
    })
    if (!src) continue
    const url = weekdayTemplateFlyer(src as DoorAccessNight & Record<string, unknown>, opts.program)
    if (url) out[day] = url
  }
  return out
}

/** Every weekday's editor state, hydrated from the served nights. */
export function weekdayEditsFromNights(opts: {
  program: DoorAccessProgram
  nights: DoorAccessNight[]
  today?: string
}): Record<number, NightDraft> {
  const out: Record<number, NightDraft> = {}
  for (const day of opts.program.days_of_week) {
    const night = weekdayHydrationNight({
      isoWeekday: day,
      nights: opts.nights,
      today: opts.today,
    })
    if (!night) continue
    out[day] = weekdayDraftFromWire(
      night as DoorAccessNight & Record<string, unknown>,
      opts.program
    )
  }
  return out
}

// ── Dates ───────────────────────────────────────────────────────────────────

/**
 * Y-m-d → ISO weekday (1 = Mon … 7 = Sun), or null.
 *
 * Parsed by hand rather than through `new Date(s)`, which reads a bare Y-m-d as
 * UTC midnight and renders a Friday night as Thursday for every US viewer. That
 * is the highest-consequence bug available on this surface and it is invisible
 * in a UTC-based CI.
 */
export function isoWeekdayOfDate(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date ?? ""))
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return null
  return ((d.getDay() + 6) % 7) + 1
}

export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA")
}

export function isoDateOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** How far ahead the game-day calendar looks. Matches the app's lookahead. */
export const WC_LOOKAHEAD_DAYS = 120

/**
 * The dates this program will actually run, as plain Y-m-d strings.
 *
 * Bounded by the program's own range and by `lookaheadDays`, because services
 * refuses a `date_edits` key outside the scheduled horizon.
 */
export function scheduledDates(opts: {
  daysOfWeek: number[]
  rangeStart?: string | null
  rangeEnd?: string | null
  lookaheadDays?: number
  today?: string
}): string[] {
  if (opts.daysOfWeek.length === 0) return []
  const today = opts.today ?? todayIso()
  const startStr = opts.rangeStart && opts.rangeStart > today ? opts.rangeStart : today
  const start = new Date(startStr + "T00:00:00")
  if (Number.isNaN(start.getTime())) return []

  const horizon = new Date(start)
  horizon.setDate(horizon.getDate() + (opts.lookaheadDays ?? WC_LOOKAHEAD_DAYS))
  const limit = opts.rangeEnd && opts.rangeEnd !== "" ? opts.rangeEnd : null

  const out: string[] = []
  const cursor = new Date(start)
  while (cursor <= horizon) {
    const iso = isoDateOf(cursor)
    if (limit && iso > limit) break
    const weekday = ((cursor.getDay() + 6) % 7) + 1
    if (opts.daysOfWeek.includes(weekday)) out.push(iso)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/** "Friday, Aug 29" — for an editor title. No timezone round-trip. */
export function fmtGameDay(date: string): string {
  const d = new Date(date.slice(0, 10) + "T00:00:00")
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

// ── Validation ──────────────────────────────────────────────────────────────

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * A night's problems, in the order a host would fix them. Empty means valid.
 *
 * Mirrors the rules services will apply so Save can be honest instead of
 * surfacing a 400 after the fact. Surge is the fiddly one: services requires
 * strictly ascending thresholds and refuses a jump at or below the base price.
 */
export function validateNightDraft(draft: NightDraft, label: string): string[] {
  const errors: string[] = []
  if (draft.isClosed) return errors

  if (draft.startTime === "" || draft.endTime === "") {
    errors.push(`${label}: set when doors open and when they close.`)
  }

  const live = draft.tiers.filter((t) => !t.is_disabled)
  if (live.length === 0) {
    errors.push(`${label}: turn on at least one way in.`)
  }

  for (const tier of live) {
    const name = tier.name.trim() || defaultTierName(tier.kind)
    if (tier.valid_from_time !== "" && tier.valid_until_time !== "") {
      const from = tier.valid_from_day_offset * 1440 + toMinutes(tier.valid_from_time)
      const until = tier.valid_until_day_offset * 1440 + toMinutes(tier.valid_until_time)
      if (from >= until) {
        errors.push(
          `${label} · ${name}: the scan window must end after it starts (a window past midnight ends next morning).`
        )
      }
    }
    if (!tier.surge_enabled) continue

    const steps = tier.surge
    if (steps.length === 0) {
      errors.push(`${label} · ${name}: surge needs at least one price jump.`)
      continue
    }
    const base = parsePrice(tier.priceInput)
    let previous = 0
    for (let i = 0; i < steps.length; i++) {
      const after = parseThreshold(steps[i].afterSoldInput)
      const price = parsePrice(steps[i].priceInput)
      if (after <= 0) {
        errors.push(`${label} · ${name}: jump ${i + 1} needs a positive number sold.`)
      } else if (after <= previous) {
        errors.push(
          `${label} · ${name}: jump ${i + 1} has to come after ${previous} sold, not ${after}.`
        )
      }
      if (price <= 0) {
        errors.push(`${label} · ${name}: jump ${i + 1} needs a price.`)
      } else if (i === 0 && base > 0 && price <= base) {
        errors.push(
          `${label} · ${name}: the first jump has to be more than the starting price.`
        )
      }
      if (after > previous) previous = after
    }
  }
  return errors
}

/** Every night's problems, for the step's Next guard. */
export function validateAllNights(opts: {
  daysOfWeek: number[]
  weekdayEdits: Record<number, NightDraft>
  dateEdits: Record<string, NightDraft>
  dayLabel: (iso: number) => string
}): string[] {
  const errors: string[] = []
  for (const day of [...opts.daysOfWeek].sort((a, b) => a - b)) {
    const draft = opts.weekdayEdits[day]
    if (!draft) {
      errors.push(`${opts.dayLabel(day)}: set its prices and hours.`)
      continue
    }
    errors.push(...validateNightDraft(draft, opts.dayLabel(day)))
  }
  for (const date of Object.keys(opts.dateEdits).sort()) {
    errors.push(...validateNightDraft(opts.dateEdits[date], fmtGameDay(date)))
  }
  return errors
}

/**
 * Flyer shown on Look it over for one weekday draft.
 *
 * Own artwork only (`flyerImageUrl`). Inherited venue/program photos stay in
 * the night editor as a fallback, not as a per-night flyer. Empty string means
 * the review shows a placeholder; Publish is unaffected.
 */
export function reviewFlyerUrl(draft: NightDraft | undefined | null): string {
  return (draft?.flyerImageUrl ?? "").trim()
}

/**
 * Same weekday selection as the text preview (EVERY WEDNESDAY, prices, times).
 * A missing day, an unset night, or a night with no own flyer all return "".
 */
export function reviewFlyerUrlForDay(
  weekdayEdits: Record<number, NightDraft>,
  day: number | null | undefined
): string {
  if (day == null) return ""
  return reviewFlyerUrl(weekdayEdits[day])
}

/** A one-line summary for a weekday card: "Cover $10 · Skip $20 · Surge". */
export function nightPriceSummary(draft: NightDraft | undefined): string {
  if (!draft) return ""
  if (draft.isClosed) return "Closed"
  const parts: string[] = []
  let surge = false
  for (const tier of draft.tiers) {
    if (tier.is_disabled) continue
    surge = surge || surgeStepsToWire(tier).length > 0
    const price = parsePrice(tier.priceInput)
    parts.push(`${tier.kind === "skip" ? "Skip" : "Cover"} ${price > 0 ? `$${trimMoney(price)}` : "Free"}`)
  }
  if (parts.length === 0) return ""
  return surge ? `${parts.slice(0, 2).join(" · ")} · Surge` : parts.slice(0, 2).join(" · ")
}
