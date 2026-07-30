// MC-UI — pure logic for the venue Campus picker (#14 per-venue campus, web UI).
// Kept dependency-free so it runs under the repo's `node --test` convention (the
// runner strips TS types but cannot transpile JSX, so anything a test imports
// must stay .ts). See src/lib/business/email-change.ts for the same shape: the
// .tsx renders these values and nothing else, so the mapping to/from the API is
// pinned here.
//
// API contract — com.bizzyu.services/src/routes/businessVenues.ts:
//   POST  /business/venues       body.campus_id: number → validated against real
//                                universities; null / "" / ABSENT → inherit the
//                                business's campus.
//   PATCH /business/venues/:id    body.campus_id: number → set (validated);
//                                null / "" → reset to NULL (inherit at read via
//                                COALESCE); ABSENT → left unchanged.
//   400 { message } when campus_id is non-numeric or not a known university.
//
// Campus list source (NOT hardcoded): GET /business/auth/campuses — the same
// endpoint the signup campus picker reads (see
// src/app/business/_legacy/(auth)/signup/page.tsx).

export interface CampusOption {
  id: number
  name: string
  full_name?: string | null
}

/** The <select> value that means "inherit the business's campus". */
export const SAME_AS_BUSINESS_VALUE = ""

// Field copy — pinned here so the picker's wording is asserted at the source.
export const CAMPUS_FIELD_LABEL = "Campus"
export const CAMPUS_FIELD_HELPER =
  "Events and line skips at this venue appear on this campus's feed."
export const SAME_AS_BUSINESS_LABEL = "Same as business (default)"

/**
 * venue.campus_id → the <select>'s string value (edit prefill).
 * NULL/absent (inherit) → "" ("Same as business"); an explicit id → its string.
 * A junk id degrades to "Same as business" rather than a value no option owns.
 */
export function campusSelectValue(campusId: number | null | undefined): string {
  if (campusId === null || campusId === undefined) return SAME_AS_BUSINESS_VALUE
  if (!Number.isInteger(campusId) || campusId <= 0) return SAME_AS_BUSINESS_VALUE
  return String(campusId)
}

/**
 * The <select> value → the campus_id to send on save.
 * "" ("Same as business") → null: on create the server inherits, on edit it
 * resets the venue to inherit. A real selection → its numeric id. Anything
 * unparseable falls back to null (inherit) rather than shipping a bad id that
 * the endpoint would only 400 on anyway.
 */
export function venueCampusPayload(selectValue: string): number | null {
  const trimmed = (selectValue ?? "").trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Option label: the proper name when present, else the short handle. */
export function campusOptionLabel(campus: CampusOption): string {
  return campus.full_name?.trim() || campus.name
}

/**
 * Owner-facing copy for a failed venue save. A 400 from these endpoints is
 * descriptive (campus validation, name-required) and only the server knows
 * which cause fired, so its message wins; everything else gets the generic
 * retry line the form already used.
 */
export function venueSaveErrorMessage(
  status: number | null | undefined,
  serverMessage: string | undefined,
  isEdit: boolean,
): string {
  if (status === 400) {
    return serverMessage?.trim() || genericFailure(isEdit)
  }
  return genericFailure(isEdit)
}

function genericFailure(isEdit: boolean): string {
  return isEdit
    ? "Failed to update venue. Please try again."
    : "Failed to create venue. Please try again."
}
