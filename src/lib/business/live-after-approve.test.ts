import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  draftIdsToPublish,
  isApprovedBusinessStatus,
  mergeUpcomingWithQueuedDrafts,
  shouldAutoPublishCreatedDraft,
  shouldPromoteQueuedDrafts,
  shouldRunLiveAfterApprove,
  shouldTreatDraftAsLive,
} from "./live-after-approve.ts"

test("approved is the only live-after-approve business status", () => {
  assert.equal(isApprovedBusinessStatus("approved"), true)
  assert.equal(isApprovedBusinessStatus("pending_approval"), false)
  assert.equal(isApprovedBusinessStatus("pending"), false)
})

test("queued drafts promote only after approval", () => {
  assert.equal(shouldPromoteQueuedDrafts(true), false)
  assert.equal(shouldPromoteQueuedDrafts(false), true)
  assert.equal(shouldTreatDraftAsLive(false), true)
  assert.equal(shouldTreatDraftAsLive(true), false)
})

test("live-after-approve runs once per approved business, never while pending", () => {
  assert.equal(shouldRunLiveAfterApprove({ isPending: true, businessId: 9, alreadyRan: false }), false)
  assert.equal(shouldRunLiveAfterApprove({ isPending: false, businessId: 9, alreadyRan: false }), true)
  assert.equal(shouldRunLiveAfterApprove({ isPending: false, businessId: 9, alreadyRan: true }), false)
  assert.equal(shouldRunLiveAfterApprove({ isPending: false, businessId: null, alreadyRan: false }), false)
})

test("a create that came back draft on an approved host is auto-published", () => {
  assert.equal(
    shouldAutoPublishCreatedDraft({ returnedStatus: "draft", isPending: false, saveAsDraft: false }),
    true,
  )
  assert.equal(
    shouldAutoPublishCreatedDraft({ returnedStatus: "draft", isPending: true, saveAsDraft: false }),
    false,
  )
  assert.equal(
    shouldAutoPublishCreatedDraft({ returnedStatus: "draft", isPending: false, saveAsDraft: true }),
    false,
  )
  assert.equal(
    shouldAutoPublishCreatedDraft({ returnedStatus: "published", isPending: false, saveAsDraft: false }),
    false,
  )
})

test("approved hosts see queued drafts on Upcoming until publish lands", () => {
  const upcoming = [{ event_id: 1, status: "published" }]
  const drafts = [{ event_id: 2, status: "draft" }, { event_id: 1, status: "draft" }]
  assert.deepEqual(
    mergeUpcomingWithQueuedDrafts(upcoming, drafts, false).map((e) => e.event_id),
    [1, 2],
  )
  assert.deepEqual(
    mergeUpcomingWithQueuedDrafts(upcoming, drafts, true).map((e) => e.event_id),
    [1],
  )
})

test("only draft ids are published", () => {
  assert.deepEqual(
    draftIdsToPublish([
      { event_id: 10, status: "draft" },
      { event_id: 11, status: "published" },
      { event_id: 12 },
    ]),
    [10, 12],
  )
})

test("DoorAccessWizard promoter gate is paid-tier only — approved escrow is not hard-blocked", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/business/v2/door-access/DoorAccessWizard.tsx"),
    "utf8",
  )
  assert.ok(src.includes("promoterToggleDisabled"), "wizard must use the shared promoter gate")
  assert.ok(src.includes("isLeftoverPromoterPayoutPathError"), "validate-step leftover must not hard-block Continue")
  assert.ok(
    !src.includes("promoToggleDisabled = !hasPaidTier || !stripeOnboarded"),
    "Stripe must not hard-block promoter on approved escrow",
  )
  assert.ok(!/payout path/i.test(src), "wizard must not hardcode the leftover payout-path banner")
})

test("EventForm promoter gate is paid-ticket only — Review does not upsell Connect for the leftover", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/business/v2/events/EventForm.tsx"),
    "utf8",
  )
  assert.ok(src.includes("promoterToggleDisabled"), "event create must use the shared promoter gate")
  assert.ok(src.includes("shouldOfferStripeConnectForError"), "Review must not treat leftover promoter copy as a Connect CTA")
  assert.ok(
    !src.includes("promoToggleDisabled = !hasPaidTicket || !stripeOnboarded"),
    "Stripe must not hard-block promoter on event create",
  )
  assert.doesNotMatch(src, /\/Stripe Connect\/i/, "leftover promoter copy is not a Connect upsell")
  assert.ok(!/payout path/i.test(src), "event create must not hardcode the leftover payout-path banner")
})

test("SeriesForm promoter gate is paid-ticket only", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/business/v2/recurring/SeriesForm.tsx"),
    "utf8",
  )
  assert.ok(src.includes("promoterToggleDisabled"), "series form must use the shared promoter gate")
  assert.ok(
    !src.includes("promoToggleDisabled = !hasPaidTicket || !stripeOnboarded"),
    "Stripe must not hard-block promoter on series create",
  )
})

test("dashboard shell runs live-after-approve once the host is approved", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/layout.tsx"),
    "utf8",
  )
  assert.ok(src.includes("LiveAfterApprove"), "approved hosts must promote queued drafts without a refresh loop")
})

test("event detail Publish is enabled after approve", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/events/[id]/page.tsx"),
    "utf8",
  )
  assert.ok(src.includes("shouldTreatDraftAsLive"), "detail must know drafts go live after approve")
  assert.doesNotMatch(
    src,
    /disabled=\{publishing \|\| isPending\}/,
    "Publish must not stay locked after admin approve",
  )
})
