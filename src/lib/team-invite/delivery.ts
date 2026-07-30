// The invite DELIVERY contract — TI-1 (services `feat/teammate-invite-autosend`).
//
// This is the one file to touch if the contract shifts. It owns three things
// and nothing else owns any of them:
//   1. the wire vocabulary (`delivery` + `delivery_reason`),
//   2. `parseDelivery` — the tolerant wire → normalized reader,
//   3. `resolveInviteOutcome` — normalized → the copy and the affordance rule.
// The dialog imports the outcome and renders it; it makes no delivery decisions.
//
// ── Why a `null` reason is load-bearing ───────────────────────────────────
// TI-1 is pushed but NOT merged, so deployed services answer a phone invite
// with `delivery:'link_only'` and NO `delivery_reason` at all. That absence is
// the LEGACY signal, and its arm must render byte-identically to what shipped
// before this file existed — the live dashboard is running against those
// services right now. A reason is never inferred, never defaulted: an absent
// field means "the server that answered predates auto-send", which is a
// genuinely different statement from "auto-send ran and skipped".

/**
 * What the server actually managed to do — never inferred from a 2xx.
 *
 * `sms_sent` is TI-1's addition: Bizzy texted the invite itself, from the 877
 * number. `email_failed` still arrives as an error body (EMAIL_FAILED), not a
 * 201 — see client.ts.
 */
export type InviteDelivery = 'email_sent' | 'link_only' | 'email_failed' | 'sms_sent'

/**
 * Why a phone invite came back `link_only` instead of `sms_sent`. Only ever
 * present on `link_only`, and only from TI-1-or-later services.
 *
 * - `duplicate_invite` → a live invite already existed. The server stayed
 *   SILENT on purpose (no second text) and the ORIGINAL link still works.
 *   This is a success, not a failure, and it must not offer a re-send.
 * - `guard_skipped`    → a send guard declined (mute, opt-out, rate limit).
 * - `send_failed`      → the send was attempted and Twilio refused it.
 * The last two are the same story to the owner: text it yourself.
 */
export type InviteDeliveryReason = 'duplicate_invite' | 'guard_skipped' | 'send_failed'

const DELIVERIES: InviteDelivery[] = ['email_sent', 'link_only', 'email_failed', 'sms_sent']
const REASONS: InviteDeliveryReason[] = ['duplicate_invite', 'guard_skipped', 'send_failed']

/** A delivery result normalized so every downstream branch is total. */
export interface InviteDeliveryInfo {
  delivery: InviteDelivery
  /** `null` = legacy: the responding server does not speak auto-send. */
  reason: InviteDeliveryReason | null
}

/**
 * Read `delivery`/`delivery_reason` off an arbitrary response body.
 *
 * Tolerant by design — this runs against three server generations at once
 * (deployed-legacy, TI-1, and whatever follows). An unrecognized `delivery`
 * degrades to `link_only`, which is the arm that always shows the link and the
 * manual send: the outcome that is correct-if-boring no matter what the server
 * meant. Never throws; a delivery field is not worth failing an invite over.
 */
export function parseDelivery(body: unknown): InviteDeliveryInfo {
  const raw = (body ?? {}) as Record<string, unknown>

  const delivery = DELIVERIES.includes(raw.delivery as InviteDelivery)
    ? (raw.delivery as InviteDelivery)
    : 'link_only'

  // A reason is only meaningful as the explanation of a NON-send. Dropping it
  // elsewhere keeps the outcome table from growing arms that cannot occur.
  const reason =
    delivery === 'link_only' && REASONS.includes(raw.delivery_reason as InviteDeliveryReason)
      ? (raw.delivery_reason as InviteDeliveryReason)
      : null

  return { delivery, reason }
}

/** Which of the six honest outcomes this invite landed on. */
export type InviteOutcomeKind =
  | 'sms_sent'
  | 'already_invited'
  | 'sms_unavailable'
  | 'link_only_legacy'
  | 'email_sent'
  | 'email_failed'

export interface InviteOutcome {
  kind: InviteOutcomeKind
  tone: 'success' | 'info' | 'warning'
  title: string
  body: string
  /**
   * The dialog's header line for this outcome. Lives here so a single file
   * holds every sentence the panel can say about delivery.
   */
  description: string
  /**
   * Whether to offer "Text it yourself".
   *
   * False exactly when a text is not the owner's job: Bizzy already sent one
   * (`sms_sent`), or Bizzy sent one earlier and is deliberately not sending
   * another (`already_invited`). Copy-link stays available on every arm — it
   * is the universal fallback and costs nothing.
   */
  showManualText: boolean
}

/**
 * Map a normalized delivery to the panel's copy and affordances.
 *
 * Total over the type, and every arm states what actually happened. There is
 * no arm that reports a send Bizzy did not make, and none that stays silent
 * about one it did.
 *
 * @param phoneDisplay Formatted recipient number, for the `sms_sent` receipt —
 *   "we texted it" is only checkable by the owner if it names the number.
 */
export function resolveInviteOutcome(
  info: InviteDeliveryInfo,
  phoneDisplay?: string | null
): InviteOutcome {
  const { delivery, reason } = info

  if (delivery === 'sms_sent') {
    return {
      kind: 'sms_sent',
      tone: 'success',
      title: 'Invite sent by text ✓',
      body: phoneDisplay
        ? `We texted the invite to ${phoneDisplay}. Nothing else for you to do.`
        : 'We texted them the invite. Nothing else for you to do.',
      description: 'We sent the text. The link below is there if you want it too.',
      showManualText: false,
    }
  }

  if (delivery === 'email_sent') {
    return {
      kind: 'email_sent',
      tone: 'success',
      title: 'Invite emailed.',
      body: 'They can also use the link below if the email goes missing.',
      description: "Send them the link — Bizzy doesn't text invites.",
      showManualText: true,
    }
  }

  if (delivery === 'email_failed') {
    return {
      kind: 'email_failed',
      tone: 'warning',
      title: "The invite email didn't send.",
      body: 'The invite itself is fine — send them the link instead.',
      description: "Send them the link — Bizzy doesn't text invites.",
      showManualText: true,
    }
  }

  if (reason === 'duplicate_invite') {
    return {
      kind: 'already_invited',
      tone: 'info',
      title: 'Already invited.',
      // No re-send offered, and the copy has to earn that: the reason there is
      // no button is that the first text is still good, not that we gave up.
      body: 'The link we texted them still works — they can use it any time.',
      description: 'This person already has a live invite.',
      showManualText: false,
    }
  }

  if (reason === 'guard_skipped' || reason === 'send_failed') {
    return {
      kind: 'sms_unavailable',
      tone: 'warning',
      title: "We couldn't text this number.",
      body: "Share the link yourself and they're in.",
      description: 'The text did not go out — the link is yours to send.',
      showManualText: true,
    }
  }

  // reason === null → legacy services. Byte-identical to pre-TI-2 copy.
  return {
    kind: 'link_only_legacy',
    tone: 'info',
    title: 'Invite ready to send.',
    body: "Bizzy doesn't text invites — send them this link and they're in.",
    description: "Send them the link — Bizzy doesn't text invites.",
    showManualText: true,
  }
}
