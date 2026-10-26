// Audit F30: public Resend forms must escape every visitor field and reject a
// malformed email with 422. The builders return exactly the subject/html the
// routes hand to Resend, so asserting on them is asserting on the send payload.
import { test } from "node:test"
import assert from "node:assert/strict"
import { isEmailLike, parseContact, parseEventsContact, parseSubmission } from "./validate.ts"
import { buildContactEmail, buildEventsContactEmail, buildSubmissionEmail } from "./emails.ts"

const XSS = `<script>alert("pwn")</script>`
const IMG = `<img src=x onerror=alert(1)>`

test("isEmailLike: accepts ordinary addresses, rejects junk and injected text", () => {
  assert.equal(isEmailLike("jane@example.com"), true)
  assert.equal(isEmailLike("first.last+tag@sub.example.co.uk"), true)
  assert.equal(isEmailLike("not-an-email"), false)
  assert.equal(isEmailLike("a@b"), false)
  assert.equal(isEmailLike("jane@example.com\nBcc: evil@x.com"), false)
  assert.equal(isEmailLike("<b>x</b>@example.com"), true) // shape only; escaping handles markup
  assert.equal(isEmailLike(""), false)
  assert.equal(isEmailLike("a".repeat(250) + "@x.com"), false)
})

// ---------------------------------------------------------------- contact

test("contact: HTML in name/message reaches Resend as entities, not tags", () => {
  const parsed = parseContact({ name: XSS, email: "jane@example.com", type: "student", message: `hi ${IMG}` })
  assert.ok(parsed.ok)
  const mail = buildContactEmail(parsed.data, "now")
  assert.ok(!mail.html.includes("<script>"))
  assert.ok(!mail.html.includes("<img"))
  assert.ok(mail.html.includes("&lt;script&gt;alert(&quot;pwn&quot;)&lt;/script&gt;"))
  assert.ok(mail.html.includes("&lt;img src=x onerror=alert(1)&gt;"))
  assert.equal(mail.replyTo, "jane@example.com")
})

test("contact: bad email → 422; missing field → 400", () => {
  const bad = parseContact({ name: "Jane", email: "nope", type: "student", message: "hi" })
  assert.deepEqual(bad, { ok: false, status: 422, error: "Enter a valid email address" })
  const missing = parseContact({ name: "Jane", email: "jane@example.com", type: "", message: "hi" })
  assert.equal(missing.ok, false)
  assert.equal((missing as { status: number }).status, 400)
})

test("contact: happy path builds the send, unexpected keys are dropped, lengths capped", () => {
  const parsed = parseContact({
    name: "  Jane\nDoe ",
    email: " jane@example.com ",
    type: "business",
    message: "x".repeat(6000),
    turnstileToken: "tok",
    website_url: "",
    admin: true,
    to: "attacker@example.com",
  })
  assert.ok(parsed.ok)
  assert.deepEqual(Object.keys(parsed.data).sort(), ["email", "message", "name", "type"])
  assert.equal(parsed.data.name, "Jane Doe")
  assert.equal(parsed.data.message.length, 5000)
  const mail = buildContactEmail(parsed.data, "now")
  assert.equal(mail.subject, "New Contact Form: Jane Doe (business)")
  assert.ok(mail.html.includes("New Contact Message"))
})

// --------------------------------------------------------- events-contact

test("events-contact: every field escaped; eventTypes array joined", () => {
  const parsed = parseEventsContact({
    venueName: XSS,
    contactName: "<b>Bob</b>",
    email: "bob@venue.com",
    phone: `555 ${IMG}`,
    venueType: "Bar <i>",
    eventTypes: ["Live music", "<u>Trivia</u>"],
    frequency: "Weekly",
    details: `line1\n${XSS}`,
  })
  assert.ok(parsed.ok)
  assert.equal(parsed.data.eventTypes, "Live music, <u>Trivia</u>")
  const mail = buildEventsContactEmail(parsed.data, "now")
  assert.ok(!/<script|<img|<b>|<i>|<u>/.test(mail.html))
  assert.ok(mail.html.includes("&lt;u&gt;Trivia&lt;/u&gt;"))
  assert.ok(mail.html.includes("&lt;script&gt;"))
  assert.equal(mail.subject, `New Events Inquiry: ${XSS}`)
  assert.equal(mail.replyTo, "bob@venue.com")
})

test("events-contact: bad email → 422", () => {
  const r = parseEventsContact({
    venueName: "V", contactName: "C", email: "bob@", venueType: "Bar", eventTypes: "Trivia", frequency: "Weekly",
  })
  assert.deepEqual(r, { ok: false, status: 422, error: "Enter a valid email address" })
})

// ------------------------------------------------------------ submissions

test("submissions: nested business/deal escaped; only known keys survive; media filtered", () => {
  const parsed = parseSubmission({
    business: {
      businessName: XSS,
      contactName: "Cal",
      email: "cal@biz.com",
      phone: "1",
      address: IMG,
      website: "https://biz.com",
      instagram: "@biz",
      campus: "FGCU",
      role: "owner", // unknown → dropped
    },
    deal: {
      title: `Deal ${IMG}`,
      description: "desc <script>",
      category: "food",
      redemptionFrequency: "daily",
      limitedSupplyCount: "10",
      estimatedSavings: "$5",
      startDate: "2026-11-01",
      endDate: "",
      availability: { enabled: true, startTime: "15:00", endTime: "18:00", days: [1, 2, 2, 9, "3"] },
      __proto__hack: "x",
    },
    media: { logoUrl: "javascript:alert(1)", dealImageUrl: "data:image/png;base64,AAAA", extra: "y" },
    turnstileToken: "t",
    website_url: "",
  })
  assert.ok(parsed.ok)
  const { business, deal, media } = parsed.data
  assert.deepEqual(Object.keys(business).sort(), ["address", "businessName", "campus", "contactName", "email", "instagram", "phone", "website"])
  assert.deepEqual(Object.keys(deal).sort(), ["availability", "category", "description", "endDate", "estimatedSavings", "limitedSupplyCount", "redemptionFrequency", "startDate", "title"])
  assert.deepEqual(Object.keys(media).sort(), ["dealImageUrl", "logoUrl"])
  assert.deepEqual(deal.availability, { enabled: true, startTime: "15:00", endTime: "18:00", days: [1, 2, 3] })
  assert.equal(media.logoUrl, "") // javascript: dropped
  assert.equal(media.dealImageUrl, "data:image/png;base64,AAAA")

  const mail = buildSubmissionEmail({ data: parsed.data, forwardFailed: false, hasAttachment: true, submissionId: "sub_1", submittedAt: "now" })
  assert.ok(!/<script|<img/.test(mail.html))
  assert.ok(mail.html.includes("&lt;script&gt;alert(&quot;pwn&quot;)&lt;/script&gt;"))
  assert.ok(mail.html.includes("&lt;img src=x onerror=alert(1)&gt;"))
  assert.ok(mail.html.includes("Deal image attached."))
  assert.ok(mail.html.includes("New Deal Submission"))
  assert.ok(mail.html.includes("3:00 PM"))
})

test("submissions: bad email → 422; missing title → 400; failed forward keeps its banner", () => {
  const bad = parseSubmission({ business: { businessName: "B", email: "x" }, deal: { title: "T" } })
  assert.deepEqual(bad, { ok: false, status: 422, error: "Enter a valid email address" })
  const missing = parseSubmission({ business: { businessName: "B", email: "b@b.com" }, deal: {} })
  assert.equal((missing as { status: number }).status, 400)

  const ok = parseSubmission({ business: { businessName: "B", email: "b@b.com" }, deal: { title: "T" } })
  assert.ok(ok.ok)
  const mail = buildSubmissionEmail({ data: ok.data, forwardFailed: true, hasAttachment: false, submissionId: "sub_2", submittedAt: "now" })
  assert.ok(mail.html.includes("Deal submission was NOT saved"))
})
