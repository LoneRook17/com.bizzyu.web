// Door Access — the TYPED CLIENT for services' /business/door-access surface
// (V5 F14). Same DI-B3w pattern as payouts.ts and escrow.ts: this is the ONE
// FILE to touch when the wire shape moves. Wire types and pure helpers live
// here; every page imports from here, never a raw fetch.
//
// WHAT THIS SECTION IS. A Door Access "program" is a recurring_event_series
// row with program_kind = 'door_access'. Its nights are real events rows, so
// discovery, checkout, wallet and door ops are already served by the event
// pipeline — this surface is the HOST's view of the template and its
// schedule, nothing else.
//
// D-P5 VOCABULARY. User-facing copy is "Weekly Cover" (renamed from Weekly
// Access so it matches the Flutter app). No user-facing surface says
// "Door Access". The API path, program_kind and every response field stay
// `door_access`. Display strings live in ./weekly-cover-label so one label
// drives every surface. Do not use them to rename a contract.
//
// D-F11.1 — a program card opens the SERIES, never a single night. The night
// is reached from inside the series page. Program-wide edits live on
// programEditHref(). That routing rule is why programHref(), programEditHref()
// and nightHref() live here rather than being inlined.
//
// Everything below the fetch functions is pure so the Node built-in test
// runner (`npm test`) can exercise it without resolving the api-client chain.
// api-client.ts pulls the `@/` alias, which the runner cannot resolve, so it
// stays behind a lazy import in the fetch helpers.

// ── D-P5 labels ─────────────────────────────────────────────────────────────

export {
  WEEKLY_ACCESS_CREATION_LABEL,
  WEEKLY_ACCESS_SECTION_LABEL,
  WEEKLY_ACCESS_TYPE_LABEL,
} from "./weekly-cover-label.ts"

/**
 * Flutter EventModel.readAccessKind: `weekly_cover` is the same night as
 * `door_access`. Wire the alias here so public venue + dashboard list agree.
 * Do not rename the API path or program_kind — those stay `door_access`.
 */
export function readAccessKind(raw: unknown): "event" | "door_access" | null {
  if (raw === "event") return "event"
  if (raw === "door_access" || raw === "weekly_cover") return "door_access"
  return null
}

export function isDoorAccessKind(raw: unknown): boolean {
  return readAccessKind(raw) === "door_access"
}

/**
 * A stamped Weekly Cover night's program id is `recurring_series_id`, never
 * `event_id`. GET /business/door-access/:id only accepts a series id with
 * program_kind === 'door_access'. Returns null instead of inventing a program.
 */
export function programIdFromOwnedEvent(event: {
  access_kind?: string | null
  recurring_series_id?: number | string | null
}): number | null {
  if (!isDoorAccessKind(event.access_kind)) return null
  if (event.recurring_series_id == null || event.recurring_series_id === "") return null
  const id = Number(event.recurring_series_id)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

/** GET /business/events/:id, then programIdFromOwnedEvent. Does not invent. */
export async function resolveDoorAccessProgramIdFromEvent(
  eventId: number,
): Promise<number | null> {
  if (!Number.isFinite(eventId) || eventId <= 0) return null
  try {
    const api = await client()
    const event = await api.get<{
      access_kind?: string | null
      recurring_series_id?: number | string | null
    }>(`/business/events/${eventId}`)
    return programIdFromOwnedEvent(event ?? {})
  } catch {
    return null
  }
}

/** F9 card chip on a named-event row. */
export const EVENT_TYPE_LABEL = "EVENT"

/** The accent pair. Green = named event, magenta = access (F9 / D-P5). */
export const EVENT_ACCENT = "#05EB54"
export const ACCESS_ACCENT = "#FF3ED1"
/** Gradient partner for ACCESS_ACCENT — same pair as checkout / venue Weekly Cover. */
export const ACCESS_ACCENT_DEEP = "#D10EA3"
/** v2 Button variant for Weekly Cover primary CTAs. */
export const ACCESS_BUTTON_VARIANT = "access" as const

// ── F11 program page copy (no em dashes in host-facing strings) ─────────────

export const PROGRAM_LINK_LABEL = "Program link"
export const PROGRAM_LINK_DESCRIPTION = "Every upcoming night"

export const NIGHTS_HELPER_EDIT =
  "Tap a night to change price, capacity, or hours for that date only."
export const NIGHTS_HELPER_VIEW = "Tap a night to see what it sells."

/** Header control on the series page. Opens the dedicated template editor. */
export const EDIT_PROGRAM_LABEL = "Edit program"

/** Path segment is empty, undefined, NaN, or <= 0. Not a 404. */
export const MISSING_PROGRAM_ID_TITLE = "Missing program id"
export const MISSING_PROGRAM_ID_DESCRIPTION = "This URL has no program id."

/** A /business/door-access/:id segment. Empty / undefined / NaN / <= 0 is missing. */
export function parseProgramPathId(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const trimmed = String(raw).trim()
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null") return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Default strip: the next N upcoming nights, not a 4-week ledger. */
export const DEFAULT_NIGHT_PREVIEW_COUNT = 4

/** Days fetched before the host opens More nights. Server clamps at 180. */
export const DEFAULT_SERIES_LOOKAHEAD_DAYS = 28

// ── Wire shapes (services/src/services/DoorAccessProgramService.ts) ─────────

export const REDEMPTION_MODES = ["native_scan", "camera_tap"] as const
export type RedemptionMode = (typeof REDEMPTION_MODES)[number]

/**
 * A program-wide template tier. `tier_key` — not the name, not a ticket id —
 * is the stable identity a per-night override keys off, because a restamp
 * deletes and recreates the underlying tickets rows.
 */
export interface DoorAccessTemplateTier {
  tier_key: string
  name: string
  description: string | null
  price_usd: number
  quantity: number
  max_per_person: number
  ticket_type: "paid" | "free"
  is_hidden: number
  sort_order: number
  valid_from_time: string | null
  valid_until_time: string | null
  valid_from_day_offset: number
  valid_until_day_offset: number
}

/** A row from GET /business/door-access — the F9 list card's source. */
export interface DoorAccessProgramSummary {
  id: number
  name: string
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  days_of_week: number[]
  date_range_start: string
  date_range_end: string | null
  is_active: boolean
  venue_id: number | null
  venue_name: string
  start_time: string
  end_time: string
  flyer_image_url: string | null
  /**
   * Venue photo when the program payload includes it. Older services builds
   * omit this; display then uses the venues list. A coalesced flyer from
   * services still arrives on flyer_image_url and wins.
   */
  photo_url?: string | null
  redemption_mode: RedemptionMode
  template_tickets: DoorAccessTemplateTier[]
  migrated_from_line_skip_id: number | null
  promotion_enabled: boolean
  upcoming_night_count: number
  /** "YYYY-MM-DD" or null when nothing is stamped ahead. */
  next_night_date: string | null
  tier_count: number
  /** Server-derived so the card's "From $X" needs no client math. */
  lowest_price_usd: number | null
}

/** The full template, as returned inside GET /business/door-access/:id. */
export interface DoorAccessProgram extends DoorAccessProgramSummary {
  description: string | null
  venue_address: string
  type: "Ticketed" | "Free" | "RSVP"
  is_21_plus: boolean
  timezone: string | null
  promotion_commission_type: "percent" | "fixed" | null
  promotion_commission_value: number | null
  lowstock_alerts_enabled: boolean
  lowstock_threshold_type: "percent" | "count" | null
  lowstock_threshold_value: number | null
  lowstock_notify_business_team: boolean
}

/**
 * One tier as it will actually sell on one night — template merged with that
 * night's overrides. `is_overridden` is server-computed, so the editor never
 * has to diff against the template to know what to mark.
 */
export interface DoorAccessNightTier {
  tier_key: string
  name: string
  description: string | null
  price_usd: number
  quantity: number
  max_per_person: number
  sort_order: number
  is_disabled: boolean
  /**
   * Night-level sold out. Hydrated from `sold_out` or legacy `force_sold_out`
   * when services echoes it. Missing on older payloads; default false.
   */
  sold_out: boolean
  is_overridden: boolean
  template_price_usd: number
  template_quantity: number
  /**
   * Present when the night payload includes them. Older nights omit these;
   * draftFromNight then uses the program template so Edit matches create.
   */
  ticket_type?: "paid" | "free"
  valid_from_time?: string | null
  valid_until_time?: string | null
  valid_from_day_offset?: number
  valid_until_day_offset?: number
}

/**
 * One night on the schedule.
 *
 * `is_stamped` false means core's generator has not materialised the event row
 * yet — the night is real and on the schedule, and IS overridable, because
 * overrides key off the date rather than an event id. That is what makes
 * pricing New Year's Eve in November possible, and it is why this list shows
 * the SCHEDULE rather than only the stamped rows.
 */
export interface DoorAccessNight {
  occurrence_date: string
  is_stamped: boolean
  is_scheduled: boolean
  event_id: number | null
  status: string | null
  start_date_time: string | null
  end_date_time: string | null
  passes_sold: number
  paid_orders: number
  is_customized: boolean
  is_closed: boolean
  has_override: boolean
  start_time: string
  end_time: string
  tiers: DoorAccessNightTier[]
}

export interface DoorAccessSeries {
  program: DoorAccessProgram
  nights: DoorAccessNight[]
}

/**
 * A per-night write's result.
 *
 * The override row is committed before core restamps tickets. That does not
 * mean buyers see the new price: restampNight can return times_only_has_sales
 * or restamp_error, in which case checkout still has the old tickets.price_usd.
 * The night page must not show a live Saved banner in those cases.
 */
export interface NightOverrideResult {
  night: DoorAccessNight
  restamp: unknown | null
  restamp_error: string | null
}

/** Ticket row on the night page drafts only. Save night is the guest-facing commit. */
export const NIGHT_TICKET_APPLY_LABEL = "Apply to night"

export const NIGHT_TICKET_DRAFT_HINT =
  "Drafts until you Save night. Buyers will not see this price until then."

export const NIGHT_SAVE_LIVE = "Saved."

export const NIGHT_SAVE_NOT_LIVE =
  "Saved is not live. The price buyers see may still be the old one."

export const TIMES_ONLY_HAS_SALES = "times_only_has_sales"

export const NIGHT_UNSAVED_TITLE = "Unsaved changes"

export const NIGHT_UNSAVED_BODY =
  "Leave this night without saving? Hours, tickets, sold out, and order stay drafts until you Save night."

export const NIGHT_UNSAVED_LEAVE = "Leave"

/**
 * A sparse night patch. Omit = leave alone. null = go back to inheriting.
 *
 * PUT /business/door-access/:id/nights/:date already accepts start_time,
 * end_time, is_closed, and per-tier price_usd / quantity / is_disabled.
 * This client also sends sold_out, sort_order, and the create-series ticket
 * fields (name, type, description, max_per_person, scan window) on each
 * tier so a host can Edit a night ticket with the same fields as Add ticket
 * tier, then commit on Save night.
 *
 * Services follow-up: persist those keys on door_access_tier_overrides
 * (and restamp them onto tickets). Older services builds drop unknown tier
 * fields. Do not strip them here or the night UI becomes a silent no-op.
 */
export interface NightOverridePayload {
  start_time?: string | null
  end_time?: string | null
  is_closed?: boolean
  tiers?: Array<{
    tier_key: string
    price_usd?: number | null
    quantity?: number | null
    is_disabled?: boolean
    sold_out?: boolean
    sort_order?: number
    name?: string | null
    description?: string | null
    ticket_type?: "paid" | "free" | null
    max_per_person?: number | null
    valid_from_time?: string | null
    valid_until_time?: string | null
    valid_from_day_offset?: number | null
    valid_until_day_offset?: number | null
  }>
}

// ── Normalization (MySQL/JSON can hand back strings and 0/1 for booleans) ───

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : fallback
}

function nullableNum(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = num(v, NaN)
  return Number.isFinite(n) ? n : null
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === "1"
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v)
}

/** Dates are plain Y-m-d strings end to end — never tz-converted. */
function dateOnly(v: unknown): string {
  return str(v).slice(0, 10)
}

/**
 * days_of_week arrives as a JSON array, or as a JSON *string* when a caller
 * hands back the raw column. Both are accepted; anything else is an empty
 * pattern, which reads as "no nights scheduled" rather than throwing.
 */
export function normalizeDays(v: unknown): number[] {
  let raw = v
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((d) => num(d, 0))
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b)
}

export function normalizeTemplateTier(raw: Record<string, unknown>): DoorAccessTemplateTier {
  return {
    tier_key: str(raw.tier_key),
    name: str(raw.name),
    description: raw.description == null ? null : str(raw.description),
    price_usd: num(raw.price_usd),
    quantity: num(raw.quantity),
    max_per_person: num(raw.max_per_person),
    ticket_type: raw.ticket_type === "free" ? "free" : "paid",
    is_hidden: num(raw.is_hidden),
    sort_order: num(raw.sort_order),
    valid_from_time: raw.valid_from_time == null || raw.valid_from_time === "" ? null : str(raw.valid_from_time),
    valid_until_time: raw.valid_until_time == null || raw.valid_until_time === "" ? null : str(raw.valid_until_time),
    valid_from_day_offset: num(raw.valid_from_day_offset),
    valid_until_day_offset: num(raw.valid_until_day_offset),
  }
}

function normalizeTemplateTiers(v: unknown): DoorAccessTemplateTier[] {
  let raw = v
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map(normalizeTemplateTier)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function normalizeProgramSummary(raw: Record<string, unknown>): DoorAccessProgramSummary {
  const tiers = normalizeTemplateTiers(raw.template_tickets)
  return {
    id: num(raw.id),
    name: str(raw.name),
    days_of_week: normalizeDays(raw.days_of_week),
    date_range_start: dateOnly(raw.date_range_start),
    date_range_end: raw.date_range_end ? dateOnly(raw.date_range_end) : null,
    is_active: bool(raw.is_active),
    venue_id: nullableNum(raw.venue_id),
    venue_name: str(raw.venue_name),
    start_time: str(raw.start_time),
    end_time: str(raw.end_time),
    flyer_image_url: raw.flyer_image_url ? str(raw.flyer_image_url) : null,
    photo_url: raw.photo_url ? str(raw.photo_url) : null,
    redemption_mode: raw.redemption_mode === "native_scan" ? "native_scan" : "camera_tap",
    template_tickets: tiers,
    migrated_from_line_skip_id: nullableNum(raw.migrated_from_line_skip_id),
    promotion_enabled: bool(raw.promotion_enabled),
    upcoming_night_count: num(raw.upcoming_night_count),
    next_night_date: raw.next_night_date ? dateOnly(raw.next_night_date) : null,
    // Trust the server's derived fields, but fall back to the tiers we have —
    // getProgram()'s presented program carries the template without them.
    tier_count: raw.tier_count == null ? tiers.length : num(raw.tier_count),
    lowest_price_usd:
      raw.lowest_price_usd != null
        ? nullableNum(raw.lowest_price_usd)
        : tiers.length > 0
          ? Math.min(...tiers.map((t) => t.price_usd))
          : null,
  }
}

export function normalizeProgram(raw: Record<string, unknown>): DoorAccessProgram {
  const commissionType = raw.promotion_commission_type
  const lowstockType = raw.lowstock_threshold_type
  return {
    ...normalizeProgramSummary(raw),
    description: raw.description == null ? null : str(raw.description),
    venue_address: str(raw.venue_address),
    type: raw.type === "Free" ? "Free" : raw.type === "RSVP" ? "RSVP" : "Ticketed",
    is_21_plus: bool(raw.is_21_plus),
    timezone: raw.timezone == null ? null : str(raw.timezone),
    promotion_commission_type:
      commissionType === "fixed" ? "fixed" : commissionType === "percent" ? "percent" : null,
    promotion_commission_value: nullableNum(raw.promotion_commission_value),
    lowstock_alerts_enabled: bool(raw.lowstock_alerts_enabled),
    lowstock_threshold_type:
      lowstockType === "count" ? "count" : lowstockType === "percent" ? "percent" : null,
    lowstock_threshold_value: nullableNum(raw.lowstock_threshold_value),
    lowstock_notify_business_team: bool(raw.lowstock_notify_business_team),
  }
}

export function normalizeNightTier(raw: Record<string, unknown>): DoorAccessNightTier {
  return {
    tier_key: str(raw.tier_key),
    name: str(raw.name),
    description: raw.description == null ? null : str(raw.description),
    price_usd: num(raw.price_usd),
    quantity: num(raw.quantity),
    max_per_person: num(raw.max_per_person),
    sort_order: num(raw.sort_order),
    is_disabled: bool(raw.is_disabled),
    sold_out: bool(raw.sold_out) || bool(raw.force_sold_out),
    is_overridden: bool(raw.is_overridden),
    template_price_usd: num(raw.template_price_usd),
    template_quantity: num(raw.template_quantity),
    ticket_type: raw.ticket_type === "free" ? "free" : raw.ticket_type === "paid" ? "paid" : undefined,
    valid_from_time: !("valid_from_time" in raw)
      ? undefined
      : raw.valid_from_time == null || raw.valid_from_time === ""
        ? null
        : str(raw.valid_from_time),
    valid_until_time: !("valid_until_time" in raw)
      ? undefined
      : raw.valid_until_time == null || raw.valid_until_time === ""
        ? null
        : str(raw.valid_until_time),
    valid_from_day_offset: "valid_from_day_offset" in raw ? num(raw.valid_from_day_offset) : undefined,
    valid_until_day_offset: "valid_until_day_offset" in raw ? num(raw.valid_until_day_offset) : undefined,
  }
}

export function normalizeNight(raw: Record<string, unknown>): DoorAccessNight {
  const tiers = Array.isArray(raw.tiers)
    ? raw.tiers
        .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
        .map(normalizeNightTier)
        .sort((a, b) => a.sort_order - b.sort_order)
    : []
  return {
    occurrence_date: dateOnly(raw.occurrence_date),
    is_stamped: bool(raw.is_stamped),
    is_scheduled: bool(raw.is_scheduled),
    event_id: nullableNum(raw.event_id),
    status: raw.status == null ? null : str(raw.status),
    start_date_time: raw.start_date_time == null ? null : str(raw.start_date_time),
    end_date_time: raw.end_date_time == null ? null : str(raw.end_date_time),
    passes_sold: num(raw.passes_sold),
    paid_orders: num(raw.paid_orders),
    is_customized: bool(raw.is_customized),
    is_closed: bool(raw.is_closed),
    has_override: bool(raw.has_override),
    start_time: str(raw.start_time),
    end_time: str(raw.end_time),
    tiers,
  }
}

// ── Reads / writes ──────────────────────────────────────────────────────────

async function client() {
  const mod = await import("./api-client")
  return mod.apiClient
}

/** GET /business/door-access — the WEEKLY ACCESS rows on the combined list. */
export async function fetchDoorAccessPrograms(): Promise<DoorAccessProgramSummary[]> {
  const api = await client()
  const data = await api.get<{ programs?: unknown }>("/business/door-access")
  const rows = Array.isArray(data?.programs) ? data.programs : []
  return rows
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map(normalizeProgramSummary)
}

/**
 * The combined list's access half, degraded (D-F9.2).
 *
 * A business with no programs, a staff member on an older services build, or a
 * transient 500 must not take the EVENTS list down with it — access rows are
 * additive to a surface that worked before they existed. Failure is an empty
 * section, never an error wall.
 */
export async function fetchDoorAccessProgramsSafe(): Promise<DoorAccessProgramSummary[]> {
  try {
    return await fetchDoorAccessPrograms()
  } catch {
    return []
  }
}

/** GET /business/door-access/:id — the F11 series page (D-F11.1). */
export async function fetchDoorAccessSeries(
  programId: number,
  lookaheadDays?: number
): Promise<DoorAccessSeries> {
  const api = await client()
  const qs = lookaheadDays ? `?lookahead_days=${lookaheadDays}` : ""
  const data = await api.get<{ program: Record<string, unknown>; nights?: unknown }>(
    `/business/door-access/${programId}${qs}`
  )
  const nights = Array.isArray(data?.nights) ? data.nights : []
  return {
    program: normalizeProgram(data.program ?? {}),
    nights: nights
      .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
      .map(normalizeNight),
  }
}

/** GET /business/door-access/:id/nights/:date — the override editor's load. */
export async function fetchDoorAccessNight(
  programId: number,
  date: string
): Promise<{ program: DoorAccessProgram; night: DoorAccessNight }> {
  const api = await client()
  const data = await api.get<{ program: Record<string, unknown>; night: Record<string, unknown> }>(
    `/business/door-access/${programId}/nights/${date}`
  )
  return {
    program: normalizeProgram(data.program ?? {}),
    night: normalizeNight(data.night ?? {}),
  }
}

/** PUT /business/door-access/:id/nights/:date — save a per-night override. */
export async function saveNightOverride(
  programId: number,
  date: string,
  payload: NightOverridePayload
): Promise<NightOverrideResult> {
  const api = await client()
  const data = await api.put<{
    night: Record<string, unknown>
    restamp?: unknown
    restamp_error?: string | null
  }>(`/business/door-access/${programId}/nights/${date}`, payload)
  return {
    night: normalizeNight(data.night ?? {}),
    restamp: data.restamp ?? null,
    restamp_error: data.restamp_error ?? null,
  }
}

/** DELETE …/overrides — the night goes back to being pure template. */
export async function clearNightOverride(
  programId: number,
  date: string
): Promise<NightOverrideResult> {
  const api = await client()
  const data = await api.delete<{
    night: Record<string, unknown>
    restamp?: unknown
    restamp_error?: string | null
  }>(`/business/door-access/${programId}/nights/${date}/overrides`)
  return {
    night: normalizeNight(data.night ?? {}),
    restamp: data.restamp ?? null,
    restamp_error: data.restamp_error ?? null,
  }
}

/**
 * A program-wide write's result. `restamp_error` is a WARNING, never a failure:
 * the template is already committed when core's restamp is attempted.
 */
export interface ProgramUpdateResult {
  program: DoorAccessProgram
  restamp: unknown | null
  restamp_error: string | null
}

/** PUT /business/door-access/:id — save the whole program template. */
export async function updateDoorAccessProgram(
  programId: number,
  payload: Record<string, unknown>
): Promise<ProgramUpdateResult> {
  const api = await client()
  const data = await api.put<{
    program?: Record<string, unknown>
    series?: Record<string, unknown>
    restamp?: unknown
    restamp_error?: string | null
  }>(`/business/door-access/${programId}`, payload)
  return {
    program: normalizeProgram(data.program ?? data.series ?? {}),
    restamp: data.restamp ?? null,
    restamp_error: data.restamp_error ?? null,
  }
}

// ── Routing (D-F11.1: a program card opens the SERIES, never a night) ───────

export function programHref(programId: number): string {
  return `/business/door-access/${programId}`
}

/** Dedicated template editor. The series page stays view + tap a night. */
export function programEditHref(programId: number): string {
  return `/business/door-access/${programId}/edit`
}

export function nightHref(programId: number, date: string): string {
  return `/business/door-access/${programId}/nights/${date}`
}

/** "21:00:00" → "21:00" for `<input type="time">`. */
export function toTimeInput(value: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(str(value))
  if (!match) return ""
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`
}

/** "21:00" from `<input type="time">` → "21:00:00" for the night draft. */
export function fromTimeInput(value: string): string {
  const hhmm = toTimeInput(value)
  return hhmm ? `${hhmm}:00` : ""
}

// ── Pure formatting ─────────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/**
 * "Fri · Sat" from ISO weekdays. Every-night collapses to a phrase rather than
 * listing seven days, which would eat the whole metadata line.
 */
export function formatDays(days: number[]): string {
  if (days.length === 0) return ""
  if (days.length === 7) return "Every night"
  return days.map((d) => DAY_NAMES[d - 1] ?? "").filter(Boolean).join(" · ")
}

/**
 * "Fri, Aug 22" from a Y-m-d string.
 *
 * Parsed by hand into a UTC date. `new Date("2026-08-22")` is UTC midnight and
 * renders as the 21st for every US viewer, and `new Date(2026, 7, 22)` drags
 * in the browser's zone — both silently shift a night by a day. These dates
 * are plain calendar strings on the server and stay that way here.
 */
export function fmtNightDate(iso: string, opts: { withYear?: boolean } = {}): string {
  const parts = parseIsoDate(iso)
  if (!parts) return iso
  const { y, m, d } = parts
  const weekday = DAY_NAMES[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]
  const base = `${weekday}, ${MONTH_NAMES[m - 1]} ${d}`
  return opts.withYear ? `${base}, ${y}` : base
}

export function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso).slice(0, 10))
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return { y, m, d }
}

/**
 * Image for a weekly-access row or night card.
 *
 * flyer_image_url wins, including when services already coalesced an empty
 * flyer to the venue photo. If flyer is still empty, use photo_url on the
 * program, then the matching venue from auth/venues. The date-block / icon
 * tile stays only when there is no image at all.
 */
export function resolveProgramImageUrl(
  program: {
    flyer_image_url?: string | null
    photo_url?: string | null
    venue_id?: number | null
  },
  venues?: Array<{ id: number; photo_url?: string | null }>,
): string | null {
  const flyer = nonemptyUrl(program.flyer_image_url)
  if (flyer) return flyer
  const onProgram = nonemptyUrl(program.photo_url)
  if (onProgram) return onProgram
  if (program.venue_id == null || !venues?.length) return null
  const venue = venues.find((v) => v.id === program.venue_id)
  return nonemptyUrl(venue?.photo_url)
}

function nonemptyUrl(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Flyer fallback on a night preview card: weekday, month name, calendar day. */
export function nightDateBlock(
  iso: string
): { weekday: string; month: string; day: number } | null {
  const parts = parseIsoDate(iso)
  if (!parts) return null
  const weekday = DAY_NAMES[(new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay() + 6) % 7]
  return { weekday, month: MONTH_NAMES[parts.m - 1], day: parts.d }
}

/** "22:00:00" → "10:00 PM". Wall-clock in, wall-clock out — no zone math. */
export function fmtTime(value: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(str(value))
  if (!match) return ""
  const h24 = Number(match[1])
  const minutes = match[2]
  if (h24 < 0 || h24 > 23) return ""
  const suffix = h24 >= 12 ? "PM" : "AM"
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${minutes} ${suffix}`
}

export function fmtWindow(start: string, end: string): string {
  const a = fmtTime(start)
  const b = fmtTime(end)
  if (!a && !b) return ""
  if (!b) return a
  if (!a) return b
  return `${a} - ${b}`
}

export function usdPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "-"
  return n === 0
    ? "Free"
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** `quantity` 0 means UNLIMITED across this platform, never "sold out". */
export function fmtQuantity(quantity: number): string {
  return quantity === 0 ? "Unlimited" : `${quantity.toLocaleString("en-US")} available`
}

export function redemptionModeLabel(mode: RedemptionMode): string {
  return mode === "native_scan" ? "Scan universal access" : "Camera + tap"
}

/**
 * The F9 card's single metadata line, mirroring the app's accessProgramMeta:
 * `Venue · nights · Recurring cover and line skip · From $X`.
 *
 * Empty segments are dropped rather than rendered blank, so a program with no
 * venue reads "Fri · Sat · …" and not " · Fri · Sat · …".
 */
export function programMetaLine(program: DoorAccessProgramSummary): string {
  return [
    program.venue_name,
    formatDays(program.days_of_week),
    "Recurring cover and line skip",
    program.lowest_price_usd != null ? `From ${usdPrice(program.lowest_price_usd)}` : "",
  ]
    .filter((s) => s.length > 0)
    .join(" · ")
}

/**
 * The desktop row's second line — the schedule facts that only exist on a
 * program. Ends at the next night, which is the thing a host actually looks
 * for; the full list is one click away on the series page.
 */
export function programScheduleLine(program: DoorAccessProgramSummary): string {
  const parts: string[] = [fmtWindow(program.start_time, program.end_time)]
  if (program.next_night_date) {
    parts.push(`Next: ${fmtNightDate(program.next_night_date)}`)
  }
  parts.push(
    program.upcoming_night_count === 1
      ? "1 night scheduled"
      : `${program.upcoming_night_count} nights scheduled`
  )
  return parts.filter((s) => s.length > 0).join(" · ")
}

// ── D2-C: the row's at-a-glance numbers ─────────────────────────────────────

/**
 * ISO weekday (1 = Mon … 7 = Sun) for a "YYYY-MM-DD" string, parsed as a
 * calendar date. Same day-shift rule as fmtNightDate — never `new Date(iso)`.
 */
export function isoWeekday(iso: string): number | null {
  const parts = parseIsoDate(iso)
  if (!parts) return null
  return ((new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay() + 6) % 7) + 1
}

/**
 * How many of this program's nights are still to come in the CURRENT week
 * (today through Sunday), inclusive of tonight.
 *
 * Derived purely from days_of_week — no request, and correct for a program
 * whose nights straddle a weekend. An ended program has no nights left, whatever
 * its pattern says.
 */
export function nightsLeftThisWeek(
  program: DoorAccessProgramSummary,
  todayIso: string = easternToday(),
): number {
  if (!program.is_active) return 0
  const today = isoWeekday(todayIso)
  if (today == null) return 0
  if (program.date_range_end && program.date_range_end < todayIso) return 0
  return program.days_of_week.filter((d) => d >= today).length
}

/**
 * A WEEKLY ACCESS row's numbers.
 *
 * "This week's sold" is the number a host actually wants here and it is the one
 * this payload cannot answer: DoorAccessProgramSummary carries schedule and
 * pricing, and passes_sold lives per NIGHT inside GET /business/door-access/:id
 * — one request per row if the client tried. So the cell is STUBBED (muted, an
 * em dash, a hint that says why) and the gap is registered in
 * MISSING_ROW_AGGREGATES. The schedule half of the answer — how many nights are
 * left this week — IS derivable, so it renders for real beside it.
 */
export function accessRowStats(
  program: DoorAccessProgramSummary,
  todayIso: string = easternToday(),
): Array<{ label: string; value: string; pending?: boolean; hint?: string }> {
  const left = nightsLeftThisWeek(program, todayIso)
  return [
    {
      label: "sold this week",
      value: "-",
      pending: true,
      hint: "Per-night sales live on the program page. A week-scoped passes_sold on GET /business/door-access would fill this in.",
    },
    {
      label: left === 1 ? "night left this week" : "nights left this week",
      value: String(left),
    },
    { label: "tiers", value: String(program.tier_count) },
  ]
}

// ── Night presentation ──────────────────────────────────────────────────────

export type NightChip = { label: string; variant: "neutral" | "warning" | "danger" | "info" }

/**
 * The chips on a night row. Deliberately terse and additive — a night can be
 * closed AND customized AND unstamped at once, and a host needs to see all
 * three because each has a different fix.
 */
export function nightChips(night: DoorAccessNight): NightChip[] {
  const chips: NightChip[] = []
  if (night.is_closed) chips.push({ label: "Closed", variant: "danger" })
  if (night.status === "cancelled") chips.push({ label: "Cancelled", variant: "danger" })
  if (night.has_override) chips.push({ label: "Overridden", variant: "info" })
  // "Customized" means the night was edited through the generic event surface,
  // which stamped series_customized_at and EVICTED it from series-wide edits.
  // It is a warning, not a state the host chose here.
  if (night.is_customized) chips.push({ label: "Customized", variant: "warning" })
  if (!night.is_stamped) chips.push({ label: "Not generated yet", variant: "neutral" })
  return chips
}

/**
 * The ONE chip on a program-page preview card.
 *
 * A ledger of Closed / Overridden / Customized / Not on sale yet is what made
 * the list unreadable. Cards only say something when it changes what a host
 * does next: buyable now, or not generated yet.
 */
export function nightPreviewChip(night: DoorAccessNight): NightChip | null {
  if (!night.is_stamped || night.event_id == null) {
    return { label: "Not generated", variant: "neutral" }
  }
  if (night.is_closed || night.status === "cancelled") return null
  const status = (night.status ?? "").toLowerCase()
  if (status === "published" || status === "approved" || status === "active") {
    return { label: "On sale", variant: "info" }
  }
  return null
}

/** Lowest priced tier still on sale, or a short empty phrase. Never an em dash. */
export function nightPreviewPrice(night: DoorAccessNight): string {
  const priced = night.tiers.filter((t) => !t.is_disabled)
  if (priced.length === 0) return "No tiers on sale"
  const lowest = Math.min(...priced.map((t) => t.price_usd))
  return `From ${usdPrice(lowest)}`
}

/** Default view is a short strip; More nights reveals the rest of the fetch. */
export function visibleUpcomingNights<T>(
  nights: T[],
  expanded: boolean,
  limit: number = DEFAULT_NIGHT_PREVIEW_COUNT
): T[] {
  if (expanded) return nights
  return nights.slice(0, limit)
}

/**
 * Split the schedule at today. Past nights are reporting; upcoming nights are
 * the work surface, so they lead. Dates are compared as strings — they are
 * zero-padded Y-m-d, which sorts and compares correctly without parsing.
 */
export function splitNights(
  nights: DoorAccessNight[],
  todayIso: string
): { upcoming: DoorAccessNight[]; past: DoorAccessNight[] } {
  const upcoming: DoorAccessNight[] = []
  const past: DoorAccessNight[] = []
  for (const night of nights) {
    if (night.occurrence_date >= todayIso) upcoming.push(night)
    else past.push(night)
  }
  upcoming.sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date))
  // Most recent first — a host scanning history wants last night, not opening night.
  past.sort((a, b) => b.occurrence_date.localeCompare(a.occurrence_date))
  return { upcoming, past }
}

/** Today in US/Eastern as Y-m-d — the platform's day boundary, not the browser's. */
export function easternToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

// ── The per-night override editor's draft model ─────────────────────────────

/**
 * One tier's draft. `inherit_*` flags are what make the payload sparse: an
 * inherited field is sent as null (go back to the template) rather than as the
 * template's current value, which would silently FREEZE that night at today's
 * price the next time the template changed.
 */
/** Matches TICKET_DESCRIPTION_MAX on the create-series ticket editor. */
export const NIGHT_TICKET_DESCRIPTION_MAX = 64

export interface NightTierDraft {
  tier_key: string
  inherit_price: boolean
  price_usd: number | null
  inherit_quantity: boolean
  quantity: number | null
  is_disabled: boolean
  sold_out: boolean
  sort_order: number
  name: string
  inherit_name: boolean
  description: string | null
  inherit_description: boolean
  ticket_type: "paid" | "free"
  inherit_ticket_type: boolean
  max_per_person: number
  inherit_max_per_person: boolean
  valid_from_time: string | null
  valid_until_time: string | null
  valid_from_day_offset: number
  valid_until_day_offset: number
  inherit_scan_window: boolean
}

/** Create-series Add ticket tier values, applied to one night draft tier. */
export interface NightTierFormValues {
  name: string
  description: string | null
  ticket_type: "paid" | "free"
  price_usd: number
  quantity: number
  max_per_person: number
  valid_from_time: string | null
  valid_until_time: string | null
  valid_from_day_offset: number
  valid_until_day_offset: number
}

export interface NightDraft {
  inherit_times: boolean
  start_time: string
  end_time: string
  is_closed: boolean
  tiers: NightTierDraft[]
}

/**
 * Typing a price or capacity is the override. Matching the program default
 * again releases the pin (null on save) so the night keeps tracking the
 * template. Empty or non-finite values stay overridden so validation can
 * catch them instead of quietly inheriting.
 */
export function inheritIfMatchesTemplate(
  value: number | null,
  template: number | null | undefined
): boolean {
  return value != null && Number.isFinite(value) && value === template
}

export function inheritIfMatchesText(
  value: string | null | undefined,
  template: string | null | undefined
): boolean {
  return (value ?? "").trim() === (template ?? "").trim()
}

function scanWindowFingerprint(window: {
  valid_from_time: string | null | undefined
  valid_until_time: string | null | undefined
  valid_from_day_offset: number
  valid_until_day_offset: number
}): string {
  const from = toTimeInput(window.valid_from_time)
  const until = toTimeInput(window.valid_until_time)
  return JSON.stringify({
    from,
    until,
    from_off: from ? window.valid_from_day_offset : 0,
    until_off: until ? window.valid_until_day_offset : 0,
  })
}

export function inheritIfMatchesScan(
  current: {
    valid_from_time: string | null | undefined
    valid_until_time: string | null | undefined
    valid_from_day_offset: number
    valid_until_day_offset: number
  },
  template: {
    valid_from_time?: string | null
    valid_until_time?: string | null
    valid_from_day_offset?: number
    valid_until_day_offset?: number
  } | undefined
): boolean {
  return (
    scanWindowFingerprint(current) ===
    scanWindowFingerprint({
      valid_from_time: template?.valid_from_time,
      valid_until_time: template?.valid_until_time,
      valid_from_day_offset: template?.valid_from_day_offset ?? 0,
      valid_until_day_offset: template?.valid_until_day_offset ?? 0,
    })
  )
}

/**
 * Typing a door hour is the override. Matching the program window again
 * releases the pin (null on save) so the night keeps tracking the template.
 * Empty or unparseable times stay overridden so validation can catch them
 * instead of quietly inheriting.
 */
export function inheritIfMatchesTimes(
  start: string,
  end: string,
  templateStart: string,
  templateEnd: string
): boolean {
  const startInput = toTimeInput(start)
  const endInput = toTimeInput(end)
  return (
    startInput !== "" &&
    endInput !== "" &&
    startInput === toTimeInput(templateStart) &&
    endInput === toTimeInput(templateEnd)
  )
}

/** Apply an hours edit. Matching the program window un-pins both times. */
export function applyNightHours(
  draft: NightDraft,
  startTime: string,
  endTime: string,
  templateStart: string,
  templateEnd: string
): NightDraft {
  return {
    ...draft,
    start_time: startTime,
    end_time: endTime,
    inherit_times: inheritIfMatchesTimes(startTime, endTime, templateStart, templateEnd),
  }
}

/** Quiet Reset: put both times back on the program window. */
export function resetNightHours(
  draft: NightDraft,
  templateStart: string,
  templateEnd: string
): NightDraft {
  return {
    ...draft,
    start_time: templateStart,
    end_time: templateEnd,
    inherit_times: true,
  }
}

/**
 * Seed a draft from the night the server returned.
 *
 * A tier is "inheriting" when its effective value still equals the template's.
 * The server's is_overridden covers the tier as a whole, but price and
 * quantity override independently, so each is compared on its own.
 */
export function draftFromNight(night: DoorAccessNight, program: DoorAccessProgram): NightDraft {
  return {
    inherit_times: inheritIfMatchesTimes(
      night.start_time,
      night.end_time,
      program.start_time,
      program.end_time
    ),
    start_time: night.start_time,
    end_time: night.end_time,
    is_closed: night.is_closed,
    tiers: night.tiers.map((tier, index) => {
      const template = program.template_tickets.find((t) => t.tier_key === tier.tier_key)
      const name = tier.name
      const templateName = template?.name ?? tier.name
      const description = tier.description
      const templateDescription = template?.description ?? tier.description
      const ticketType = tier.ticket_type ?? nightTierTicketType(tier, program)
      const templateType = template?.ticket_type ?? ticketType
      const maxPerPerson = Number.isFinite(tier.max_per_person)
        ? tier.max_per_person
        : (template?.max_per_person ?? 0)
      const templateMax = template?.max_per_person ?? maxPerPerson
      const scan = resolveNightScanWindow(tier, template)
      return {
        tier_key: tier.tier_key,
        inherit_price: inheritIfMatchesTemplate(tier.price_usd, tier.template_price_usd),
        price_usd: tier.price_usd,
        inherit_quantity: inheritIfMatchesTemplate(tier.quantity, tier.template_quantity),
        quantity: tier.quantity,
        is_disabled: tier.is_disabled,
        sold_out: tier.sold_out,
        sort_order: Number.isFinite(tier.sort_order) ? tier.sort_order : index,
        name,
        inherit_name: inheritIfMatchesText(name, templateName),
        description,
        inherit_description: inheritIfMatchesText(description, templateDescription),
        ticket_type: ticketType,
        inherit_ticket_type: ticketType === templateType,
        max_per_person: maxPerPerson,
        inherit_max_per_person: inheritIfMatchesTemplate(maxPerPerson, templateMax),
        valid_from_time: scan.valid_from_time,
        valid_until_time: scan.valid_until_time,
        valid_from_day_offset: scan.valid_from_day_offset,
        valid_until_day_offset: scan.valid_until_day_offset,
        inherit_scan_window: inheritIfMatchesScan(scan, template),
      }
    }),
  }
}

function resolveNightScanWindow(
  tier: DoorAccessNightTier,
  template: DoorAccessTemplateTier | undefined
): {
  valid_from_time: string | null
  valid_until_time: string | null
  valid_from_day_offset: number
  valid_until_day_offset: number
} {
  return {
    valid_from_time:
      tier.valid_from_time !== undefined ? tier.valid_from_time : (template?.valid_from_time ?? null),
    valid_until_time:
      tier.valid_until_time !== undefined ? tier.valid_until_time : (template?.valid_until_time ?? null),
    valid_from_day_offset:
      tier.valid_from_day_offset !== undefined
        ? tier.valid_from_day_offset
        : (template?.valid_from_day_offset ?? 0),
    valid_until_day_offset:
      tier.valid_until_day_offset !== undefined
        ? tier.valid_until_day_offset
        : (template?.valid_until_day_offset ?? 0),
  }
}

/**
 * Build the PUT body from a draft.
 *
 * Always explicit: every override-capable field is sent either as a value or
 * as null. The endpoint treats null as "inherit" and upserts, so a save is
 * idempotent and the draft alone determines the outcome. Unsaved-changes
 * dirty is UI-only (leave prompts). It does not change what we PUT.
 */
export function buildNightOverridePayload(draft: NightDraft): NightOverridePayload {
  return {
    start_time: draft.inherit_times ? null : draft.start_time,
    end_time: draft.inherit_times ? null : draft.end_time,
    is_closed: draft.is_closed,
    tiers: draft.tiers.map((tier, index) => ({
      tier_key: tier.tier_key,
      price_usd: tier.inherit_price ? null : tier.price_usd,
      quantity: tier.inherit_quantity ? null : tier.quantity,
      is_disabled: tier.is_disabled,
      sold_out: tier.sold_out,
      sort_order: Number.isFinite(tier.sort_order) ? tier.sort_order : index,
      name: tier.inherit_name ? null : tier.name,
      description: tier.inherit_description ? null : tier.description,
      ticket_type: tier.inherit_ticket_type ? null : tier.ticket_type,
      max_per_person: tier.inherit_max_per_person ? null : tier.max_per_person,
      valid_from_time: tier.inherit_scan_window ? null : tier.valid_from_time,
      valid_until_time: tier.inherit_scan_window ? null : tier.valid_until_time,
      valid_from_day_offset: tier.inherit_scan_window ? null : tier.valid_from_day_offset,
      valid_until_day_offset: tier.inherit_scan_window ? null : tier.valid_until_day_offset,
    })),
  }
}

/** Does this draft still say anything the template doesn't? Drives "Reset". */
export function draftHasOverrides(draft: NightDraft): boolean {
  if (!draft.inherit_times || draft.is_closed) return true
  return draft.tiers.some(
    (t, i) =>
      !t.inherit_price ||
      !t.inherit_quantity ||
      !t.inherit_name ||
      !t.inherit_description ||
      !t.inherit_ticket_type ||
      !t.inherit_max_per_person ||
      !t.inherit_scan_window ||
      t.is_disabled ||
      t.sold_out ||
      t.sort_order !== i
  )
}

/**
 * Client-side validation, mirroring the server's rules so the Save button can
 * be honest rather than surfacing a 400 after the fact. Returns [] when valid.
 */
export function validateNightDraft(draft: NightDraft): string[] {
  const errors: string[] = []
  if (!draft.inherit_times) {
    if (!fmtTime(draft.start_time)) errors.push("Start time must be a valid time.")
    if (!fmtTime(draft.end_time)) errors.push("End time must be a valid time.")
  }
  for (const tier of draft.tiers) {
    if (!tier.inherit_price && (tier.price_usd == null || tier.price_usd < 0)) {
      errors.push("Prices cannot be negative.")
      break
    }
  }
  for (const tier of draft.tiers) {
    if (
      !tier.inherit_quantity &&
      (tier.quantity == null || tier.quantity < 0 || !Number.isInteger(tier.quantity))
    ) {
      errors.push("Capacity must be a whole number (0 = unlimited).")
      break
    }
  }
  for (const tier of draft.tiers) {
    if (!tier.inherit_name && !tier.name.trim()) {
      errors.push("Every access tier needs a name.")
      break
    }
  }
  for (const tier of draft.tiers) {
    if ((tier.description ?? "").length > NIGHT_TICKET_DESCRIPTION_MAX) {
      errors.push("Description must be 64 characters or fewer.")
      break
    }
  }
  for (const tier of draft.tiers) {
    if (
      !tier.inherit_max_per_person &&
      (tier.max_per_person < 0 || !Number.isInteger(tier.max_per_person))
    ) {
      errors.push("Max per person must be a whole number (0 = unlimited).")
      break
    }
  }
  for (const tier of draft.tiers) {
    if (tier.inherit_scan_window) continue
    const from = toTimeInput(tier.valid_from_time)
    const until = toTimeInput(tier.valid_until_time)
    if (from && until) {
      const start = tier.valid_from_day_offset * 1440 + clockMinutes(from)
      const end = tier.valid_until_day_offset * 1440 + clockMinutes(until)
      if (start >= end) {
        errors.push(
          `"${tier.name}": the scan window must end after it starts (tip: a window past midnight ends next morning)`
        )
        break
      }
    }
  }
  return errors
}

function clockMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  if (!match) return NaN
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Can this night still be edited here?
 *
 * A cancelled night is done, and a customized one has left the program — its
 * edits now belong on the event surface that captured it, and writing an
 * override would produce a change the host cannot see there.
 */
export function nightIsEditable(night: DoorAccessNight): boolean {
  return night.status !== "cancelled" && !night.is_customized
}

/**
 * A stamped night has a real events row. Guest checkout reads that row's
 * tickets. Price still writes through door_access_tier_overrides on Save night;
 * PUT /business/events/:id/tickets marks series_customized and is the wrong path.
 */
export function nightHasEventTickets(
  night: Pick<DoorAccessNight, "is_stamped" | "event_id">
): boolean {
  return night.is_stamped && night.event_id != null
}

/**
 * Hours and closed only. Not the night-page save: Save night always sends
 * buildNightOverridePayload so ticket price/qty stay on the override.
 */
export function buildNightHoursPayload(draft: NightDraft): NightOverridePayload {
  return {
    start_time: draft.inherit_times ? null : draft.start_time,
    end_time: draft.inherit_times ? null : draft.end_time,
    is_closed: draft.is_closed,
  }
}

/** Core skipped a ticket price restamp because this night already has sales. */
export function restampSignalsTimesOnlyHasSales(restamp: unknown): boolean {
  if (restamp == null) return false
  const blob = typeof restamp === "string" ? restamp : JSON.stringify(restamp)
  return blob.includes(TIMES_ONLY_HAS_SALES)
}

/**
 * Guest prices are not live when core returns restamp_error or
 * times_only_has_sales. The override may still be stored in the dash.
 */
export function nightGuestPricesNotLive(
  result: Pick<NightOverrideResult, "restamp" | "restamp_error">
): boolean {
  if (result.restamp_error) return true
  return restampSignalsTimesOnlyHasSales(result.restamp)
}

export function nightSaveFeedback(
  result: Pick<NightOverrideResult, "restamp" | "restamp_error">
): { live: boolean; message: string } {
  if (!nightGuestPricesNotLive(result)) {
    return { live: true, message: NIGHT_SAVE_LIVE }
  }
  const extra = (result.restamp_error ?? "").trim()
  if (extra && extra !== NIGHT_SAVE_NOT_LIVE) {
    return { live: false, message: `${NIGHT_SAVE_NOT_LIVE} ${extra}` }
  }
  return { live: false, message: NIGHT_SAVE_NOT_LIVE }
}

export function nightTierTicketType(
  tier: Pick<DoorAccessNightTier, "tier_key" | "price_usd">,
  program: Pick<DoorAccessProgram, "template_tickets">
): "paid" | "free" {
  const template = program.template_tickets.find((t) => t.tier_key === tier.tier_key)
  if (template) return template.ticket_type
  return (tier.price_usd ?? 0) === 0 ? "free" : "paid"
}

/** Apply a Manage Tickets-style price/quantity edit to one override tier. */
export function applyOverrideTicketForm(
  draft: NightDraft,
  tierKey: string,
  priceUsd: number,
  quantity: number,
  templatePrice: number | null | undefined,
  templateQuantity: number | null | undefined
): NightDraft {
  return {
    ...draft,
    tiers: draft.tiers.map((tier) =>
      tier.tier_key === tierKey
        ? {
            ...tier,
            price_usd: priceUsd,
            quantity,
            inherit_price: inheritIfMatchesTemplate(priceUsd, templatePrice),
            inherit_quantity: inheritIfMatchesTemplate(quantity, templateQuantity),
          }
        : tier
    ),
  }
}

export function applyRecurringNightTier(
  draft: NightDraft,
  tierKey: string,
  values: NightTierFormValues,
  template:
    | {
        name?: string
        description?: string | null
        ticket_type?: "paid" | "free"
        price_usd?: number | null
        quantity?: number | null
        max_per_person?: number | null
        valid_from_time?: string | null
        valid_until_time?: string | null
        valid_from_day_offset?: number
        valid_until_day_offset?: number
      }
    | undefined
): NightDraft {
  return {
    ...draft,
    tiers: draft.tiers.map((tier) =>
      tier.tier_key === tierKey
        ? {
            ...tier,
            name: values.name,
            inherit_name: inheritIfMatchesText(values.name, template?.name ?? tier.name),
            description: values.description,
            inherit_description: inheritIfMatchesText(
              values.description,
              template?.description ?? tier.description
            ),
            ticket_type: values.ticket_type,
            inherit_ticket_type: values.ticket_type === (template?.ticket_type ?? tier.ticket_type),
            price_usd: values.price_usd,
            quantity: values.quantity,
            inherit_price: inheritIfMatchesTemplate(values.price_usd, template?.price_usd),
            inherit_quantity: inheritIfMatchesTemplate(values.quantity, template?.quantity),
            max_per_person: values.max_per_person,
            inherit_max_per_person: inheritIfMatchesTemplate(
              values.max_per_person,
              template?.max_per_person ?? tier.max_per_person
            ),
            valid_from_time: values.valid_from_time,
            valid_until_time: values.valid_until_time,
            valid_from_day_offset: values.valid_from_day_offset,
            valid_until_day_offset: values.valid_until_day_offset,
            inherit_scan_window: inheritIfMatchesScan(values, template),
          }
        : tier
    ),
  }
}

export function parseRecurringNightTier(row: {
  name: string
  description: string
  ticket_type: "paid" | "free"
  priceInput: string
  quantityInput: string
  maxPerPersonInput: string
  valid_from_time: string
  valid_until_time: string
  valid_from_day_offset: number
  valid_until_day_offset: number
}): { values: NightTierFormValues; error: string | null } {
  const name = row.name.trim()
  if (!name) {
    return {
      values: emptyNightTierFormValues(),
      error: "Every access tier needs a name.",
    }
  }
  if (row.description.length > NIGHT_TICKET_DESCRIPTION_MAX) {
    return {
      values: emptyNightTierFormValues(),
      error: "Description must be 64 characters or fewer.",
    }
  }
  const priceUsd = row.ticket_type === "free" ? 0 : parseFloat(row.priceInput) || 0
  const quantity = parseInt(row.quantityInput, 10) || 0
  const maxPerPerson = parseInt(row.maxPerPersonInput, 10) || 0
  const numbers = parseOverrideTicketNumbers(String(priceUsd), String(quantity))
  if (numbers.error) {
    return { values: emptyNightTierFormValues(), error: numbers.error }
  }
  if (maxPerPerson < 0 || !Number.isInteger(maxPerPerson)) {
    return {
      values: emptyNightTierFormValues(),
      error: "Max per person must be a whole number (0 = unlimited).",
    }
  }
  const validFromTime = row.valid_from_time ? fromTimeInput(row.valid_from_time) || row.valid_from_time : null
  const validUntilTime = row.valid_until_time ? fromTimeInput(row.valid_until_time) || row.valid_until_time : null
  if (validFromTime && validUntilTime) {
    const start = row.valid_from_day_offset * 1440 + clockMinutes(toTimeInput(validFromTime))
    const end = row.valid_until_day_offset * 1440 + clockMinutes(toTimeInput(validUntilTime))
    if (start >= end) {
      return {
        values: emptyNightTierFormValues(),
        error: `"${name}": the scan window must end after it starts (tip: a window past midnight ends next morning)`,
      }
    }
  }
  return {
    values: {
      name,
      description: row.description.trim() || null,
      ticket_type: row.ticket_type,
      price_usd: numbers.price_usd,
      quantity: numbers.quantity,
      max_per_person: maxPerPerson,
      valid_from_time: validFromTime,
      valid_until_time: validUntilTime,
      valid_from_day_offset: validFromTime ? row.valid_from_day_offset : 0,
      valid_until_day_offset: validUntilTime ? row.valid_until_day_offset : 0,
    },
    error: null,
  }
}

function emptyNightTierFormValues(): NightTierFormValues {
  return {
    name: "",
    description: null,
    ticket_type: "paid",
    price_usd: 0,
    quantity: 0,
    max_per_person: 0,
    valid_from_time: null,
    valid_until_time: null,
    valid_from_day_offset: 0,
    valid_until_day_offset: 0,
  }
}

export function toggleNightTierDisabled(draft: NightDraft, tierKey: string): NightDraft {
  return {
    ...draft,
    tiers: draft.tiers.map((tier) =>
      tier.tier_key === tierKey ? { ...tier, is_disabled: !tier.is_disabled } : tier
    ),
  }
}

export function toggleNightTierSoldOut(draft: NightDraft, tierKey: string): NightDraft {
  return {
    ...draft,
    tiers: draft.tiers.map((tier) =>
      tier.tier_key === tierKey ? { ...tier, sold_out: !tier.sold_out } : tier
    ),
  }
}

/**
 * Apply a Manage Tickets-style drag reorder as a night draft. sort_order is
 * the 0-based buyer order we PUT. Missing keys stay at the end so a partial
 * list cannot drop a tier.
 */
export function reorderNightTiers(draft: NightDraft, orderedKeys: string[]): NightDraft {
  const byKey = new Map(draft.tiers.map((tier) => [tier.tier_key, tier]))
  const next: NightTierDraft[] = []
  for (const key of orderedKeys) {
    const tier = byKey.get(key)
    if (!tier) continue
    next.push(tier)
    byKey.delete(key)
  }
  for (const leftover of byKey.values()) next.push(leftover)
  return {
    ...draft,
    tiers: next.map((tier, index) => ({ ...tier, sort_order: index })),
  }
}

function nightDraftFingerprint(draft: NightDraft): string {
  return JSON.stringify({
    inherit_times: draft.inherit_times,
    start_time: toTimeInput(draft.start_time),
    end_time: toTimeInput(draft.end_time),
    is_closed: draft.is_closed,
    tiers: draft.tiers.map((tier) => ({
      tier_key: tier.tier_key,
      inherit_price: tier.inherit_price,
      price_usd: tier.price_usd,
      inherit_quantity: tier.inherit_quantity,
      quantity: tier.quantity,
      is_disabled: tier.is_disabled,
      sold_out: !!tier.sold_out,
      sort_order: tier.sort_order,
      name: tier.name,
      inherit_name: tier.inherit_name,
      description: tier.description,
      inherit_description: tier.inherit_description,
      ticket_type: tier.ticket_type,
      inherit_ticket_type: tier.inherit_ticket_type,
      max_per_person: tier.max_per_person,
      inherit_max_per_person: tier.inherit_max_per_person,
      valid_from_time: toTimeInput(tier.valid_from_time),
      valid_until_time: toTimeInput(tier.valid_until_time),
      valid_from_day_offset: tier.valid_from_day_offset,
      valid_until_day_offset: tier.valid_until_day_offset,
      inherit_scan_window: tier.inherit_scan_window,
    })),
  })
}

/** True when the night page has drafts that Save night has not committed. */
export function nightDraftIsDirty(current: NightDraft, baseline: NightDraft): boolean {
  return nightDraftFingerprint(current) !== nightDraftFingerprint(baseline)
}

export function parseOverrideTicketNumbers(
  price: string,
  quantity: string
): { price_usd: number; quantity: number; error: string | null } {
  const priceUsd = Number(price)
  const quantityNum = Number(quantity)
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { price_usd: 0, quantity: 0, error: "Prices cannot be negative." }
  }
  if (!Number.isFinite(quantityNum) || quantityNum < 0 || !Number.isInteger(quantityNum)) {
    return { price_usd: 0, quantity: 0, error: "Capacity must be a whole number (0 = unlimited)." }
  }
  return { price_usd: priceUsd, quantity: quantityNum, error: null }
}
