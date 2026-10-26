/**
 * Server-side resolution of the business dashboard session (audit F29).
 *
 * A Next route handler that wants to know WHO is calling it cannot trust the
 * request body for that. The dashboard's identity lives in the httpOnly
 * `biz_token` cookie the Node API sets on login (path "/", so the browser
 * sends it to /api/* on this origin too). This mirrors what the dashboard's
 * own api-client does: forward the Cookie header to GET /business/auth/me and
 * read the user + business the API vouches for.
 *
 * Same approach as lib/support/auth.ts (verifyBusinessSession), kept separate
 * so the support bot's SupportUser shape stays untouched; this one also carries
 * the user's email, which the admin notification names as "created by".
 *
 * `parseBusinessSession` / `readBizToken` are pure and unit-tested; the fetch
 * wrappers are thin. No `@/` imports so this loads under `node --test`.
 */

export interface BusinessSession {
  userId: number
  email: string
  fullName: string
  businessId: number
  businessName: string
  businessEmail: string | null
}

export interface BusinessVenueSummary {
  id: number
  name: string
  address: string | null
}

function positiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

function str(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : ""
}

/** Map a GET /business/auth/me body to a session. Any missing id ⇒ null. */
export function parseBusinessSession(body: unknown): BusinessSession | null {
  const b = body as Record<string, unknown> | null | undefined
  const u = b?.user as Record<string, unknown> | null | undefined
  const biz = b?.business as Record<string, unknown> | null | undefined
  if (!u || typeof u !== "object" || !biz || typeof biz !== "object") return null
  const userId = positiveInt(u.id)
  const businessId = positiveInt(biz.business_id ?? biz.id)
  if (!userId || !businessId) return null
  const email = str(u.email)
  if (!email) return null
  return {
    userId,
    email,
    fullName: str(u.full_name) || str(u.name),
    businessId,
    businessName: str(biz.name),
    businessEmail: str(biz.email) || null,
  }
}

export function readBizToken(cookieHeader: string): string | null {
  return /(?:^|;\s*)biz_token=([^;]+)/.exec(cookieHeader ?? "")?.[1] ?? null
}

// Verified sessions are cached briefly per access token so a burst of calls
// from one dashboard tab doesn't hit the API each time. Per serverless
// instance; a miss only costs one upstream GET, never a security gap.
const cache = new Map<string, { session: BusinessSession; expires: number }>()
const TTL_MS = 5 * 60 * 1000

function apiBase(): string {
  return process.env.INTERNAL_API_URL || "http://localhost:3000"
}

export async function fetchBusinessSession(cookieHeader: string): Promise<BusinessSession | null> {
  const token = readBizToken(cookieHeader)
  if (!token) return null
  const hit = cache.get(token)
  if (hit && hit.expires > Date.now()) return hit.session
  try {
    const res = await fetch(`${apiBase()}/business/auth/me`, {
      method: "GET",
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const session = parseBusinessSession(await res.json().catch(() => null))
    if (!session) return null
    if (cache.size > 2000) cache.clear()
    cache.set(token, { session, expires: Date.now() + TTL_MS })
    return session
  } catch {
    return null
  }
}

/**
 * Resolve one of the caller's OWN venues by id via GET /business/venues with
 * the same cookie. A venue id that isn't in that list (another business's
 * venue, or garbage) resolves to null, so the notification can never name a
 * venue the caller doesn't manage.
 */
export async function fetchBusinessVenue(cookieHeader: string, venueId: number): Promise<BusinessVenueSummary | null> {
  if (!readBizToken(cookieHeader)) return null
  try {
    const res = await fetch(`${apiBase()}/business/venues`, {
      method: "GET",
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const body = (await res.json().catch(() => null)) as { venues?: unknown } | null
    const venues = Array.isArray(body?.venues) ? (body!.venues as Record<string, unknown>[]) : []
    const v = venues.find((x) => positiveInt(x?.id) === venueId)
    if (!v) return null
    return { id: venueId, name: str(v.name), address: str(v.address) || null }
  } catch {
    return null
  }
}
