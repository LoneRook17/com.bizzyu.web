// Verifies the app's Sanctum token against the Laravel API (POST /api/profile).
// The chat page is loaded inside the iOS app's WebView with ?token=<sanctum token>;
// every chat request must carry it. Without a valid token the bot won't answer —
// that's the main defense against the endpoint being farmed as a free LLM.

export interface SupportUser {
  id: string
  name: string | null
  school: string | null
}

// Verified tokens are cached in-memory for 10 minutes so a conversation doesn't
// hit Laravel once per message. Serverless caveat: the cache is per-instance,
// which only means occasional extra verify calls — never a security gap.
const cache = new Map<string, { user: SupportUser; expires: number }>()
const TTL_MS = 10 * 60 * 1000

export async function verifySupportToken(token: string): Promise<SupportUser | null> {
  if (!token || token.length > 500) return null

  // Local-dev bypass ONLY. Never set SUPPORT_CHAT_DEV_BYPASS on Vercel.
  if (process.env.SUPPORT_CHAT_DEV_BYPASS === "1" && process.env.NODE_ENV !== "production") {
    return { id: "dev", name: "Dev Tester", school: "FGCU" }
  }

  const hit = cache.get(token)
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
    // Laravel wraps responses as { message, data }. Be tolerant of shape —
    // a valid 200 with a user payload is what matters.
    const u = body?.data ?? body
    if (!u || typeof u !== "object") return null
    const user: SupportUser = {
      id: String(u.id ?? "unknown"),
      name: u.full_name ?? u.name ?? null,
      school: u.university?.name ?? u.university_name ?? null,
    }
    cache.set(token, { user, expires: Date.now() + TTL_MS })
    return user
  } catch {
    return null
  }
}
