// DASH2-D — the Home "Connect Stripe" card's visibility rule.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  shouldShowStripeConnectPrompt,
  canManagePayouts,
  type HomeStripePromptInput,
} from "./home-stripe-prompt.ts"

const shape = (over: Partial<HomeStripePromptInput> = {}): HomeStripePromptInput => ({
  stripeOnboarded: false,
  escrowPanelVisible: false,
  canManagePayouts: true,
  ...over,
})

// ── The case this whole card exists for ─────────────────────────────────────

test("no Stripe, ZERO escrow — the gap DASH2-D closes: Home now says something", () => {
  assert.equal(shouldShowStripeConnectPrompt(shape()), true)
})

// ── Never two Stripe CTAs on one page ───────────────────────────────────────

test("no Stripe but money waiting — the BE-D hero owns the CTA, the card stays away", () => {
  assert.equal(
    shouldShowStripeConnectPrompt(shape({ escrowPanelVisible: true })),
    false,
  )
})

test("the hero wins even in its processing/paid states", () => {
  // The card does not try to second-guess WHICH escrow state is showing.
  // After the paid banner's 24h window, callers pass false here.
  assert.equal(
    shouldShowStripeConnectPrompt(shape({ stripeOnboarded: true, escrowPanelVisible: true })),
    false,
  )
})

// ── Connected businesses see neither ────────────────────────────────────────

test("connected + no escrow — nothing at all", () => {
  assert.equal(shouldShowStripeConnectPrompt(shape({ stripeOnboarded: true })), false)
})

// ── Failure stays quiet, never noisy ────────────────────────────────────────

test("unknown Stripe state (profile read failed) does NOT nag", () => {
  // A flaked /business/profile must never tell a connected business to
  // connect Stripe. null is not false.
  assert.equal(shouldShowStripeConnectPrompt(shape({ stripeOnboarded: null })), false)
})

// ── Role ────────────────────────────────────────────────────────────────────

test("staff never see it — the onboarding POST would 403 on them", () => {
  assert.equal(shouldShowStripeConnectPrompt(shape({ canManagePayouts: false })), false)
})

test("canManagePayouts is the standard owner/manager gate", () => {
  assert.equal(canManagePayouts("owner"), true)
  assert.equal(canManagePayouts("manager"), true)
  assert.equal(canManagePayouts("staff"), false)
  assert.equal(canManagePayouts(null), false)
  assert.equal(canManagePayouts(undefined), false)
})
