/**
 * The user-facing name for the weekly door product. ONE definition.
 *
 * Renamed from "Weekly Access" so it matches the Flutter app and reads as
 * cover, not generic access. Every host- and student-facing string that names
 * this product should read from here.
 *
 * DISPLAY only. Do not use these to rename the API path (`/business/door-access`),
 * program_kind (`door_access`), response fields (`access_kind`), or routes
 * (`/business/door-access`, `/venue/:id#door-access`). Those stay.
 */

/** Section / nav / tab / fallback title. Title case. */
export const WEEKLY_ACCESS_SECTION_LABEL = "Weekly Cover"

/** F9 card chip on a program row. The shouty form of the section label. */
export const WEEKLY_ACCESS_TYPE_LABEL = WEEKLY_ACCESS_SECTION_LABEL.toUpperCase()

/**
 * The creation-flow name (D-P5). Matches Flutter create_choice_page.dart.
 * Same words as the section label so create, lists, and the public page agree.
 */
export const WEEKLY_ACCESS_CREATION_LABEL = WEEKLY_ACCESS_SECTION_LABEL

/**
 * Series 23 and other Weekly Cover rows can still arrive as program_kind=event
 * with access_kind=event. The name is the remaining product signal. Do not
 * treat a generic "Cover" show as Weekly Cover.
 */
export function looksLikeWeeklyCoverName(name: string | null | undefined): boolean {
  return /weekly\s*cover/i.test(String(name ?? ""))
}
