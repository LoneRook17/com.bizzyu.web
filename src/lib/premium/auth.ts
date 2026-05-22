// Premium 2.0 Phase 3 — web-side auth helpers for the bizzyu.com/premium flow.
// PRD §7.2 / §12.8 — phone-OTP only, bearer-token session.

const TOKEN_KEY = "bizzy_web_premium_token"
const USER_KEY = "bizzy_web_premium_user"

export interface PremiumWebUser {
  id: number
  full_name: string
  email: string
  phone_number: string
  university_id: number | null
}

export function saveSession(token: string, user: PremiumWebUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): PremiumWebUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PremiumWebUser
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// Convenience for Phase 4+ when calling protected endpoints.
export function authHeader(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
