// The #5 teammates/linking contract (V426_FASTFOLLOW.md §5), as the web half
// consumes it. The services half (N1) is not built yet, so this file is the
// written-down version of what N2 codes against — anything here marked
// ADDITIVE is a gap N2 had to fill to render a working page and needs N1's
// agreement (all of them are listed in V426_BUILD_LOG.md §N2 "open questions").

export type InviteRole = 'manager' | 'staff'

export type ContactType = 'phone' | 'email'

export interface InviteContact {
  type: ContactType
  value: string
}

/** 409 MULTIPLE_MATCHES: the owner picks which shared-number sibling they meant. */
export interface InviteCandidate {
  id: number
  masked_name: string
  masked_contact: string
}

export interface InviteArgs {
  role: InviteRole
  contact: InviteContact
  name?: string
  /**
   * TI-3: the provisional name for a NEW-to-Bizzy invitee (the lookup `none`
   * path). Additive alongside `name` so legacy services still get the `name`
   * they always did; TI-3 services persist this as the row's `display_name`,
   * which is what keeps the pending row from rendering blank. The invitee
   * confirms or corrects it at accept.
   */
  display_name?: string
  /** Set on the re-submit after a MULTIPLE_MATCHES pick. */
  chosen_user_id?: number
  /**
   * TI-3 / TI-F2: set true on the re-submit after a REACTIVATION_REQUIRED
   * confirm. Re-inviting a previously-removed member no longer silently
   * reactivates — the owner must explicitly confirm. Absent from every other
   * path, and legacy services (which reactivate silently) ignore it, so this
   * field never changes deployed behaviour until TI-3s ships.
   */
  reactivate?: boolean
  // ── ADDITIVE, not in the pinned contract ─────────────────────────────────
  // Team members are venue-scoped today (business_team_members.venue_id; the
  // dialog and row have shipped a venue picker since May). The pinned invite
  // body omits it, but dropping it would silently regress every venue-scoped
  // invite to global access — a permission WIDENING, so it is sent additively
  // rather than dropped. N1 must accept it.
  venue_id?: number | null
}

/**
 * 201. `invite_link` is ADDITIVE-but-required: the contract says copy-link and
 * "text it yourself" are shown "regardless", and a phone invite requests no
 * email at all, so the success path has to carry the link or the owner has
 * nothing to send. Bizzy sends NO SMS in v1 — the owner texts it.
 */
export interface InviteCreated {
  invite_link: string
  /** How the invite actually went out. Drives the honest delivery-state row. */
  delivery: InviteDelivery
  /**
   * Why a phone invite was NOT texted. Absent on legacy (pre-TI-1) services —
   * see delivery.ts, where that absence is a first-class state.
   */
  delivery_reason?: InviteDeliveryReason | null
  /** Present when the contact resolved to exactly one existing user. */
  invited_user_id?: number | null
}

// The delivery vocabulary lives in ./delivery — the single module that owns the
// TI-1 wire contract and the outcome copy. Re-exported here so the existing
// `@/lib/team-invite/types` imports keep working and there is still one
// definition.
export type { InviteDelivery, InviteDeliveryReason } from './delivery'
import type { InviteDelivery, InviteDeliveryReason } from './delivery'

/** Error `code` values the UI branches on. Anything else = generic message. */
export type InviteErrorCode =
  | 'MULTIPLE_MATCHES'
  | 'EMAIL_FAILED'
  | 'ALREADY_MEMBER'
  | 'INVALID_CODE'
  | 'REACTIVATION_REQUIRED'

/**
 * 409 REACTIVATION_REQUIRED body (TI-3 / TI-F2). The contact resolves to a
 * member the business previously removed; the server refuses to silently
 * reactivate and asks the owner to confirm. `masked_name` is optional — the
 * confirm copy degrades to a generic sentence without it.
 */
export interface ReactivationRequiredBody {
  code: 'REACTIVATION_REQUIRED'
  masked_name?: string
}

/** 409 MULTIPLE_MATCHES body. */
export interface MultipleMatchesBody {
  code: 'MULTIPLE_MATCHES'
  candidates: InviteCandidate[]
}

/** EMAIL_FAILED body — carries the link so the UI can fall back to copy/text. */
export interface EmailFailedBody {
  code: 'EMAIL_FAILED'
  invite_link: string
}

// ── Accept page ────────────────────────────────────────────────────────────

/**
 * Terminal + live states of an invite token. `invalid` covers a token that
 * never existed — deliberately indistinguishable from `revoked` in copy, so a
 * stranger cannot probe for real tokens.
 */
export type InviteState = 'valid' | 'expired' | 'revoked' | 'accepted' | 'invalid'

/**
 * Which credentials the accept step must collect, per the Luke 2026-07-17
 * amendment matrix. Server-computed: only the server knows whether the
 * resolved account has a password.
 *
 * - `none`         → existing user who already HAS a password. Accept only.
 *                    NEVER render a set-password step for these.
 * - `set_password` → existing user with a NULL password (OTP-only app account).
 *                    Additive null→value; `needs_email` if they have none.
 * - `create_account` → no user yet: name + email + password.
 *
 * ADDITIVE: the pinned validate response is {business_name, role, invited_as,
 * state}, which cannot drive this matrix. N1 must return it.
 */
export type CredentialStep = 'none' | 'set_password' | 'create_account'

export interface InviteValidation {
  state: InviteState
  business_name: string
  role: string
  /** Masked — "who it's for", safe to show a stranger holding the link. */
  invited_as: string
  // ── ADDITIVE below ───────────────────────────────────────────────────────
  contact_type: ContactType
  /**
   * Phone-resolved and unresolved-phone invites must prove possession of the
   * number before accept. Email invites: token possession suffices.
   */
  requires_otp: boolean
  credential_step: CredentialStep
  /** set_password invites where the account has no email on file. */
  needs_email: boolean
  /**
   * The signed-in dashboard user, if any, as the SERVER sees them — validate is
   * called with credentials:'include'. `matches:false` is the wrong-account
   * state. null = nobody signed in. Comparing client-side is not possible: the
   * page never learns the invited user's id (and must not).
   */
  session: { matches: boolean; email: string | null } | null
}

/**
 * POST accept. `{token}` alone is the pinned shape; every other field is
 * ADDITIVE and conditional on the matrix above.
 *
 * `code` (the OTP) is sent HERE rather than to the existing verify-code
 * endpoint first, and that is load-bearing: verify-code DELETEs the code on
 * use (lineSkipCheckout.ts:757) and returns no proof token, so a verify-then-
 * accept sequence would consume the code and leave accept with nothing to
 * check — i.e. link-possession alone would grant the job, which is exactly the
 * "a shared-number sibling can never inherit a job" rule. N1 must verify the
 * code inside accept (same user_verifications sentinel scheme) — or issue a
 * short-lived proof token from an invite-scoped verify. See §N2 open questions.
 */
export interface AcceptArgs {
  token: string
  /** 6-digit OTP. Omitted when requires_otp is false or a session matches. */
  code?: string
  /** create_account only. */
  name?: string
  /** create_account, or set_password when needs_email. */
  email?: string
  /** create_account | set_password. Never sent for credential_step 'none'. */
  password?: string
}

export interface AcceptResult {
  /** Accept is idempotent: a replayed token returns ok, not an error. */
  ok: true
  business_name: string
  role: string
}

/** Thrown for 409 MULTIPLE_MATCHES so the caller can render the picker. */
export class MultipleMatchesError extends Error {
  candidates: InviteCandidate[]
  constructor(candidates: InviteCandidate[]) {
    super('Multiple accounts match that contact')
    this.name = 'MultipleMatchesError'
    this.candidates = candidates
  }
}

/** Thrown for EMAIL_FAILED — carries the link the UI falls back to. */
export class EmailFailedError extends Error {
  invite_link: string
  constructor(invite_link: string) {
    super('The invite email could not be sent')
    this.name = 'EmailFailedError'
    this.invite_link = invite_link
  }
}

/**
 * Thrown for 409 REACTIVATION_REQUIRED (TI-3 / TI-F2) so the dialog can render
 * the explicit re-invite confirm instead of silently reactivating a member the
 * owner had removed. Re-submitting with `reactivate: true` completes the invite.
 */
export class ReactivationRequiredError extends Error {
  masked_name?: string
  constructor(masked_name?: string) {
    super('This person was removed from the team')
    this.name = 'ReactivationRequiredError'
    this.masked_name = masked_name
  }
}
