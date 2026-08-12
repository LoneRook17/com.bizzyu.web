/**
 * Surge card state machine (S3 rework).
 *
 * The card had TWO invisible states — "is my draft saved?" and "is surge
 * live?" — sharing one row of buttons ("Save ladder" next to "Enable"/
 * "Disable"). Nothing on screen told you which of the two you were about to
 * change, so the same click meant different things depending on state you
 * could not see. This module makes both states explicit and, being pure,
 * testable: the component renders what these functions return.
 *
 * Split out (rather than living in the component) for the same reason
 * ./surge-validation exists: the Node built-in test runner drives it directly
 * with no DOM, so the lifecycle rules are covered by `npm test`.
 */
import { fmtCents } from './surge-validation.ts'

/** A step as typed into the editor — dollars/whole numbers as STRINGS, because
 *  that is what an <input> holds mid-typing ("", "1.", "10.0"). */
export type DraftStep = { threshold: string; price: string }

/** The server-side step fields the card already receives. Structural so this
 *  module stays free of the API types (and their transitive imports). */
export interface StepLike {
  threshold_sold: number
  price_cents: number
  fired_at?: string | null
  step_index?: number
}

/**
 * Every user-visible label the card is contractually bound to. The
 * fire/override/history strings are referenced by the test contract and by
 * operator docs, so they live here as one list rather than being scattered
 * through JSX where a rename reads as harmless.
 */
export const SURGE_LABELS = {
  switchName: 'Surge',
  switchOn: 'Surge: On',
  switchOff: 'Surge: Off',
  editSteps: 'Edit steps',
  save: 'Save changes',
  saved: 'Saved ✓',
  discard: 'Discard',
  dirtyChip: 'Unsaved changes',
  addStep: 'Add step',
  removeStep: 'Remove step',
  override: 'Manual price override',
  set: 'Set',
  clearOverride: 'Clear override',
  fireHistory: 'Fire history',
  fireAndSave: 'Fire & save',
  cancel: 'Cancel',
  keepOn: 'Keep surge on',
  turnOff: 'Turn off surge',
} as const

// ── draft lifecycle ─────────────────────────────────────────────────────────

/** Server steps → editor draft. The inverse of what the card submits. */
export function stepsToDraft(steps: StepLike[] | null | undefined): DraftStep[] {
  return (steps ?? []).map((s) => ({
    threshold: String(s.threshold_sold),
    price: (s.price_cents / 100).toFixed(2),
  }))
}

/**
 * A comparison key for one row. Normalised through the SAME arithmetic the
 * submit path uses, so "10" and "10.00" are the same saved ladder and do not
 * light the dirty chip. Text that is not yet a number (mid-typing "", "1.")
 * is compared raw — it genuinely differs from what is saved.
 */
function stepKey(d: DraftStep): string {
  const t = d.threshold.trim()
  const p = d.price.trim()
  const tn = Number(t)
  const pn = Number(p)
  const tk = t !== '' && Number.isFinite(tn) ? String(Math.trunc(tn)) : `raw:${t}`
  const pk = p !== '' && Number.isFinite(pn) ? String(Math.round(pn * 100)) : `raw:${p}`
  return `${tk}@${pk}`
}

export function draftKey(draft: DraftStep[]): string {
  return draft.map(stepKey).join('|')
}

/** Has the operator changed the ladder since it was last loaded/saved? */
export function isDirty(draft: DraftStep[], saved: DraftStep[]): boolean {
  return draftKey(draft) !== draftKey(saved)
}

/**
 * The single save affordance. Clean is not a disabled mystery button: it says
 * "Saved ✓", which is the answer to the question the old card left invisible.
 */
export function saveButtonState(input: {
  dirty: boolean
  validationError?: string | null
  busy?: boolean
}): { label: string; disabled: boolean } {
  if (!input.dirty) return { label: SURGE_LABELS.saved, disabled: true }
  return { label: SURGE_LABELS.save, disabled: Boolean(input.busy) || Boolean(input.validationError) }
}

/** Prompt text for leaving the page with an unsaved draft. */
export const UNSAVED_NAV_PROMPT =
  'You have unsaved surge steps. Leave this page and discard them?'

/** A dirty draft is the only thing worth interrupting navigation for. */
export function shouldPromptOnLeave(dirty: boolean, editing: boolean): boolean {
  return dirty && editing
}

// ── the price line ──────────────────────────────────────────────────────────

export const PRICE_REASON = {
  surgeOff: 'Surge off — base price',
  override: 'Manual price override',
  base: 'Base price',
  /** step numbers are 1-based on screen; step_index is 0-based on the wire */
  fired: (stepNumber: number) => `Step ${stepNumber} fired`,
} as const

export interface PriceLineInput {
  hasLadder: boolean
  isActive: boolean
  baseCents: number
  overrideCents?: number | null
  steps?: StepLike[] | null
  /** `current_price_cents` from the ladder view — the server's own oracle. */
  serverPriceCents?: number | null
}

/**
 * What a customer is charged right now, and the one reason why.
 *
 * Derived from fields the card already receives — no new endpoint. Precedence
 * mirrors the services price oracle: an inactive ladder is not consulted at
 * all (so the answer is the base price), then a manual override, then the
 * highest step that has fired, then the base.
 *
 * The AMOUNT prefers the server's `current_price_cents` when it offers one,
 * because that is authoritative for what is actually charged; it is null for
 * an inactive ladder, which is exactly the case the operator most needs
 * spelled out.
 */
export function priceLine(input: PriceLineInput): { amountCents: number; reason: string } {
  const { hasLadder, isActive, baseCents, overrideCents, steps, serverPriceCents } = input

  if (!hasLadder) return { amountCents: baseCents, reason: PRICE_REASON.base }
  if (!isActive) return { amountCents: baseCents, reason: PRICE_REASON.surgeOff }
  if (overrideCents !== null && overrideCents !== undefined) {
    return { amountCents: serverPriceCents ?? overrideCents, reason: PRICE_REASON.override }
  }

  const fired = firedSteps(steps)
  if (fired.length > 0) {
    const top = fired[fired.length - 1]!
    return {
      amountCents: serverPriceCents ?? top.step.price_cents,
      reason: PRICE_REASON.fired(top.number),
    }
  }
  return { amountCents: serverPriceCents ?? baseCents, reason: PRICE_REASON.base }
}

/** Fired steps in ladder order, carrying their 1-based on-screen number. */
export function firedSteps(steps: StepLike[] | null | undefined): Array<{ step: StepLike; number: number }> {
  return (steps ?? [])
    .map((step, i) => ({ step, number: (step.step_index ?? i) + 1 }))
    .filter((s) => s.step.fired_at !== null && s.step.fired_at !== undefined)
}

// ── the On/Off switch ───────────────────────────────────────────────────────

/**
 * Turning surge OFF once steps have fired is the one flip that silently
 * changes what customers are charged, so it confirms. Turning it ON never
 * does — an inactive ladder charges base, so switching on can only move the
 * price to something the operator already configured and can see.
 */
export function needsOffConfirm(nextActive: boolean, steps: StepLike[] | null | undefined): boolean {
  return !nextActive && firedSteps(steps).length > 0
}

export function offConfirmCopy(baseCents: number): { title: string; body: string } {
  return {
    title: 'Turn off surge?',
    body: `Customers go back to ${fmtCents(baseCents)}. Fire history is kept.`,
  }
}

// ── the fire-on-save dialog ─────────────────────────────────────────────────

/**
 * Copy for the fire-on-save confirmation. The SEMANTICS are untouched by the
 * rework — it still appears before any fire, for saved steps at or below the
 * sold count, Cancel still fires nothing — but with the ladder off the
 * headline ("the price jumps right away") was simply not true, so the off case
 * now says what actually happens.
 */
export function fireDialogCopy(isActive: boolean, baseCents: number): {
  title: string
  body: string
  offNote: string | null
} {
  const passed = 'These step(s) are already at or below the current sold count and will fire immediately on save'
  return {
    title: 'Fire these steps now?',
    // Word-for-word the shipped sentence while surge is on — that case was
    // already right, and this rework is not a rewrite of it.
    body: isActive
      ? `${passed} — the price jumps right away for the next buyer.`
      : `${passed}.`,
    offNote: isActive
      ? null
      : `Surge is off, so customers keep paying ${fmtCents(baseCents)} until you turn surge on. The steps are marked as fired either way.`,
  }
}
