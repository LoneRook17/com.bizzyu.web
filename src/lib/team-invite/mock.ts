// Dev-only mock of the #5 team-invite contract, so the invite dialog and the
// accept page are fully exercisable before the services half (N1) exists.
//
// This module is only ever reached from an inline
// `process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === '1'` branch, which folds to
// false in a prod build and takes the dynamic import — and this chunk — with
// it. Nothing here ships to production; the build log records the grep.

import type { InviteLookup } from './lookup'
import {
  EmailFailedError,
  MultipleMatchesError,
  PhoneInUseError,
  ReactivationRequiredError,
  type AcceptArgs,
  type AcceptResult,
  type InviteArgs,
  type InviteCreated,
  type InviteValidation,
} from './types'

// ── Invite-side scenarios (dashboard dialog) ───────────────────────────────

export type InviteScenario =
  | 'phone_link_only'
  | 'phone_sms_sent'
  | 'phone_duplicate_invite'
  | 'phone_send_failed'
  | 'phone_guard_skipped'
  | 'email_sent'
  | 'multiple_matches'
  | 'email_failed'
  | 'already_member'
  // ── TI-3 lookup arms. Each drives BOTH the live-typing lookup AND the
  // eventual create, so the tester picks one selection and gets the whole flow.
  | 'lookup_one'
  | 'lookup_multiple'
  | 'lookup_none'
  | 'lookup_legacy'
  | 'reactivation_required'

// ── Accept-side scenarios (public page) ────────────────────────────────────

export type AcceptScenario =
  | 'valid_otp_password'
  | 'valid_otp_set_password'
  | 'valid_new_user'
  | 'valid_email_no_otp'
  // TI-4s: email invite, new user, landing account has no phone → the accept
  // step captures one. Pre-fills the name from provisional_name. The
  // MOCK_CANDIDATES' shared number (…1720) raises PHONE_IN_USE on send.
  | 'valid_email_needs_phone'
  | 'session_match'
  | 'wrong_account'
  | 'expired'
  | 'revoked'
  | 'accepted'

const INVITE_SCENARIOS: InviteScenario[] = [
  'phone_link_only',
  'phone_sms_sent',
  'phone_duplicate_invite',
  'phone_send_failed',
  'phone_guard_skipped',
  'email_sent',
  'multiple_matches',
  'email_failed',
  'already_member',
  'lookup_one',
  'lookup_multiple',
  'lookup_none',
  'lookup_legacy',
  'reactivation_required',
]

const ACCEPT_SCENARIOS: AcceptScenario[] = [
  'valid_otp_password',
  'valid_otp_set_password',
  'valid_new_user',
  'valid_email_no_otp',
  'valid_email_needs_phone',
  'session_match',
  'wrong_account',
  'expired',
  'revoked',
  'accepted',
]

let inviteScenario: InviteScenario | null = null
let acceptScenario: AcceptScenario | null = null

/**
 * Seedable from `?mock_scenario=` so arms that decide BEFORE anything renders —
 * every accept-page state is chosen at load — are reachable without a picker to
 * click. The in-page picker overrides from there.
 */
function seeded<T extends string>(allowed: T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const q = new URLSearchParams(window.location.search).get('mock_scenario')
  return q && (allowed as string[]).includes(q) ? (q as T) : fallback
}

export function setInviteScenario(s: InviteScenario) {
  inviteScenario = s
}

export function getInviteScenario(): InviteScenario {
  if (inviteScenario === null) inviteScenario = seeded(INVITE_SCENARIOS, 'phone_link_only')
  return inviteScenario
}

export function setAcceptScenario(s: AcceptScenario) {
  acceptScenario = s
}

export function getAcceptScenario(): AcceptScenario {
  if (acceptScenario === null) acceptScenario = seeded(ACCEPT_SCENARIOS, 'valid_otp_password')
  return acceptScenario
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

const MOCK_BUSINESS = 'Backroads Bar & Grill'
const MOCK_LINK = 'https://bizzyu.com/team-invite?token=mock_3f9a2c7e1b8d4a60'

// The `&` in the business name is deliberate: it is the character that
// truncates an unescaped sms: body, so the happy path exercises the escaping.

// The masked candidates for both the 409 picker and the TI-3 pre-invoked
// lookup picker — one definition so both surfaces mask identically.
const MOCK_CANDIDATES = [
  { id: 5561, masked_name: 'L••• C•••••', masked_contact: '(•••) •••-1720' },
  { id: 8705, masked_name: 'J••• D••', masked_contact: '(•••) •••-1720' },
  { id: 7961, masked_name: 'M••• R•••••', masked_contact: '(•••) •••-1720' },
]

/**
 * TI-3 directory lookup mock. Only the lookup arms return a non-legacy verdict;
 * every pre-TI-3 scenario returns `legacy`, so those flows stay byte-identical
 * (no lookup UI appears). `reactivation_required` looks up as a real member
 * ('one') — the removed-member story only surfaces on create.
 */
export async function mockLookupInviteContact(): Promise<InviteLookup> {
  await delay(300)
  switch (getInviteScenario()) {
    case 'lookup_one':
    case 'reactivation_required':
      return { match: 'one', masked_name: 'J••• D••' }
    case 'lookup_multiple':
      return { match: 'multiple', candidates: MOCK_CANDIDATES }
    case 'lookup_none':
      return { match: 'none' }
    default:
      // lookup_legacy and every pre-TI-3 arm: endpoint absent → unchanged form.
      return { match: 'legacy' }
  }
}

export async function mockCreateInvite(args: InviteArgs): Promise<InviteCreated> {
  await delay(450)
  const scenario = getInviteScenario()

  // A chosen_user_id means the owner already picked a sibling — the server
  // would not re-raise the ambiguity, so neither does the mock.
  if (scenario === 'multiple_matches' && !args.chosen_user_id) {
    throw new MultipleMatchesError(MOCK_CANDIDATES)
  }

  // TI-F2: re-inviting a removed member needs an explicit confirm. The mock
  // raises it once; the reactivate:true re-submit sails through as sms_sent.
  if (scenario === 'reactivation_required' && !args.reactivate) {
    throw new ReactivationRequiredError({
      member_id: 8705,
      masked_name: 'J••• D••',
      masked_contact: '(•••) •••-1720',
      role: 'staff',
      removed_at: '2026-07-19 12:05:00',
    })
  }

  // TI-3 lookup arms resolve to honest deliveries on submit.
  if (scenario === 'lookup_one' || scenario === 'reactivation_required') {
    return { invite_link: MOCK_LINK, delivery: 'sms_sent', delivery_reason: null, invited_user_id: 8705 }
  }
  if (scenario === 'lookup_multiple') {
    // Owner picked a sibling in the pre-invoked picker → chosen_user_id is set.
    return { invite_link: MOCK_LINK, delivery: 'sms_sent', delivery_reason: null, invited_user_id: args.chosen_user_id ?? null }
  }
  if (scenario === 'lookup_none' || scenario === 'lookup_legacy') {
    // New to Bizzy (or legacy server): no send, honest link_only.
    return { invite_link: MOCK_LINK, delivery: 'link_only', delivery_reason: null, invited_user_id: null }
  }
  if (scenario === 'already_member') {
    const err = new Error('That person is already on your team.')
    err.name = 'AlreadyMemberError'
    throw err
  }
  if (scenario === 'email_failed') {
    throw new EmailFailedError(MOCK_LINK)
  }

  // TI-1 phone arms. `phone_link_only` deliberately returns NO delivery_reason:
  // it is the deployed-today legacy shape, and it is the scenario the live
  // regression check is run against.
  const phoneArms: Partial<Record<InviteScenario, Pick<InviteCreated, 'delivery' | 'delivery_reason'>>> = {
    phone_sms_sent: { delivery: 'sms_sent', delivery_reason: null },
    phone_duplicate_invite: { delivery: 'link_only', delivery_reason: 'duplicate_invite' },
    phone_send_failed: { delivery: 'link_only', delivery_reason: 'send_failed' },
    phone_guard_skipped: { delivery: 'link_only', delivery_reason: 'guard_skipped' },
  }
  const phoneArm = args.contact.type === 'phone' ? phoneArms[scenario] : undefined

  return {
    invite_link: MOCK_LINK,
    // Without a TI-1 arm, a phone invite requests no email, so link_only is the
    // honest delivery state — NOT "sent". Nothing here ever reports a send that
    // did not happen.
    delivery: args.contact.type === 'email' && scenario === 'email_sent' ? 'email_sent' : 'link_only',
    invited_user_id: args.chosen_user_id ?? null,
    ...phoneArm,
  }
}

export async function mockValidateInvite(token: string): Promise<InviteValidation> {
  await delay(400)
  const scenario = getAcceptScenario()

  const base = {
    business_name: MOCK_BUSINESS,
    role: 'manager',
    invited_as: '(•••) •••-1720',
    contact_type: 'phone' as const,
    requires_otp: true,
    credential_step: 'none' as const,
    needs_email: false,
    provisional_name: null,
    needs_phone: false,
    session: null,
  }

  switch (scenario) {
    case 'expired':
      return { ...base, state: 'expired' }
    case 'revoked':
      return { ...base, state: 'revoked' }
    case 'accepted':
      return { ...base, state: 'accepted' }
    case 'wrong_account':
      return {
        ...base,
        state: 'valid',
        session: { matches: false, email: 'someone.else@bizzytest.com' },
      }
    case 'session_match':
      // Already signed in AS the invited user: session is the proof, so no OTP
      // and — password already set — no credential step. Just Accept.
      return {
        ...base,
        state: 'valid',
        requires_otp: false,
        session: { matches: true, email: 'luke-dev@bizzytest.com' },
      }
    case 'valid_email_no_otp':
      return {
        ...base,
        state: 'valid',
        invited_as: 'l•••@bizzytest.com',
        contact_type: 'email',
        requires_otp: false,
      }
    case 'valid_email_needs_phone':
      // TI-4s: brand-new invitee by email — name pre-filled from the inviter's
      // entry, email pre-filled from the address the invite went to (READ-ONLY:
      // accept ignores a submitted email on this path), and a phone step so the
      // account is app-capable on day one. The other email arms deliberately
      // omit invited_email — they are the pre-invited_email services shape,
      // i.e. the old editable empty field.
      return {
        ...base,
        state: 'valid',
        invited_as: 'j•••@bizzytest.com',
        contact_type: 'email',
        requires_otp: false,
        credential_step: 'create_account',
        provisional_name: 'Jordan Reyes',
        needs_phone: true,
        invited_email: 'jordan.reyes@bizzytest.com',
      }
    case 'valid_otp_set_password':
      // Existing OTP-only app account: null password → set one (additively).
      // needs_email exercises the "+ email if missing" arm.
      return {
        ...base,
        state: 'valid',
        credential_step: 'set_password',
        needs_email: true,
      }
    case 'valid_new_user':
      return {
        ...base,
        state: 'valid',
        invited_as: '(•••) •••-4501',
        credential_step: 'create_account',
      }
    case 'valid_otp_password':
    default:
      return { ...base, state: token ? 'valid' : 'invalid' }
  }
}

export async function mockSendInviteCode(phone?: string): Promise<void> {
  await delay(350)
  // TI-4s capture: the MOCK_CANDIDATES' shared number is "taken", so typing a
  // number ending 1720 exercises the PHONE_IN_USE surface without services.
  if (phone && phone.replace(/\D/g, '').endsWith('1720')) {
    throw new PhoneInUseError()
  }
}

export async function mockAcceptInvite(args: AcceptArgs): Promise<AcceptResult> {
  await delay(600)

  // 123456 is what services seeds when Twilio is unconfigured
  // (lineSkipCheckout.ts:678), so the wrong-code arm is reachable in dev by
  // typing anything else.
  if (args.code && args.code !== '123456') {
    throw new Error('That code is not right. Check the text and try again.')
  }

  return { ok: true, business_name: MOCK_BUSINESS, role: 'manager' }
}
