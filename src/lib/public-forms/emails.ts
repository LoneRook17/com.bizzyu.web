/**
 * Notification-email builders for the public forms (audit F30). Pure: they
 * take the validated form data and return the subject / reply-to / html that
 * the route hands to Resend, with EVERY visitor-supplied field passed through
 * escapeHtml. Tests assert on this object — it is exactly the payload the
 * route sends.
 */
import { escapeHtml } from "../html-escape.ts"
import { formatAvailability } from "../types.ts"
import type { ContactData, EventsContactData, SubmissionData } from "./validate.ts"

export interface EmailContent {
  subject: string
  replyTo: string
  html: string
}

const HEADER = (heading: string) =>
  `<div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">${escapeHtml(heading)}</h1>
          </div>`

const HR = `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />`

function row(label: string, value: string, opts: { bold?: boolean; width?: number; raw?: boolean } = {}): string {
  const cell = opts.raw ? value : escapeHtml(value)
  const w = opts.width ? ` width: ${opts.width}px;` : ""
  const b = opts.bold ? " font-weight: 600;" : ""
  return `<tr><td style="padding: 6px 0; color: #6b7280;${w}">${escapeHtml(label)}</td><td style="padding: 6px 0;${b}">${cell}</td></tr>`
}

function mailto(email: string): string {
  const e = escapeHtml(email)
  return `<a href="mailto:${e}">${e}</a>`
}

function wrap(heading: string, inner: string): string {
  return `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          ${HEADER(heading)}
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            ${inner}
          </div>
        </div>
      `
}

export function buildContactEmail(data: ContactData, submittedAt = new Date().toLocaleString()): EmailContent {
  const inner = `<table style="width: 100%; border-collapse: collapse;">
              ${row("Name", data.name, { bold: true, width: 120 })}
              ${row("Email", mailto(data.email), { raw: true })}
              ${row("Type", data.type)}
            </table>

            ${HR}

            <h2 style="color: #111; margin: 0 0 12px; font-size: 16px;">Message</h2>
            <p style="color: #374151; white-space: pre-wrap; margin: 0;">${escapeHtml(data.message)}</p>

            ${HR}
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              Submitted: ${escapeHtml(submittedAt)}
            </p>`
  return {
    subject: `New Contact Form: ${data.name} (${data.type})`,
    replyTo: data.email,
    html: wrap("New Contact Message", inner),
  }
}

export function buildEventsContactEmail(data: EventsContactData, submittedAt = new Date().toLocaleString()): EmailContent {
  const inner = `<h2 style="color: #111; margin: 0 0 16px;">Venue Info</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${row("Venue Name", data.venueName, { bold: true, width: 140 })}
              ${row("Contact Name", data.contactName)}
              ${row("Email", mailto(data.email), { raw: true })}
              ${row("Phone", data.phone || "—")}
              ${row("Venue Type", data.venueType)}
            </table>

            ${HR}

            <h2 style="color: #111; margin: 0 0 16px;">Event Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${row("Event Types", data.eventTypes, { width: 140 })}
              ${row("Frequency", data.frequency)}
            </table>

            ${
              data.details
                ? `${HR}
            <h2 style="color: #111; margin: 0 0 12px; font-size: 16px;">Additional Details</h2>
            <p style="color: #374151; white-space: pre-wrap; margin: 0;">${escapeHtml(data.details)}</p>`
                : ""
            }

            ${HR}
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              Submitted: ${escapeHtml(submittedAt)}
            </p>`
  return {
    subject: `New Events Inquiry: ${data.venueName}`,
    replyTo: data.email,
    html: wrap("New Events Inquiry", inner),
  }
}

export interface SubmissionEmailArgs {
  data: SubmissionData
  forwardFailed: boolean
  hasAttachment: boolean
  submissionId: string
  submittedAt?: string
}

/**
 * Body only: the subject stays in the route (submissionEmailSubject), where
 * the forward-failure guard test looks for it.
 */
export function buildSubmissionEmail(args: SubmissionEmailArgs): { html: string } {
  const { data, forwardFailed, hasAttachment, submissionId } = args
  const submittedAt = args.submittedAt ?? new Date().toLocaleString()
  const { business, deal } = data

  const heading = forwardFailed ? "Deal submission was NOT saved" : "New Deal Submission"
  const banner = forwardFailed
    ? `<p style="margin: 0 0 16px; padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 14px;">This deal was not saved to the admin API. The business saw an error on the form. The forward status and body are in the server log.</p>`
    : ""

  const redemption = `${deal.redemptionFrequency || "—"}${deal.limitedSupplyCount ? ` (${deal.limitedSupplyCount} available)` : ""}`

  const inner = `${banner}
            <h2 style="color: #111; margin: 0 0 16px;">Business Info</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${row("Business Name", business.businessName, { bold: true, width: 140 })}
              ${row("Contact Name", business.contactName || "—")}
              ${row("Email", mailto(business.email), { raw: true })}
              ${row("Phone", business.phone || "—")}
              ${row("Address", business.address || "—")}
              ${row("Campus", business.campus || "—")}
            </table>

            ${HR}

            <h2 style="color: #111; margin: 0 0 16px;">Deal Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${row("Deal Title", deal.title, { bold: true, width: 140 })}
              ${row("Description", deal.description || "—")}
              <tr><td style="padding: 6px 0; color: #6b7280;">Estimated Savings</td><td style="padding: 6px 0; color: #05EB54; font-weight: 700;">${escapeHtml(deal.estimatedSavings || "—")}</td></tr>
              ${row("Redemption", redemption)}
              ${row("Available", formatAvailability(deal.availability) || "All day", { bold: true })}
              ${row("Start Date", deal.startDate || "Immediately")}
              ${row("End Date", deal.endDate || "Ongoing")}
            </table>

            ${
              hasAttachment
                ? `${HR}
            <p style="color: #6b7280; font-size: 13px; font-style: italic;">Deal image attached.</p>`
                : ""
            }

            ${HR}
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              Submission ID: ${escapeHtml(submissionId)}<br/>
              Submitted: ${escapeHtml(submittedAt)}
            </p>`

  return { html: wrap(heading, inner) }
}
