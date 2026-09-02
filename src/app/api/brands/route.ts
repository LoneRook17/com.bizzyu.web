import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { Resend } from "resend";
import { verifyTurnstile, getClientIp } from "@/lib/verifyTurnstile";
import { createRateLimiter } from "@/lib/ratelimit";
import { PARTNERSHIPS_EMAIL } from "@/lib/constants";
import {
  AFFILIATE_OPTIONS,
  NETWORK_OPTIONS,
  QUALIFIES_OPTIONS,
  VERIFICATION_OPTIONS,
  labelFor,
  validateBrandApplication,
  type BrandApplication,
} from "@/lib/brands/validate";
import { appendBrandApplication, isSheetConfigured } from "@/lib/brands/sheet";

export const runtime = "nodejs";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

/**
 * Brand partner application (/brands).
 *
 * Order of checks: rate limit, honeypot + Turnstile, validation. Then the two
 * sinks run together: an email to the partnerships inbox (always) and a row in
 * the Google Sheet (when configured). Either one succeeding is a success for
 * the applicant; a sink that fails is logged, never surfaced. Both failing is
 * the only 500, because then nobody would ever see the application.
 *
 * Env: RESEND_API_KEY (required), BRANDS_NOTIFY_TO (optional, comma-separated,
 * defaults to the partnerships inbox), GOOGLE_SHEETS_* (optional, see
 * lib/brands/sheet.ts), IP_HASH_SALT (optional; without it the hash is still
 * one-way but rainbow-tableable, which is fine for dedupe and nothing else).
 */

// A brand fills this in once. Five in ten minutes from one IP is a script.
const rateLimit = createRateLimiter({
  burstWindowMs: 10 * 60 * 1000,
  burstMax: 5,
  dailyMax: 15,
});

function hashIp(ip: string | null): string {
  if (!ip) return "";
  const salt = process.env.IP_HASH_SALT ?? "bizzy-brands";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function notifyTo(): string[] {
  const raw = process.env.BRANDS_NOTIFY_TO?.trim();
  const list = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return list.length > 0 ? list : [PARTNERSHIPS_EMAIL];
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`brands:${ip ?? "unknown"}`);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const check = await verifyTurnstile(body.turnstileToken, body.website_url, ip);
    if (!check.ok) {
      // A honeypot hit gets the same shape as a Turnstile failure. Bots learn
      // nothing; a human never sees this path because the field is hidden.
      return NextResponse.json({ error: "Verification failed" }, { status: 422 });
    }

    const parsed = validateBrandApplication(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields.", fields: parsed.errors },
        { status: 400 },
      );
    }

    const meta = { createdAt: new Date(), status: "new" as const, ipHash: hashIp(ip) };

    const [emailResult, sheetResult] = await Promise.allSettled([
      sendNotification(parsed.data, meta.createdAt),
      appendBrandApplication(parsed.data, meta),
    ]);

    const emailOk = emailResult.status === "fulfilled";
    const sheetOk = sheetResult.status === "fulfilled" && sheetResult.value === "appended";

    if (!emailOk) {
      console.error("[brands] notification email failed", emailResult.reason);
    }
    if (sheetResult.status === "rejected") {
      console.error("[brands] sheet append failed", sheetResult.reason);
    } else if (sheetResult.value === "skipped" && !isSheetConfigured()) {
      // Expected until GOOGLE_SHEETS_* is provisioned. Logged at info so the
      // absence is visible in Vercel logs without looking like an incident.
      console.info("[brands] sheet not configured, email only");
    }

    if (!emailOk && !sheetOk) {
      return NextResponse.json(
        { error: "We couldn't save your application. Please email us directly." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { status: "received", stored: { email: emailOk, sheet: sheetOk } },
      { status: 201 },
    );
  } catch (error) {
    console.error("[brands] application error", error);
    return NextResponse.json(
      { error: "We couldn't save your application. Please email us directly." },
      { status: 500 },
    );
  }
}

async function sendNotification(app: BrandApplication, createdAt: Date): Promise<void> {
  const { error } = await getResend().emails.send({
    from: "Bizzy <support@no-reply.bizzyu.com>",
    to: notifyTo(),
    subject: `Brand application: ${app.companyName} (${app.offerName})`,
    replyTo: app.workEmail,
    html: notificationHtml(app, createdAt),
  });
  if (error) throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
}

function notificationHtml(app: BrandApplication, createdAt: Date): string {
  const a = app.attribution;
  const row = (label: string, value: string, opts: { link?: boolean; pre?: boolean } = {}) => {
    if (!value) return "";
    const safe = escapeHtml(value);
    const cell = opts.link
      ? `<a href="${safe}">${safe}</a>`
      : opts.pre
        ? `<span style="white-space: pre-wrap;">${safe}</span>`
        : safe;
    return `<tr><td style="padding: 6px 12px 6px 0; color: #6b7280; vertical-align: top; width: 160px;">${escapeHtml(label)}</td><td style="padding: 6px 0; color: #111;">${cell}</td></tr>`;
  };
  const heading = (text: string) =>
    `<h2 style="color: #111; margin: 20px 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(text)}</h2>`;

  const source = [a.utmSource, a.utmMedium, a.utmCampaign].filter(Boolean).join(" / ");

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Brand application: ${escapeHtml(app.companyName)}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 14px;">${escapeHtml(app.offerName)}${app.partnerTierInterest ? " &middot; Interested in Partner tier" : ""}</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        ${heading("Company")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("Company", app.companyName)}
          ${row("Website", app.website, { link: true })}
          ${row("Contact", `${app.contactName}, ${app.title}`)}
          ${row("Work email", app.workEmail)}
        </table>

        ${heading("Offer")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("Offer name", app.offerName)}
          ${row("What students get", app.offerDescription, { pre: true })}
          ${row("Who qualifies", labelFor(QUALIFIES_OPTIONS, app.qualifies))}
          ${row("Qualifies detail", app.qualifiesDetail, { pre: true })}
          ${row("Verification today", labelFor(VERIFICATION_OPTIONS, app.verification))}
          ${row("Landing URL", app.landingUrl, { link: true })}
          ${row("Promo code", app.promoCode)}
        </table>

        ${heading("Program")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("Affiliate program", labelFor(AFFILIATE_OPTIONS, app.hasAffiliateProgram))}
          ${row("Affiliate network", labelFor(NETWORK_OPTIONS, app.affiliateNetwork))}
          ${row("Partner tier interest", app.partnerTierInterest ? "Yes" : "No")}
          ${row("Anything else", app.notes, { pre: true })}
        </table>

        ${heading("Source")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("UTM", source)}
          ${row("utm_content", a.utmContent)}
          ${row("utm_term", a.utmTerm)}
          ${row("Referrer", a.referrer)}
          ${row("Page", a.pageUrl)}
        </table>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 13px; margin: 0;">
          Submitted ${escapeHtml(createdAt.toISOString())}. Reply to this email to reach the applicant.
        </p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
