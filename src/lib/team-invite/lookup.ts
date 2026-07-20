// The invite-time DIRECTORY LOOKUP contract — TI-3 (services `TI-3s`, parallel).
//
// THE CONTRACT FILE for TI-3w. TI-3s is not merged yet, so this is the
// written-down version of what the dialog codes against, built to the pinned
// draft (V426_FASTFOLLOW.md §TI-3, prompt "TI-3w"):
//
//   lookup(contact) → { match: 'none' }
//                   | { match: 'one', masked_name }
//                   | { match: 'multiple', candidates: [masked …] }
//
// The whole point is anti-enumeration: the owner types a number they already
// have, and Bizzy answers only "is there an account, and what does its masked
// name look like" — never a real name, never a real contact. The masking rules
// are the shared-number picker's (CandidatePicker), reused verbatim so the two
// surfaces can never drift into leaking different amounts.
//
// ── Why a `legacy` arm is load-bearing ────────────────────────────────────
// Deployed services do not have the lookup endpoint. An absent endpoint answers
// 404, and that 404 is the LEGACY signal: the dialog must fall back to exactly
// the pre-TI-3 behaviour (name optional, no "on Bizzy" confirm, no provisional
// name requirement). `legacy` is synthesised at the transport layer, never on
// the wire — a 200 body is one of none/one/multiple, and `parseLookup` only
// ever sees those. This keeps the live l2gp flow byte-identical until the
// services half ships behind the same window.

import type { InviteCandidate } from './types'

/** The three real wire verdicts, plus the transport-synthesised legacy state. */
export type LookupMatch = 'none' | 'one' | 'multiple' | 'legacy'

/**
 * A directory-lookup result, normalised. `legacy` means the responding server
 * has no lookup endpoint (or the probe could not be completed) — treat the
 * invite exactly as the pre-TI-3 dialog did.
 */
export type InviteLookup =
  | { match: 'none' }
  | { match: 'one'; masked_name: string }
  | { match: 'multiple'; candidates: InviteCandidate[] }
  | { match: 'legacy' }

/** Shown when the server said `one` but sent no usable masked name. */
const GENERIC_MASKED_NAME = 'Someone on Bizzy'

function isCandidate(v: unknown): v is InviteCandidate {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return (
    typeof c.id === 'number' &&
    typeof c.masked_name === 'string' &&
    typeof c.masked_contact === 'string'
  )
}

/**
 * Read a 200 lookup body into a normalised verdict. Total and never throws —
 * an unrecognised or malformed body degrades to `none`, which is the SAFEST
 * arm: it claims nothing ("New to Bizzy"), never asserts an account exists that
 * the server did not vouch for, and only ever adds a harmless name field. A
 * `multiple` with fewer than two candidates is incoherent (nothing to pick
 * between), so it collapses to `none` rather than opening an empty picker.
 *
 * `legacy` is NOT produced here — a 404/failed probe is the transport's call
 * (see `lookupInviteContact`), because parseLookup only ever runs on a body the
 * server actually returned.
 */
export function parseLookup(body: unknown): InviteLookup {
  const raw = (body ?? {}) as Record<string, unknown>

  switch (raw.match) {
    case 'one':
      return {
        match: 'one',
        masked_name:
          typeof raw.masked_name === 'string' && raw.masked_name.trim()
            ? raw.masked_name
            : GENERIC_MASKED_NAME,
      }
    case 'multiple': {
      const candidates = Array.isArray(raw.candidates)
        ? raw.candidates.filter(isCandidate)
        : []
      return candidates.length >= 2 ? { match: 'multiple', candidates } : { match: 'none' }
    }
    case 'none':
      return { match: 'none' }
    default:
      // Unknown verdict → claim nothing. Never invent an "on Bizzy" assertion.
      return { match: 'none' }
  }
}

// ── The view the dialog renders ────────────────────────────────────────────

export type LookupViewKind = 'none' | 'one' | 'multiple' | 'legacy'

export interface LookupView {
  kind: LookupViewKind
  /**
   * Show the "Their name" field. On `none` a provisional name is how the row
   * avoids rendering blank before accept, so it is REQUIRED there. On `legacy`
   * the field is the old optional "tell invites apart" helper. Hidden on `one`
   * (Bizzy already knows the name) and `multiple` (the picker decides who).
   */
  showNameField: boolean
  /** Whether that name must be filled before the invite can be created. */
  nameRequired: boolean
  /**
   * The status line under the contact input. `null` on `legacy` — the pre-TI-3
   * form showed nothing there, and this arm must stay byte-identical.
   */
  banner: { tone: 'success' | 'info' | 'warning'; text: string } | null
  /**
   * Candidates for the PRE-INVOKED picker. Non-null only on `multiple`: the
   * owner disambiguates before submit instead of round-tripping through a 409.
   */
  candidates: InviteCandidate[] | null
  /** The primary-button label for this state. */
  submitLabel: string
}

/**
 * Map a normalised lookup to the dialog's affordances and copy. Pure and total
 * over the union — the single place every sentence the lookup section can say
 * lives, mirroring `resolveInviteOutcome` for the result panel.
 *
 * The name field on `none` is REQUIRED on purpose: it is the provisional name
 * that keeps the pending row from rendering blank (TI-F1), the invitee confirms
 * or corrects it at accept, and it goes out as `display_name`.
 */
export function resolveLookupView(lookup: InviteLookup): LookupView {
  switch (lookup.match) {
    case 'one':
      return {
        kind: 'one',
        showNameField: false,
        nameRequired: false,
        banner: {
          tone: 'success',
          text: `${lookup.masked_name} is on Bizzy — invite them?`,
        },
        candidates: null,
        submitLabel: 'Invite them',
      }
    case 'multiple':
      return {
        kind: 'multiple',
        showNameField: false,
        nameRequired: false,
        banner: {
          tone: 'info',
          text: 'A few accounts use this contact — you’ll pick which one.',
        },
        candidates: lookup.candidates,
        submitLabel: 'Choose person',
      }
    case 'none':
      return {
        kind: 'none',
        showNameField: true,
        nameRequired: true,
        banner: {
          tone: 'info',
          text: 'New to Bizzy — add their name so you can tell the invite apart.',
        },
        candidates: null,
        submitLabel: 'Create invite',
      }
    case 'legacy':
      // Pre-TI-3 form: optional name, no status line, unchanged submit.
      return {
        kind: 'legacy',
        showNameField: true,
        nameRequired: false,
        banner: null,
        candidates: null,
        submitLabel: 'Create invite',
      }
  }
}
