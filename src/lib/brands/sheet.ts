import { createSign } from "node:crypto";
import type { BrandApplication } from "./validate";
import {
  AFFILIATE_OPTIONS,
  NETWORK_OPTIONS,
  QUALIFIES_OPTIONS,
  VERIFICATION_OPTIONS,
  labelFor,
} from "./validate";

/**
 * Append one brand application to a Google Sheet, using a service account.
 *
 * No googleapis dependency: the sheet needs two HTTPS calls (a signed JWT for
 * an access token, then values.append), and Node's crypto signs RS256 on its
 * own. The service account only ever needs Editor access on the one sheet.
 *
 * Configuration (all server-side, never NEXT_PUBLIC_):
 *   GOOGLE_SHEETS_ID               the id in the sheet's URL
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   xxx@yyy.iam.gserviceaccount.com
 *   GOOGLE_SERVICE_ACCOUNT_KEY     the private_key from the JSON key file
 *                                  (literal "\n" sequences are fine)
 *   GOOGLE_SHEETS_TAB              optional, defaults to "Applications"
 *
 * Unset means "not configured": the caller records a skip and relies on the
 * email notification. A configured sheet that fails throws, so the route can
 * log it and still return success when the email went through.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TIMEOUT_MS = 8000;

/** Column order of the sheet. The header row is written once if the tab is empty. */
export const SHEET_COLUMNS = [
  "Submitted at (UTC)",
  "Status",
  "Company",
  "Website",
  "Contact name",
  "Work email",
  "Title",
  "Offer name",
  "Offer description",
  "Who qualifies",
  "Qualifies detail",
  "Verification today",
  "Landing URL",
  "Promo code",
  "Affiliate program",
  "Affiliate network",
  "Partner tier interest",
  "Notes",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "Referrer",
  "Page URL",
  "IP hash",
] as const;

export interface SheetRowMeta {
  createdAt: Date;
  status: "new";
  ipHash: string;
}

interface SheetConfig {
  sheetId: string;
  email: string;
  key: string;
  tab: string;
}

function config(): SheetConfig | null {
  const sheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n").trim();
  if (!sheetId || !email || !key) return null;
  return { sheetId, email, key, tab: process.env.GOOGLE_SHEETS_TAB?.trim() || "Applications" };
}

export function isSheetConfigured(): boolean {
  return config() !== null;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(c: SheetConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: c.email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(c.key).toString("base64url");
  const assertion = `${header}.${claims}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`sheets token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return cachedToken.value;
}

async function sheetsFetch(c: SheetConfig, path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken(c);
  const res = await fetch(`${SHEETS_URL}/${c.sheetId}/${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`sheets ${init.method ?? "GET"} ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res;
}

async function append(c: SheetConfig, rows: string[][]): Promise<void> {
  const range = encodeURIComponent(`${c.tab}!A1`);
  // RAW, not USER_ENTERED: a value beginning with "=" must land as text, never
  // be evaluated as a formula. Applicants type these fields.
  await sheetsFetch(c, `values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ majorDimension: "ROWS", values: rows }),
  });
}

async function ensureHeader(c: SheetConfig): Promise<void> {
  const range = encodeURIComponent(`${c.tab}!1:1`);
  const res = await sheetsFetch(c, `values/${range}`);
  const data = (await res.json()) as { values?: string[][] };
  if (!data.values || data.values.length === 0) {
    await append(c, [[...SHEET_COLUMNS]]);
  }
}

export function toSheetRow(app: BrandApplication, meta: SheetRowMeta): string[] {
  const a = app.attribution;
  return [
    meta.createdAt.toISOString(),
    meta.status,
    app.companyName,
    app.website,
    app.contactName,
    app.workEmail,
    app.title,
    app.offerName,
    app.offerDescription,
    labelFor(QUALIFIES_OPTIONS, app.qualifies),
    app.qualifiesDetail,
    labelFor(VERIFICATION_OPTIONS, app.verification),
    app.landingUrl,
    app.promoCode,
    labelFor(AFFILIATE_OPTIONS, app.hasAffiliateProgram),
    labelFor(NETWORK_OPTIONS, app.affiliateNetwork),
    app.partnerTierInterest ? "Yes" : "No",
    app.notes,
    a.utmSource,
    a.utmMedium,
    a.utmCampaign,
    a.utmContent,
    a.utmTerm,
    a.referrer,
    a.pageUrl,
    meta.ipHash,
  ];
}

/**
 * Returns "skipped" when the sheet is not configured; resolves when the row is
 * in; throws when a configured sheet could not be written.
 */
export async function appendBrandApplication(
  app: BrandApplication,
  meta: SheetRowMeta,
): Promise<"appended" | "skipped"> {
  const c = config();
  if (!c) return "skipped";
  await ensureHeader(c);
  await append(c, [toSheetRow(app, meta)]);
  return "appended";
}
