// Pure logic for the business email-change form (HF-2), kept dependency-free so
// it runs under the repo's `node --test` convention — the runner strips TS types
// but cannot transpile JSX, so anything imported by a test must stay .ts.
//
// Contracts here mirror HF-1 (`hotfix/biz-email-change` @ 1e87838) exactly:
//   POST /business/auth/change-email  { new_email, password }
//     200 -> { message, pending_email }
//     400 missing/invalid/blocked-domain/same-as-current
//     401 no session OR wrong password
//     403 authenticated but not the owner
//     409 address held by another business or another user
//     429 authLimiter (50 / 15min per IP)
// HF-1 deliberately made this endpoint NOT enumeration-safe: the caller already
// proved identity with an owner session + password, so a vague error would
// strand them with no way to find a working address. The copy below is specific
// for the same reason.

/** Roles allowed to change the login email. */
export type BusinessRole = "owner" | "manager" | "staff" | "promoter"

/**
 * Owner-only — deliberately NARROWER than the `canEdit` used elsewhere in
 * settings (owner || manager). `businesses.email` is the login credential
 * (recon B1), so managers must not move it. Mirrors HF-1's 403.
 */
export function canChangeBusinessEmail(role: BusinessRole | string | null | undefined): boolean {
  return role === "owner"
}

/** Minimal client-side format gate. The server re-validates; this only avoids a wasted round trip. */
export function isPlausibleEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  // Exactly one @, non-empty local part, dotted domain. Intentionally loose —
  // the authority is the server, which also enforces the blocked-domain list.
  return /^[^@]+@[^@.]+(\.[^@.]+)+$/.test(trimmed)
}

/** True when the submit button should be live. */
export function canSubmitEmailChange(newEmail: string, password: string, currentEmail: string): boolean {
  if (!isPlausibleEmail(newEmail)) return false
  if (!password) return false
  return !isSameAddress(newEmail, currentEmail)
}

/** Addresses compare case-insensitively for the "same as current" guard. */
export function isSameAddress(a: string, b: string): boolean {
  return a.trim().toLowerCase() === (b || "").trim().toLowerCase()
}

/**
 * Maps an HF-1 status onto owner-facing copy.
 * `serverMessage` is preferred for 400 because that status multiplexes several
 * distinct causes (bad format, blocked domain, same-as-current) and the server
 * is the only thing that knows which one fired.
 */
export function emailChangeErrorMessage(status: number, serverMessage?: string): string {
  switch (status) {
    case 400:
      return serverMessage?.trim() || "That email address can't be used. Please check it and try again."
    case 401:
      // HF-1 folds "wrong password" into 401 alongside "no session". A live
      // session is a precondition for reaching this form at all, and the
      // api-client bounces genuine session loss to /business/login before we
      // see it — so in practice a 401 here means the password was wrong.
      return "That password is incorrect."
    case 403:
      return "Only the account owner can change the login email."
    case 409:
      return "That email is already in use."
    case 429:
      return "Too many attempts. Please wait a few minutes and try again."
    default:
      return serverMessage?.trim() || "Something went wrong. Please try again."
  }
}

/** Success copy — states plainly that nothing has changed yet. */
export function emailChangeSuccessMessage(pendingEmail: string): string {
  return `Check ${pendingEmail} to confirm. Nothing changes until then.`
}

/** Banner copy shown when a previously-requested change is still outstanding. */
export function emailChangePendingMessage(pendingEmail: string): string {
  return `Waiting on confirmation for ${pendingEmail}. Your login email stays the same until that link is opened.`
}

// --- Pending-change hint (client-side only) ------------------------------
//
// LIMITATION, stated plainly: HF-1 stores the pending address inside the signed
// JWT and parks only sha256(token) in `businesses.email_verification_token`
// (there is no pending-email column, and adding one would have changed the
// hotfix's risk class). So the SERVER cannot report "a change is awaiting
// confirmation" — nothing queryable holds the address.
//
// This record is therefore a local hint, not server truth: it will not follow
// the owner to another browser or device, and clearing site data drops it. It
// never gates anything — worst case the banner is absent and the owner simply
// requests again. TTL matches HF-1's 1-hour token expiry so the banner cannot
// outlive the link it describes.

export const PENDING_TTL_MS = 60 * 60 * 1000
export const PENDING_STORAGE_KEY = "bizzy.business.pendingEmailChange"

export interface PendingEmailChange {
  businessId: number
  pendingEmail: string
  requestedAt: number
}

export function makePendingRecord(businessId: number, pendingEmail: string, nowMs: number): PendingEmailChange {
  return { businessId, pendingEmail, requestedAt: nowMs }
}

/**
 * Returns the pending address to display, or null when there is nothing
 * trustworthy to show. Null on: absent/corrupt payload, a record belonging to
 * another business, an expired record, or a record whose address the account
 * has ALREADY adopted (the change landed — the banner would be a lie).
 */
export function readPendingRecord(
  raw: string | null | undefined,
  businessId: number,
  currentEmail: string,
  nowMs: number
): string | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== "object") return null
  const rec = parsed as Partial<PendingEmailChange>

  if (typeof rec.pendingEmail !== "string" || !rec.pendingEmail) return null
  if (typeof rec.businessId !== "number" || rec.businessId !== businessId) return null
  if (typeof rec.requestedAt !== "number" || !Number.isFinite(rec.requestedAt)) return null

  // Expired, or clock skewed into the future far enough to be untrustworthy.
  const age = nowMs - rec.requestedAt
  if (age < 0 || age >= PENDING_TTL_MS) return null

  // The change already completed — drop the banner rather than contradict it.
  if (isSameAddress(rec.pendingEmail, currentEmail)) return null

  return rec.pendingEmail
}
