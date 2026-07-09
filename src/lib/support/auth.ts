// Resolves who the support bot is talking to, by AUTH TYPE — one endpoint,
// two audiences:
//
//   • student  — the iOS app WebView loads /support-chat?token=<sanctum token>
//                and sends it as `Authorization: Bearer <token>`. Verified
//                against the Laravel API (POST /api/profile).
//   • business — the web dashboard mounts the chat behind the existing business
//                session (the httpOnly `biz_token` cookie set by the Node API).
//                Verified by mirroring the dashboard's own auth/me call
//                (GET /business/auth/me) server-side, forwarding the cookie.
//
// A valid session in EITHER form is the defense against the endpoint being
// farmed as a free LLM. Rate limits, kill switch, and usage logging apply to
// both audiences (see route.ts).

export type SupportAudience = "student" | "business"

export interface SupportUser {
  id: string
  audience: SupportAudience
  name: string | null
  school: string | null // students only
  business: string | null // businesses only (business/venue name)
  businessId: string | null // businesses only (numeric business id, for ingest)
}

// Verified sessions are cached in-memory for 10 minutes so a conversation
// doesn't hit the backing API once per message. Serverless caveat: the cache is
// per-instance, which only means occasional extra verify calls — never a
// security gap. Keyed by the raw credential (token or biz_token value).
const cache = new Map<string, { user: SupportUser; expires: number }>()
const TTL_MS = 10 * 60 * 1000

/**
 * Coerce a raw id to its positive-integer string form, or null if it isn't one.
 * An unidentified user must never be minted: a null id fails verification, so
 * such a request can't share a rate-limit bucket (keyed `${audience}:${id}`) or
 * reach the ingest endpoint (which 400s on a non-integer user_id).
 */
export function toPositiveIntId(raw: unknown): string | null {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN
  return Number.isInteger(n) && n > 0 ? String(n) : null
}

/**
 * Map a Laravel POST /api/profile body to a SupportUser. Shape is env-dependent:
 * the dev API nests the user under `profile` (top-level keys: deal_used,
 * amount_saved, rank, profile); other shapes wrap as `{ data }` or return the
 * user flat — try all three, in that order. A body without a positive-integer
 * id fails verification (returns null) rather than minting an "unknown" user.
 */
export function parseStudentProfile(body: unknown): SupportUser | null {
  const b = body as Record<string, unknown> | null | undefined
  const u = (b?.profile ?? b?.data ?? b) as Record<string, unknown> | null | undefined
  if (!u || typeof u !== "object") return null
  const id = toPositiveIntId(u.id)
  if (!id) return null
  const university = u.university as { name?: string } | undefined
  return {
    id,
    audience: "student",
    name: (u.full_name as string) ?? (u.name as string) ?? null,
    school: university?.name ?? (u.university_name as string) ?? null,
    business: null,
    businessId: null,
  }
}

/**
 * Map a Node GET /business/auth/me body to a SupportUser. The user id lives
 * under `user.id`; the business id under `business.business_id` (NOT `business.id`).
 * A body without a positive-integer user id fails verification.
 */
export function parseBusinessMe(body: unknown): SupportUser | null {
  const b = body as Record<string, unknown> | null | undefined
  const u = b?.user as Record<string, unknown> | null | undefined
  const biz = b?.business as Record<string, unknown> | null | undefined
  if (!u || typeof u !== "object") return null
  const id = toPositiveIntId(u.id)
  if (!id) return null
  return {
    id,
    audience: "business",
    name: (u.full_name as string) ?? (u.name as string) ?? null,
    school: null,
    business: biz && typeof biz === "object" ? ((biz.name as string) ?? null) : null,
    businessId:
      biz && typeof biz === "object" ? toPositiveIntId(biz.business_id ?? biz.id) : null,
  }
}

/**
 * Picks the audience by which credential the request carries. A Bearer token
 * ⇒ student (Sanctum); otherwise fall back to the business session cookie.
 */
export async function resolveSupportUser(req: Request): Promise<SupportUser | null> {
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
  if (bearer) return verifyStudentToken(bearer)
  return verifyBusinessSession(req.headers.get("cookie") ?? "")
}

/** Student path: verify a Laravel Sanctum token via POST {LARAVEL_API_URL}/api/profile. */
export async function verifyStudentToken(token: string): Promise<SupportUser | null> {
  if (!token || token.length > 500) return null

  // Local-dev bypass ONLY. Never set SUPPORT_CHAT_DEV_BYPASS on Vercel.
  // "1" or "student" ⇒ a fake student; "business" ⇒ handled in verifyBusinessSession.
  const bypass = process.env.SUPPORT_CHAT_DEV_BYPASS
  if ((bypass === "1" || bypass === "student") && process.env.NODE_ENV !== "production") {
    return {
      id: "dev",
      audience: "student",
      name: "Dev Tester",
      school: "FGCU",
      business: null,
      businessId: null,
    }
  }

  const hit = cache.get(`student:${token}`)
  if (hit && hit.expires > Date.now()) return hit.user

  // LARAVEL_API_URL is the base for POST {base}/api/profile — set it WITHOUT a
  // trailing /api. Fallback below is LOCAL dev only.
  // ┌──────────────────────────────────────────────────────────────────────┐
  // │ DEV (l2gp Vercel project):  http://3.80.143.224   ← dev Laravel EC2   │
  // │ PROD (com-bizzyu-web):      https://bizzy-deals.com                    │
  // │ LOCAL:                      http://127.0.0.1:8001                      │
  // └──────────────────────────────────────────────────────────────────────┘
  // ⚠️ NEVER set https://bizzy-deals.com (PROD) on the l2gp/dev project — that
  //    verifies dev app tokens against the PROD user table. l2gp MUST use the
  //    dev EC2 (http://3.80.143.224). Matches the CHECKOUT_REDIRECT_BASE /
  //    LARAVEL_API_URL convention already in next.config.ts. See SUPPORT_CHAT_SETUP.md.
  const base = process.env.LARAVEL_API_URL || "http://127.0.0.1:8001"
  try {
    const res = await fetch(`${base}/api/profile`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const body = await res.json().catch(() => null)
    const user = parseStudentProfile(body)
    if (!user) return null
    cache.set(`student:${token}`, { user, expires: Date.now() + TTL_MS })
    return user
  } catch {
    return null
  }
}

/**
 * Business path: verify the dashboard's own session by calling the Node API's
 * GET /business/auth/me with the incoming Cookie header forwarded verbatim.
 * That endpoint's middleware reads the httpOnly `biz_token` access-token cookie
 * (see com.bizzyu.services middleware/businessAuth.ts) — exactly what the
 * dashboard's api-client relies on. INTERNAL_API_URL is the server-to-server
 * base for the Node API (same var next.config.ts uses for the /api/proxy rewrite).
 */
export async function verifyBusinessSession(cookieHeader: string): Promise<SupportUser | null> {
  // Local-dev bypass ONLY: SUPPORT_CHAT_DEV_BYPASS=business ⇒ a fake business owner.
  if (process.env.SUPPORT_CHAT_DEV_BYPASS === "business" && process.env.NODE_ENV !== "production") {
    return {
      id: "dev-biz",
      audience: "business",
      name: "Dev Owner",
      school: null,
      business: "Dev Venue Co.",
      businessId: "dev-biz-1",
    }
  }

  // No business access-token cookie ⇒ no business session; don't bother the API.
  const bizToken = /(?:^|;\s*)biz_token=([^;]+)/.exec(cookieHeader)?.[1]
  if (!bizToken) return null

  const hit = cache.get(`business:${bizToken}`)
  if (hit && hit.expires > Date.now()) return hit.user

  const base = process.env.INTERNAL_API_URL || "http://localhost:3000"
  try {
    const res = await fetch(`${base}/business/auth/me`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const body = await res.json().catch(() => null)
    const user = parseBusinessMe(body)
    if (!user) return null
    cache.set(`business:${bizToken}`, { user, expires: Date.now() + TTL_MS })
    return user
  } catch {
    return null
  }
}
