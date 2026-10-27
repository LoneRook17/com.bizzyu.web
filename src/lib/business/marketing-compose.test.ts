import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  ANNOUNCEMENT_MAX,
  SMS_MAX,
  canReview,
  charLimitFor,
  composerTransition,
  cooldownNote,
  formatCountdown,
  hasMarketingEmoji,
  insertMarketingLink,
  linkableMarketingRows,
  marketingEventLinkUrl,
  reachLine,
  reviewButtonLabel,
  sanitizeMarketingInput,
  sentLine,
  stripMarketingEmoji,
  type ComposerStage,
} from "./marketing-compose.ts"

// ─── limits ──────────────────────────────────────────────────────────────

test("texts cap at 160 and announcements at 280 — never 400", () => {
  assert.equal(SMS_MAX, 160)
  assert.equal(ANNOUNCEMENT_MAX, 280)
  assert.equal(charLimitFor("sms"), 160)
  assert.equal(charLimitFor("announcement"), 280)
})

test("no composer still carries the old 400-char SMS cap", () => {
  for (const rel of [
    "src/components/business/v2/marketing/BlastComposer.tsx",
    "src/components/business/dashboard/marketing/BlastComposerModal.tsx",
    "src/app/business/(dashboard)/events/[id]/manage/announcements/page.tsx",
  ]) {
    const src = readFileSync(join(process.cwd(), rel), "utf8")
    assert.ok(!/SMS_MAX\s*=\s*400/.test(src), `${rel} must not define SMS_MAX = 400`)
    // A bare 400 (not a Tailwind shade like text-red-400) is the old cap.
    assert.ok(!/(?<![\w-])400(?![\w-])/.test(src), `${rel} must not mention a 400 cap`)
  }
})

// ─── emoji ───────────────────────────────────────────────────────────────

test("strips emoji, flags, skin tones, ZWJ sequences, keycaps; keeps text and accents", () => {
  assert.equal(stripMarketingEmoji("Doors at 10 🎉 see you 👋🏽!").text, "Doors at 10  see you !")
  assert.equal(stripMarketingEmoji("Go 🇺🇸 team 👨‍👩‍👧 1️⃣ ✅ ⭐").text, "Go  team  1  ")
  const plain = "Café & bar: $5 drinks @ 9pm — ça va?"
  assert.deepEqual(stripMarketingEmoji(plain), { text: plain, stripped: false })
  assert.equal(hasMarketingEmoji("plain"), false)
  assert.equal(hasMarketingEmoji("plain 🙂"), true)
  assert.equal(hasMarketingEmoji("plain"), false, "the global regex must not carry lastIndex state")
})

test("sanitizeMarketingInput strips then hard-caps, and keeps the cursor on the kept text", () => {
  const typed = "Hi 🎉 there"
  const out = sanitizeMarketingInput(typed, 160, typed.length)
  assert.equal(out.text, "Hi  there")
  assert.equal(out.cursor, "Hi  there".length)
  assert.equal(out.strippedEmoji, true)

  const long = "a".repeat(200)
  const capped = sanitizeMarketingInput(long, 160)
  assert.equal(capped.text.length, 160, "hard cap, not just a red counter")
  assert.equal(capped.strippedEmoji, false)

  // Cursor mid-text, emoji before it: the cursor index drops by the emoji's width.
  const mid = "A🎉B|C".replace("|", "")
  const midOut = sanitizeMarketingInput(mid, 160, 4) // after "A🎉B" (🎉 is 2 UTF-16 units)
  assert.equal(midOut.text, "ABC")
  assert.equal(midOut.cursor, 2)
})

// ─── Add event link ──────────────────────────────────────────────────────

test("the inserted link is the prod public event page, bare, regardless of env", () => {
  process.env.NEXT_PUBLIC_WEB_BASE_URL = "https://com-bizzyu-web-l2gp.vercel.app"
  assert.equal(marketingEventLinkUrl(2177), "https://bizzyu.com/event/2177")
  assert.ok(!marketingEventLinkUrl(2177).includes("?"))
})

test("insertMarketingLink pads spaces, replaces a selection, lands the cursor after the link", () => {
  const link = "https://bizzyu.com/event/2177"
  assert.deepEqual(insertMarketingLink("", link, 0, 0, 160), { text: link, cursor: link.length })
  assert.deepEqual(insertMarketingLink("Doors at 10", link, 11, 11, 160), {
    text: `Doors at 10 ${link}`,
    cursor: `Doors at 10 ${link}`.length,
  })
  assert.equal(insertMarketingLink("Doors at 10 ", link, 12, 12, 160)!.text, `Doors at 10 ${link}`)
  assert.deepEqual(insertMarketingLink("Doorstonight", link, 5, 5, 160), {
    text: `Doors ${link} tonight`,
    cursor: `Doors ${link} `.length,
  })
  assert.equal(insertMarketingLink("See LINK tonight", link, 4, 8, 160)!.text, `See ${link} tonight`)
})

test("insertMarketingLink refuses when the link would not fit the cap", () => {
  const link = "https://bizzyu.com/event/2177"
  assert.equal(insertMarketingLink("a".repeat(140), link, 140, 140, 160), null)
  assert.equal(insertMarketingLink("a".repeat(130), link, 130, 130, 160)!.text.length, 160)
})

test("the venue-wide picker only offers rows with an event id (a public page)", () => {
  const rows = linkableMarketingRows([
    { key: "a", eventId: 1 },
    { key: "b", eventId: null },
    { key: "c", eventId: 3 },
  ])
  assert.deepEqual(
    rows.map((r) => r.key),
    ["a", "c"],
  )
})

// ─── stages ──────────────────────────────────────────────────────────────

test("the staged flow: compose → review → sending → sent, no shortcuts, no second send", () => {
  let s: ComposerStage = "compose"
  assert.equal(composerTransition(s, "send"), "compose", "no send straight from the textarea")
  s = composerTransition(s, "review")
  assert.equal(s, "review")
  assert.equal(composerTransition(s, "edit"), "compose")
  s = composerTransition(s, "send")
  assert.equal(s, "sending")
  assert.equal(composerTransition(s, "send"), "sending", "a second click while in flight is a no-op")
  assert.equal(composerTransition(s, "edit"), "sending", "locked while in flight")
  assert.equal(composerTransition(s, "fail"), "compose", "a real error goes back to compose")
  s = composerTransition(s, "sent")
  assert.equal(s, "sent")
  for (const e of ["review", "edit", "send", "fail"] as const) {
    assert.equal(composerTransition("sent", e), "sent", "sent is terminal")
  }
})

test("canReview: a message within the cap, audience known and reachable, venue picked", () => {
  const base = { text: "Doors at 10", limit: 160, previewLoading: false, reachable: 8, locked: false }
  assert.equal(canReview(base), true)
  assert.equal(canReview({ ...base, text: "   " }), false)
  assert.equal(canReview({ ...base, text: "a".repeat(161) }), false)
  assert.equal(canReview({ ...base, previewLoading: true }), false)
  assert.equal(canReview({ ...base, reachable: 0 }), false)
  assert.equal(canReview({ ...base, reachable: null }), false)
  assert.equal(canReview({ ...base, locked: true }), false)
  assert.equal(canReview({ ...base, mustPickVenue: true }), false)
})

// ─── copy ────────────────────────────────────────────────────────────────

test("copy matches the app: reach line, review button, sent line", () => {
  assert.equal(
    reachLine({ channel: "sms", cohort: "followers", reachable: 8, total: 10 }),
    "Sending to 8 of 10 followers with SMS opted-in.",
  )
  assert.equal(
    reachLine({ channel: "announcement", cohort: "ticket holders", reachable: 12, total: 12 }),
    "Sending to 12 of 12 ticket holders with push enabled.",
  )
  assert.equal(reviewButtonLabel("ticket holders", 12), "Send to 12 ticket holders")
  assert.equal(reviewButtonLabel("followers", 1), "Send to 1 follower")
  assert.equal(sentLine("followers", 8), "On its way to 8 followers.")
})

test("the reset countdown reads like the app's", () => {
  assert.equal(formatCountdown(0), "now")
  assert.equal(formatCountdown(30), "30s")
  assert.equal(formatCountdown(250), "4m 10s")
  assert.equal(formatCountdown(3600), "1h 0m")
  assert.equal(formatCountdown(90000), "1d 1h")
  assert.equal(
    cooldownNote("sms", "venue", 3600),
    "This week's text blast is used for this venue. Resets Monday (in 1h 0m).",
  )
  assert.equal(
    cooldownNote("announcement", "account", 90000),
    "Both of this week's announcements are used. Resets Monday (in 1d 1h).",
  )
})

// ─── wiring (source contract) ────────────────────────────────────────────

test("the per-event announcements page composes through the shared staged composer", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/events/[id]/manage/announcements/page.tsx"),
    "utf8",
  )
  assert.ok(src.includes("BlastComposer"), "must render the shared BlastComposer")
  assert.ok(!src.includes("<Textarea"), "no one-shot textarea + Send dialog of its own")
  assert.ok(src.includes("eventLinkId"), "event-scoped Add event link")
})

test("both venue composers ride the shared contract, and the legacy modal delegates", () => {
  const v2 = readFileSync(join(process.cwd(), "src/components/business/v2/marketing/BlastComposer.tsx"), "utf8")
  for (const needle of ["composerTransition", "sanitizeMarketingInput", "insertMarketingLink", "charLimitFor", "newIdempotencyKey"]) {
    assert.ok(v2.includes(needle), `BlastComposer must use ${needle}`)
  }
  const legacy = readFileSync(
    join(process.cwd(), "src/components/business/dashboard/marketing/BlastComposerModal.tsx"),
    "utf8",
  )
  assert.ok(legacy.includes("BlastComposer"), "the legacy modal delegates to the staged composer")
  const following = readFileSync(join(process.cwd(), "src/components/business/v2/marketing/FollowingTab.tsx"), "utf8")
  assert.ok(following.includes("linkVenueId"), "venue-wide composer gets the venue scope for the link picker")
})
