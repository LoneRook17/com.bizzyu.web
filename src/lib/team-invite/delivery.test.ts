// TI-2. The four phone-invite states the dialog can land on, plus the arms that
// must NOT move. The repo has no component-test toolchain (node --test, pure
// modules only — see package.json "test"), so every decision the panel makes
// lives in delivery.ts and is asserted here directly: copy, tone, and the one
// affordance that actually matters, "Text it yourself".

import { test } from "node:test"
import assert from "node:assert/strict"

import { parseDelivery, resolveInviteOutcome } from "./delivery.ts"
import { formatE164 } from "./phone.ts"

/** What the dialog does: parse the body, then resolve it. */
function outcomeFor(body: unknown, phone?: string) {
  return resolveInviteOutcome(parseDelivery(body), phone ? formatE164(phone) : null)
}

const LINK = "https://bizzyu.com/team-invite?token=t"

// ── State 1: Bizzy texted it ───────────────────────────────────────────────

test("sms_sent: success, names the number, and DROPS the manual text button", () => {
  const o = outcomeFor(
    { invite_link: LINK, delivery: "sms_sent" },
    "+15551234567"
  )

  assert.equal(o.kind, "sms_sent")
  assert.equal(o.tone, "success")
  assert.equal(o.title, "Invite sent by text ✓")
  // The receipt has to be checkable — and formatted, not raw E.164.
  assert.match(o.body, /\(555\) 123-4567/)
  assert.ok(!o.body.includes("+1555"))
  // The whole point of the state: the owner is not asked to send anything.
  assert.equal(o.showManualText, false)
})

test("sms_sent without a phone on hand: still honest, still no manual button", () => {
  const o = outcomeFor({ invite_link: LINK, delivery: "sms_sent" })

  assert.equal(o.kind, "sms_sent")
  assert.equal(o.showManualText, false)
  // No stray "to null"/"to undefined" leaking into the sentence.
  assert.ok(!/null|undefined/.test(o.body))
})

// ── State 2: already invited, server stayed silent on purpose ──────────────

test("duplicate_invite: says the earlier text still works, offers NO re-send", () => {
  const o = outcomeFor({
    invite_link: LINK,
    delivery: "link_only",
    delivery_reason: "duplicate_invite",
  })

  assert.equal(o.kind, "already_invited")
  assert.equal(o.tone, "info")
  assert.match(o.title, /Already invited/)
  assert.match(o.body, /still works/)
  // The server deliberately did not text again; the UI must not invite the
  // owner to do it either, or the "silent duplicate" design leaks out as a
  // second message from a second number.
  assert.equal(o.showManualText, false)
  // And it must not read as a failure.
  assert.notEqual(o.tone, "warning")
})

// ── State 3: no text went out — the owner's job again ──────────────────────

for (const reason of ["guard_skipped", "send_failed"] as const) {
  test(`${reason}: warns it couldn't text, KEEPS the manual path`, () => {
    const o = outcomeFor({
      invite_link: LINK,
      delivery: "link_only",
      delivery_reason: reason,
    })

    assert.equal(o.kind, "sms_unavailable")
    assert.equal(o.tone, "warning")
    assert.match(o.title, /couldn't text/)
    assert.equal(o.showManualText, true)
    // Never claims a send happened.
    assert.ok(!/we texted/i.test(o.body + o.title))
  })
}

// ── State 4: LEGACY — the shape deployed services return TODAY ─────────────

test("link_only with NO reason (legacy, deployed today) → byte-identical to pre-TI-2", () => {
  const o = outcomeFor({ invite_link: LINK, delivery: "link_only" })

  assert.equal(o.kind, "link_only_legacy")
  assert.equal(o.tone, "info")
  // These two strings are the shipped copy. If this test fails, the live
  // dashboard's phone-invite flow just changed under services that cannot
  // possibly send an SMS.
  assert.equal(o.title, "Invite ready to send.")
  assert.equal(o.body, "Bizzy doesn't text invites — send them this link and they're in.")
  assert.equal(o.description, "Send them the link — Bizzy doesn't text invites.")
  assert.equal(o.showManualText, true)
})

test("an absent reason is never inferred into a skip state", () => {
  // The distinction the whole file rests on: "no auto-send exists" is not the
  // same claim as "auto-send ran and declined".
  const legacy = outcomeFor({ invite_link: LINK, delivery: "link_only" })
  const skipped = outcomeFor({
    invite_link: LINK,
    delivery: "link_only",
    delivery_reason: "guard_skipped",
  })

  assert.notEqual(legacy.kind, skipped.kind)
  assert.notEqual(legacy.title, skipped.title)
})

// ── parseDelivery: tolerance against three server generations ──────────────

test("parseDelivery: reads the TI-1 pair, and null-reasons the legacy body", () => {
  assert.deepEqual(parseDelivery({ delivery: "sms_sent" }), {
    delivery: "sms_sent",
    reason: null,
  })
  assert.deepEqual(
    parseDelivery({ delivery: "link_only", delivery_reason: "duplicate_invite" }),
    { delivery: "link_only", reason: "duplicate_invite" }
  )
  assert.deepEqual(parseDelivery({ delivery: "link_only" }), {
    delivery: "link_only",
    reason: null,
  })
})

test("parseDelivery: garbage degrades to link_only instead of throwing", () => {
  // An invite that really was created must never be lost to a delivery field.
  for (const body of [null, undefined, {}, { delivery: "teleported" }, { delivery: 7 }]) {
    const info = parseDelivery(body)
    assert.equal(info.delivery, "link_only")
    assert.equal(info.reason, null)
    // And it lands on the arm that always shows a way to send the link.
    assert.equal(resolveInviteOutcome(info).showManualText, true)
  }
})

test("parseDelivery: a reason on a non-link_only delivery is dropped", () => {
  // sms_sent + 'send_failed' is incoherent; the send is the stronger signal.
  assert.deepEqual(
    parseDelivery({ delivery: "sms_sent", delivery_reason: "send_failed" }),
    { delivery: "sms_sent", reason: null }
  )
  assert.equal(parseDelivery({ delivery: "link_only", delivery_reason: "nonsense" }).reason, null)
})

// ── Untouched arms ─────────────────────────────────────────────────────────

test("email arms are unchanged by TI-2", () => {
  const sent = outcomeFor({ invite_link: LINK, delivery: "email_sent" })
  assert.equal(sent.kind, "email_sent")
  assert.equal(sent.title, "Invite emailed.")
  assert.equal(sent.showManualText, true)

  const failed = resolveInviteOutcome({ delivery: "email_failed", reason: null })
  assert.equal(failed.kind, "email_failed")
  assert.equal(failed.title, "The invite email didn't send.")
  assert.equal(failed.showManualText, true)
})

test("copy-link is never gated: every outcome keeps a way to hand over the link", () => {
  // showManualText may be false, but no arm is allowed to leave the owner with
  // nothing — the panel renders the link + copy button unconditionally, so the
  // only thing to assert here is that no arm claims otherwise in its copy.
  const arms = [
    outcomeFor({ delivery: "sms_sent" }),
    outcomeFor({ delivery: "link_only", delivery_reason: "duplicate_invite" }),
    outcomeFor({ delivery: "link_only", delivery_reason: "send_failed" }),
    outcomeFor({ delivery: "link_only" }),
  ]
  for (const a of arms) {
    assert.ok(a.title.length > 0 && a.body.length > 0 && a.description.length > 0)
  }
  assert.equal(new Set(arms.map((a) => a.kind)).size, 4, "all four states are distinct")
})

// ── The display formatter the receipt depends on ───────────────────────────

test("formatE164: E.164 → display, unlike the progressive input formatter", () => {
  assert.equal(formatE164("+15551234567"), "(555) 123-4567")
  assert.equal(formatE164("5551234567"), "(555) 123-4567")
  // Unparseable stays untouched rather than becoming a wrong-looking number.
  assert.equal(formatE164("+44 20 7946 0958"), "+44 20 7946 0958")
  assert.equal(formatE164(""), "")
})
