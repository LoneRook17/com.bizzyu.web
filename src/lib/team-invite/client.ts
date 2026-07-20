// Transport for the #5 team-invite contract (V426_FASTFOLLOW.md §5).
//
// Every call routes through here so neither the dashboard dialog nor the accept
// page knows whether it is talking to dev services or the mock.
//
// Each mock branch tests `process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK` inline
// rather than the exported MOCK_ENABLED. That is deliberate and load-bearing:
// only a literal compare inside the same module folds at build time, which is
// what drops the dynamic import — and the mock chunk with it — from a prod
// build. Routing these through the imported constant does NOT fold and the mock
// ships (K2 verified this the hard way, both directions). next.config.ts
// defaults the var so the compare always has a literal to fold against.
// MOCK_ENABLED stays exported for plain runtime checks that gate no import.

import { getApiBaseUrl } from '@/lib/api-url'

import { parseDelivery } from './delivery'
import { parseLookup, type InviteLookup } from './lookup'

import {
  EmailFailedError,
  MultipleMatchesError,
  ReactivationRequiredError,
  type AcceptArgs,
  type AcceptResult,
  type InviteArgs,
  type InviteContact,
  type InviteCreated,
  type InviteValidation,
} from './types'

const API_URL = getApiBaseUrl()

export const MOCK_ENABLED = process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === '1'

/**
 * Create an invite. Dashboard-side: goes out with the biz_token cookie.
 *
 * Throws MultipleMatchesError (409) and EmailFailedError so the caller renders
 * the picker / copy-link fallback instead of a dead error string.
 */
export async function createInvite(args: InviteArgs): Promise<InviteCreated> {
  if (process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === '1') {
    const { mockCreateInvite } = await import('./mock')
    return mockCreateInvite(args)
  }
  const res = await fetch(`${API_URL}/business/team/invite`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const data = await res.json().catch(() => ({}))

  if (res.status === 409 && data?.code === 'MULTIPLE_MATCHES') {
    throw new MultipleMatchesError(data.candidates ?? [])
  }
  // TI-3 / TI-F2: the contact resolves to a member the owner previously
  // removed. The server refuses to silently reactivate — the dialog renders an
  // explicit confirm and re-submits with reactivate:true. TI-3s ships this as
  // `409 { code:'PREVIOUSLY_REMOVED', member:{ member_id, masked_name,
  // masked_contact, role, removed_at } }` (masked context only). Legacy services
  // never send this code, so this branch is inert against them.
  if (res.status === 409 && data?.code === 'PREVIOUSLY_REMOVED') {
    throw new ReactivationRequiredError(data?.member ?? undefined)
  }
  // EMAIL_FAILED is an error status by contract (201 means it really sent), but
  // it is a soft failure: the invite EXISTS and the link works. Status-agnostic
  // on purpose — the code is the signal, not the number.
  if (data?.code === 'EMAIL_FAILED' && data?.invite_link) {
    throw new EmailFailedError(data.invite_link)
  }
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Could not send the invite')
  }
  // Normalize the delivery fields here so no caller ever branches on a raw
  // wire value. parseDelivery is total and never throws, so an unexpected
  // `delivery` degrades to link_only rather than dropping the created invite.
  return { ...(data as InviteCreated), ...parseDelivery(data) }
}

/**
 * Validate a token on the public accept page.
 *
 * credentials:'include' is required, not incidental: the server compares any
 * live dashboard session against the invited user to produce `session.matches`,
 * which is the only way the page can know it is the wrong-account case.
 *
 * A bad token is a VERDICT, not a failure — the server answers
 * `{state:'invalid'}` with a 200 and the page renders a terminal state. Only a
 * genuinely broken response throws.
 */
export async function validateInvite(token: string): Promise<InviteValidation> {
  if (process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === '1') {
    const { mockValidateInvite } = await import('./mock')
    return mockValidateInvite(token)
  }
  const res = await fetch(
    `${API_URL}/business/team/invite/validate?token=${encodeURIComponent(token)}`,
    { credentials: 'include', cache: 'no-store' }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || 'Could not check this invite')
  }
  return data as InviteValidation
}

/**
 * Anti-enumeration directory lookup (TI-3). Probes a contact the owner already
 * has and returns only a masked verdict — never a real name or number.
 *
 * Graceful legacy degrade is the whole contract: a services build without the
 * lookup endpoint answers 404 — and that, or any failed/errored probe (401 no
 * session, 429 rate-limited, network), resolves to `{ match: 'legacy' }`, which
 * the dialog treats as the pre-TI-3 form. A probe is a nicety, never a gate: it
 * must never be able to block an invite. The only exception is an abort (the
 * debounce cancelling a stale keystroke), which is re-thrown so the caller can
 * drop the result silently rather than mistaking a cancellation for legacy.
 *
 * TI-3s: `POST /business/team/lookup`, body `{ contact:{ type, value } }`. POST
 * (not GET) is load-bearing — the phone/email must never land in an access log
 * or referer. The route sets `Cache-Control: no-store`; we mirror it here.
 */
export async function lookupInviteContact(
  contact: InviteContact,
  signal?: AbortSignal
): Promise<InviteLookup> {
  if (process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === '1') {
    const { mockLookupInviteContact } = await import('./mock')
    return mockLookupInviteContact()
  }
  try {
    const res = await fetch(`${API_URL}/business/team/lookup`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact }),
      signal,
    })
    // Endpoint absent (legacy services) → legacy. Any non-OK is treated the
    // same: a lookup is advisory, and degrading to the unchanged form is always
    // safe. It never claims an account exists on a failure.
    if (!res.ok) return { match: 'legacy' }
    const data = await res.json().catch(() => null)
    return parseLookup(data)
  } catch (err) {
    // A cancelled probe is not a legacy verdict — let the caller ignore it.
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    // Network error / offline → degrade to the unchanged form, never block.
    return { match: 'legacy' }
  }
}

/** Send the OTP to the invited phone. Reuses the existing 877 login-code infra. */
export async function sendInviteCode(token: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === '1') {
    const { mockSendInviteCode } = await import('./mock')
    return mockSendInviteCode()
  }
  // Token-addressed, NOT phone-addressed: the page never learns the invited
  // number (it only ever sees it masked), so the server reads it off the invite
  // row. Rate limiting stays the existing sender's problem.
  const res = await fetch(`${API_URL}/business/team/invite/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.message || 'Could not send the code')
  }
}

/**
 * Accept the invite. Idempotent by contract. On success the server sets the
 * biz_token cookie, exactly as the old accept-invite page relied on, so the
 * caller can go straight to the dashboard.
 */
export async function acceptInvite(args: AcceptArgs): Promise<AcceptResult> {
  if (process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === '1') {
    const { mockAcceptInvite } = await import('./mock')
    return mockAcceptInvite(args)
  }
  const res = await fetch(`${API_URL}/business/team/invite/accept`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (data?.code === 'INVALID_CODE') {
      throw new Error('That code is not right. Check the text and try again.')
    }
    throw new Error(data?.message || data?.error || 'Could not accept the invite')
  }
  return data as AcceptResult
}

/**
 * Build the SMS the owner sends themselves. Bizzy sends NO invite SMS in v1 —
 * this is the "one tap" that makes the owner the sender.
 *
 * `&` is escaped as `%26`, and the whole body encoded: an unescaped `&` in an
 * sms: body silently truncates the message at that character on iOS, which
 * would send a business named "Bar & Grill" a link-less text.
 */
export function buildSmsHref(phone: string, businessName: string, link: string): string {
  const body = `${businessName} added you to their team on Bizzy. Tap to accept: ${link}`
  // iOS wants ?&body=, Android wants ?body=. `?&body=` is tolerated by both.
  return `sms:${phone}?&body=${encodeURIComponent(body)}`
}
