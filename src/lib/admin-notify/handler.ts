/**
 * POST /api/admin-notify — "a business just created a deal/event" email to
 * the admins (audit F29).
 *
 * Before: public, unauthenticated, no rate limit, and it trusted `business`,
 * `createdBy`, `university`, `venue` from the body — so anyone could send the
 * admins a forged "Evil Corp created an event" mail, as fast as they liked.
 *
 * Now, in order:
 *   1. per-IP limiter (cheap, before any upstream call)       → 429
 *   2. business dashboard session required (biz_token cookie,
 *      verified against GET /business/auth/me)                → 401
 *   3. per-business limiter                                    → 429
 *   4. body: only `type`, `title`, `id`, `venue_id`, `details` are read.
 *      Identity (business name/id, creator name/email) comes from the
 *      session; the venue from the caller's own venue list by id. Any
 *      identity-looking key in `details` is dropped, and the rest renders
 *      under a separate "as submitted" heading.                → 400 on junk
 *   5. every interpolated field is HTML-escaped.
 *
 * Dependency-injected so the whole flow runs under `node --test` with a fake
 * session resolver and a captured Resend payload; the route wires the real
 * ones. No `@/` imports.
 */
import { escapeHtml } from "../html-escape.ts"
import { line, text } from "../public-forms/validate.ts"
import { getClientIp } from "../verifyTurnstile.ts"
import type { BusinessSession, BusinessVenueSummary } from "../business/server-session.ts"

export type LimitResult = { ok: true } | { ok: false; reason: "burst" | "daily" }

export interface AdminNotifyDeps {
  resolveSession: (cookieHeader: string) => Promise<BusinessSession | null>
  lookupVenue: (cookieHeader: string, venueId: number) => Promise<BusinessVenueSummary | null>
  ipLimit: (key: string) => LimitResult
  businessLimit: (key: string) => LimitResult
  /** Hand the finished subject/html to Resend. Resolve `{ error }` on a send failure. */
  sendEmail: (msg: { subject: string; html: string }) => Promise<{ error?: unknown }>
  now?: () => Date
}

export interface AdminNotifyInput {
  type: "deal" | "event"
  title: string
  id: string | null
  venueId: number | null
  /** Non-identity key/value pairs from the form, already trimmed and capped. */
  details: [string, string][]
}

const MAX_DETAILS = 20
const DETAIL_KEY_MAX = 60
const DETAIL_VALUE_MAX = 500

// Keys a caller could use to smuggle a forged identity line into the "details"
// table. Compared after lowercasing and stripping non-letters.
const IDENTITY_KEYS = new Set([
  "business", "businessname", "businessid", "createdby", "creator", "owner", "user", "account",
  "email", "campus", "university", "school", "venue", "venuename",
])

function identityKey(k: string): boolean {
  return IDENTITY_KEYS.has(k.toLowerCase().replace(/[^a-z]/g, ""))
}

function positiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

export function parseAdminNotifyBody(body: unknown): AdminNotifyInput | null {
  const b = (body && typeof body === "object" ? body : null) as Record<string, unknown> | null
  if (!b) return null
  const type = b.type === "deal" || b.type === "event" ? b.type : null
  const title = line(b.title, 200)
  if (!type || !title) return null

  const id = typeof b.id === "number" || typeof b.id === "string" ? line(String(b.id), 40) || null : null
  const venueId = positiveInt(b.venue_id)

  const details: [string, string][] = []
  if (b.details && typeof b.details === "object" && !Array.isArray(b.details)) {
    for (const [k, v] of Object.entries(b.details as Record<string, unknown>)) {
      if (details.length >= MAX_DETAILS) break
      const key = line(k, DETAIL_KEY_MAX)
      if (!key || identityKey(key)) continue
      if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") continue
      const value = text(String(v), DETAIL_VALUE_MAX)
      if (!value) continue
      details.push([key, value])
    }
  }
  return { type, title, id, venueId, details }
}

function row(label: string, cell: string, opts: { bold?: boolean; width?: number } = {}): string {
  const w = opts.width ? ` width: ${opts.width}px;` : ""
  const b = opts.bold ? " font-weight: 600;" : ""
  return `<tr><td style="padding: 6px 0; color: #6b7280;${w}">${escapeHtml(label)}</td><td style="padding: 6px 0;${b}">${cell}</td></tr>`
}

export function buildAdminNotifyEmail(args: {
  input: AdminNotifyInput
  session: BusinessSession
  venue: BusinessVenueSummary | null
  submittedAt: string
}): { subject: string; html: string } {
  const { input, session, venue, submittedAt } = args
  const label = input.type === "deal" ? "Deal" : "Event"
  const businessName = session.businessName || `Business #${session.businessId}`
  const creator = `${session.fullName ? `${escapeHtml(session.fullName)} ` : ""}<a href="mailto:${escapeHtml(session.email)}">${escapeHtml(session.email)}</a>`

  const detailRows = input.details
    .map(([k, v]) => row(k, escapeHtml(v).replace(/\n/g, "<br/>")))
    .join("")

  const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New ${label} Created</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              ${row(label, escapeHtml(input.title), { bold: true, width: 140 })}
              ${row("Business", `${escapeHtml(businessName)} <span style="color: #6b7280;">(#${session.businessId})</span>`)}
              ${venue ? row("Venue", `${escapeHtml(venue.name)}${venue.address ? ` <span style="color: #6b7280;">${escapeHtml(venue.address)}</span>` : ""}`) : ""}
              ${row("Created by", creator)}
              ${input.id ? row("ID", escapeHtml(input.id)) : ""}
              ${row("Submitted", escapeHtml(submittedAt))}
            </table>
            ${
              detailRows
                ? `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <h2 style="color: #111; margin: 0 0 8px; font-size: 14px;">Form details (as submitted by the business)</h2>
            <table style="width: 100%; border-collapse: collapse;">${detailRows}</table>`
                : ""
            }
          </div>
        </div>
      `
  return { subject: `New ${label}: ${input.title} - ${businessName}`, html }
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status })
}

export async function handleAdminNotify(request: Request, deps: AdminNotifyDeps): Promise<Response> {
  const ip = getClientIp(request) ?? "unknown"
  if (!deps.ipLimit(`admin-notify:ip:${ip}`).ok) {
    return json(429, { error: "Too many requests" })
  }

  const cookieHeader = request.headers.get("cookie") ?? ""
  const session = await deps.resolveSession(cookieHeader)
  if (!session) return json(401, { error: "Unauthorized" })

  if (!deps.businessLimit(`admin-notify:biz:${session.businessId}`).ok) {
    return json(429, { error: "Too many notifications" })
  }

  const body = await request.json().catch(() => null)
  const input = parseAdminNotifyBody(body)
  if (!input) return json(400, { error: "Missing required fields" })

  const venue = input.venueId ? await deps.lookupVenue(cookieHeader, input.venueId) : null
  const submittedAt = (deps.now?.() ?? new Date()).toLocaleString()
  const mail = buildAdminNotifyEmail({ input, session, venue, submittedAt })

  try {
    const { error } = await deps.sendEmail(mail)
    if (error) {
      console.error("Admin notify Resend error:", error)
      return json(500, { error: "Failed to send notification" })
    }
  } catch (error) {
    console.error("Admin notify error:", error)
    return json(500, { error: "Failed to send notification" })
  }
  return json(201, { status: "sent" })
}
