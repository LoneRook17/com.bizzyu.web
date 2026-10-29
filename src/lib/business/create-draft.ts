/**
 * BETA biz-dash shell, slice 1: the hybrid Create event flow.
 *
 * A short modal (name · starts · ends · venue) → "Create draft" → the editor
 * for that id. This is the modal's whole contract with POST /business/events,
 * which already accepts a minimal row when `save_as_draft` is set: the route
 * requires name, venue_name, type, start_date_time and end_date_time, and the
 * service writes status = 'draft' before any moderation or publish gate runs.
 * A Ticketed event must carry at least one tier at create (services rule), so
 * the draft ships with the same placeholder General Admission tier the create
 * wizard seeds on its first step; the host prices it in the editor's Tickets
 * step. The draft is REAL — no prefill fallback, no new backend.
 */

/** The wizard's default tier (EventForm EMPTY_TICKET), so the draft is a valid Ticketed event. */
export const DRAFT_PLACEHOLDER_TIER = {
  name: "General Admission",
  description: "",
  price_usd: 0,
  quantity: 0,
  max_per_person: 0,
  ticket_type: "paid",
} as const

export interface DraftFields {
  name: string
  /** `YYYY-MM-DDTHH:MM`, the shape DateTimeField emits. */
  start_date_time: string
  end_date_time: string
  venue_id: number | null
}

export const DRAFT_NAME_MAX = 100

/** Default length of a night when the host has only picked a start. */
export const DEFAULT_DRAFT_HOURS = 4

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

/** `start` + `hours`, same `YYYY-MM-DDTHH:MM` shape. "" for an unparseable start. */
export function defaultEndForStart(start: string, hours = DEFAULT_DRAFT_HOURS): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(start)
  if (!m) return ""
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  if (Number.isNaN(d.getTime())) return ""
  d.setHours(d.getHours() + hours)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Same rules as EventForm's Details step, so the editor never rejects what the modal accepted. */
export function validateDraftFields(f: DraftFields, now: Date = new Date()): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!f.name.trim()) errs.name = "Event name is required"
  else if (f.name.length > DRAFT_NAME_MAX) errs.name = `Event name must be ${DRAFT_NAME_MAX} characters or less`
  if (!f.venue_id) errs.venue_id = "Pick a venue"
  if (!f.start_date_time) errs.start_date_time = "Start date is required"
  else if (new Date(f.start_date_time) < now) errs.start_date_time = "Start date must be in the future"
  if (!f.end_date_time) errs.end_date_time = "End date is required"
  else if (f.start_date_time && f.start_date_time >= f.end_date_time) {
    errs.end_date_time = "End date must be after start date"
  }
  return errs
}

/** The POST body. `save_as_draft: true` is what keeps it a draft. */
export function buildDraftPayload(
  f: DraftFields,
  venue: { id: number; name: string; address?: string | null },
): Record<string, unknown> {
  return {
    name: f.name.trim(),
    description: "",
    venue_id: venue.id,
    venue_name: venue.name,
    venue_address: venue.address || "",
    start_date_time: f.start_date_time,
    end_date_time: f.end_date_time,
    type: "Ticketed",
    is_21_plus: false,
    is_recurring: false,
    tickets: [{ ...DRAFT_PLACEHOLDER_TIER }],
    save_as_draft: true,
  }
}

/** Where the modal sends the host once the draft exists: the editor for that id. */
export function draftEditorHref(eventId: number | string): string {
  return `/business/events/${eventId}/edit`
}
