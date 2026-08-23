/**
 * L1/L2 — request-a-school.
 *
 * How a new college gets on the live list:
 *   1. A student or host files a request from /request-school (or the campus
 *      picker / coming-soon campus page). This web repo emails the team.
 *   2. Adding the school to the catalog is API-only. The live picker reads
 *      Laravel POST https://bizzy-deals.com/api/university-list
 *      (see lib/universities.ts). There is no write endpoint in this repo.
 *   3. Until that row exists, the school cannot appear in signup, the app
 *      campus picker, or a published /[campus] page.
 *
 * API GAP (documented on purpose):
 *   POST /api/request-school on this site is an email hook, not a catalog
 *   write. A catalog insert still happens in Laravel (universities table /
 *   admin). Do not pretend the form publishes the campus.
 */

export const REQUEST_SCHOOL_PATH = "/request-school"
export const REQUEST_SCHOOL_API_PATH = "/api/request-school"

export const REQUEST_SCHOOL_HEADING = "Request your school"
export const COMING_SOON_HEADING = "Coming soon"

export const REQUEST_SCHOOL_BLURB =
  "Bizzy launches campus by campus. Tell us your school and we will put it on the list the team reviews."

export const COMING_SOON_BLURB =
  "Bizzy is not live here yet. Request this school so it moves up the launch list. You will not be sent to a dead end."

export const CATALOG_API_GAP_NOTE =
  "Requests reach the Bizzy team by email. Adding a college to the live campus list is a catalog change on the university API, not something this form can publish itself."

export function requestSchoolHref(school?: string | null): string {
  const name = (school ?? "").trim()
  if (!name) return REQUEST_SCHOOL_PATH
  return `${REQUEST_SCHOOL_PATH}?school=${encodeURIComponent(name)}`
}

export function campusPickerEmptyHint(query: string): string {
  const q = query.trim()
  if (!q) return "No campuses found. Request your school if it is not on the list."
  return `No campuses match "${q}". Request this school so the team can add it.`
}

export function comingSoonTitle(schoolName: string): string {
  const name = schoolName.trim()
  return name ? `${COMING_SOON_HEADING} at ${name}` : COMING_SOON_HEADING
}

export function normalizeRequestedSchool(raw: unknown): string {
  if (typeof raw !== "string") return ""
  return raw.replace(/\s+/g, " ").trim().slice(0, 120)
}

export function isValidRequestSchoolPayload(input: {
  name?: unknown
  email?: unknown
  school?: unknown
}): { ok: true; name: string; email: string; school: string } | { ok: false; error: string } {
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email = typeof input.email === "string" ? input.email.trim() : ""
  const school = normalizeRequestedSchool(input.school)
  if (!name) return { ok: false, error: "Name is required" }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "A valid email is required" }
  }
  if (!school) return { ok: false, error: "School name is required" }
  return { ok: true, name, email, school }
}
