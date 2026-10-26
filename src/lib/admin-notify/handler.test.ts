// Audit F29: /api/admin-notify needs a business session, ignores identity
// fields from the body, and is rate limited. The fake sendEmail below IS the
// mocked Resend: whatever it captures is the payload the route would send.
import { test } from "node:test"
import assert from "node:assert/strict"
import { handleAdminNotify, parseAdminNotifyBody, type AdminNotifyDeps } from "./handler.ts"
import { parseBusinessSession, readBizToken } from "../business/server-session.ts"
import type { BusinessSession } from "../business/server-session.ts"

const SESSION: BusinessSession = {
  userId: 910,
  email: "owner@backroads.com",
  fullName: "Owner Jane",
  businessId: 8,
  businessName: "Backroads",
  businessEmail: "hello@backroads.com",
}

function req(body: unknown, headers: Record<string, string> = { cookie: "biz_token=abc" }): Request {
  return new Request("http://localhost/api/admin-notify", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

function deps(over: Partial<AdminNotifyDeps> = {}) {
  const sent: { subject: string; html: string }[] = []
  const calls = { resolveSession: 0, lookupVenue: [] as [string, number][] }
  const d: AdminNotifyDeps = {
    resolveSession: async () => {
      calls.resolveSession++
      return SESSION
    },
    lookupVenue: async (cookie, id) => {
      calls.lookupVenue.push([cookie, id])
      return id === 7 ? { id: 7, name: "Backroads Downtown", address: "1 Main St" } : null
    },
    ipLimit: () => ({ ok: true }),
    businessLimit: () => ({ ok: true }),
    sendEmail: async (m) => {
      sent.push(m)
      return {}
    },
    now: () => new Date("2026-10-26T12:00:00Z"),
    ...over,
  }
  return { d, sent, calls }
}

const FORGED = {
  type: "event",
  title: "Halloween Bash",
  id: 123,
  business: "Evil Corp",
  createdBy: "ceo@victim.com",
  university: "Harvard",
  venue: "Victim Venue",
  venue_id: 7,
  details: {
    Type: "Ticketed",
    "Created by": "ceo@victim.com",
    Business: "Evil Corp",
    Campus: "Harvard",
    "Venue address": "<b>somewhere</b>",
    Start: "2026-10-31 20:00",
  },
}

test("unauthenticated → 401, nothing sent", async () => {
  const { d, sent } = deps({ resolveSession: async () => null })
  const res = await handleAdminNotify(req(FORGED, {}), d)
  assert.equal(res.status, 401)
  assert.equal(sent.length, 0)
})

test("body-forged business / createdBy / campus never reach the email; session identity does", async () => {
  const { d, sent, calls } = deps()
  const res = await handleAdminNotify(req(FORGED), d)
  assert.equal(res.status, 201)
  assert.equal(sent.length, 1)
  const { subject, html } = sent[0]

  // From the session, not the body.
  assert.ok(subject.includes("Backroads"))
  assert.ok(!subject.includes("Evil Corp"))
  assert.ok(html.includes("owner@backroads.com"))
  assert.ok(html.includes("Owner Jane"))
  assert.ok(html.includes("Backroads"))
  assert.ok(html.includes("(#8)"))

  // Forged identity strings are absent everywhere, including the details table.
  for (const forged of ["Evil Corp", "ceo@victim.com", "Harvard", "Victim Venue"]) {
    assert.ok(!html.includes(forged), `forged "${forged}" leaked into the email`)
  }

  // Venue resolved by id against the caller's OWN venue list, with the cookie forwarded.
  assert.deepEqual(calls.lookupVenue, [["biz_token=abc", 7]])
  assert.ok(html.includes("Backroads Downtown"))

  // Non-identity details survive, escaped, under their own heading.
  assert.ok(html.includes("Form details (as submitted"))
  assert.ok(html.includes("Ticketed"))
  assert.ok(html.includes("&lt;b&gt;somewhere&lt;/b&gt;"))
  assert.ok(!html.includes("<b>somewhere</b>"))
})

test("title and id are escaped", async () => {
  const { d, sent } = deps()
  const res = await handleAdminNotify(req({ type: "deal", title: `<script>alert(1)</script>`, id: `9"><img src=x>` }), d)
  assert.equal(res.status, 201)
  const { html, subject } = sent[0]
  assert.ok(!html.includes("<script>"))
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"))
  assert.ok(!html.includes("<img"))
  assert.ok(subject.startsWith("New Deal: "))
})

test("a venue id the business doesn't own → no venue row (never the body's venue name)", async () => {
  const { d, sent } = deps()
  const res = await handleAdminNotify(req({ ...FORGED, venue_id: 999 }), d)
  assert.equal(res.status, 201)
  assert.ok(!sent[0].html.includes("Victim Venue"))
  assert.ok(!sent[0].html.includes(">Venue<"))
})

test("over the per-business limit → 429, nothing sent", async () => {
  const { d, sent } = deps({ businessLimit: () => ({ ok: false, reason: "burst" }) })
  const res = await handleAdminNotify(req(FORGED), d)
  assert.equal(res.status, 429)
  assert.equal(sent.length, 0)
})

test("over the per-IP limit → 429 before the session is even looked up", async () => {
  const { d, sent, calls } = deps({ ipLimit: () => ({ ok: false, reason: "daily" }) })
  const res = await handleAdminNotify(req(FORGED, { cookie: "biz_token=abc", "x-forwarded-for": "203.0.113.9" }), d)
  assert.equal(res.status, 429)
  assert.equal(calls.resolveSession, 0)
  assert.equal(sent.length, 0)
})

test("bad body → 400; Resend failure → 500", async () => {
  const a = deps()
  assert.equal((await handleAdminNotify(req({ type: "nope", title: "x" }), a.d)).status, 400)
  assert.equal((await handleAdminNotify(req({ type: "deal" }), a.d)).status, 400)
  const b = deps({ sendEmail: async () => ({ error: { message: "boom" } }) })
  assert.equal((await handleAdminNotify(req({ type: "deal", title: "ok" }), b.d)).status, 500)
})

test("parseAdminNotifyBody: identity-looking detail keys are dropped, the rest capped", () => {
  const big: Record<string, string> = {}
  for (let i = 0; i < 30; i++) big[`k${i}`] = "v"
  const parsed = parseAdminNotifyBody({
    type: "deal",
    title: " Two for one ",
    venue_id: "12",
    details: { ...big, "created-by": "x", BUSINESS: "y", Email: "z", Description: "a".repeat(900), empty: "" },
  })
  assert.ok(parsed)
  assert.equal(parsed.title, "Two for one")
  assert.equal(parsed.venueId, 12)
  assert.equal(parsed.details.length, 20)
  assert.ok(parsed.details.every(([k]) => !/created|business|email/i.test(k)))
  assert.equal(parseAdminNotifyBody({ type: "deal", title: "", details: {} }), null)
  assert.equal(parseAdminNotifyBody(null), null)
})

test("parseBusinessSession reads the real /business/auth/me shape", () => {
  const s = parseBusinessSession({
    user: { id: 910, email: "owner@backroads.com", full_name: "Owner Jane", business_role: "owner", venue_id: 4 },
    business: { business_id: 8, name: "Backroads", email: "hello@backroads.com", status: "approved" },
  })
  assert.deepEqual(s, SESSION)
  assert.equal(parseBusinessSession({ user: { id: 1 }, business: { business_id: 2 } }), null) // no email
  assert.equal(parseBusinessSession({ user: { id: "x", email: "a@b.c" }, business: { business_id: 2 } }), null)
  assert.equal(parseBusinessSession(null), null)
  assert.equal(readBizToken("foo=1; biz_token=abc.def; bar=2"), "abc.def")
  assert.equal(readBizToken("biz_session=1"), null)
})
