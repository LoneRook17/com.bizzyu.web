/**
 * Brand partner application: field options, limits, and validation.
 *
 * Pure and dependency-free on purpose. The form imports it for inline errors
 * before posting, the API route imports it as the source of truth, and the
 * node test runner loads it without a bundler (see validate.test.ts). Keep
 * every option list here so the two sides can never disagree about a value.
 */

export const QUALIFIES_OPTIONS = [
  { value: "all", label: "All verified students" },
  { value: "specific_schools", label: "Students at specific schools" },
  { value: "other", label: "Other" },
] as const;

export const VERIFICATION_OPTIONS = [
  { value: "sheerid", label: "SheerID" },
  { value: "unidays", label: "UNiDAYS" },
  { value: "student_beans", label: "Student Beans" },
  { value: "edu_email", label: ".edu email" },
  { value: "other", label: "Other" },
  { value: "none", label: "Not verified today" },
] as const;

export const AFFILIATE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
] as const;

export const NETWORK_OPTIONS = [
  { value: "impact", label: "Impact" },
  { value: "cj", label: "CJ" },
  { value: "rakuten", label: "Rakuten" },
  { value: "awin", label: "Awin" },
  { value: "amazon_associates", label: "Amazon Associates" },
  { value: "in_house", label: "In-house" },
  { value: "other", label: "Other" },
] as const;

export type Qualifies = (typeof QUALIFIES_OPTIONS)[number]["value"];
export type Verification = (typeof VERIFICATION_OPTIONS)[number]["value"];
export type Affiliate = (typeof AFFILIATE_OPTIONS)[number]["value"];
export type Network = (typeof NETWORK_OPTIONS)[number]["value"];

export const LIMITS = {
  companyName: 120,
  website: 2048,
  contactName: 100,
  workEmail: 254,
  title: 100,
  offerName: 80,
  offerDescription: 2000,
  qualifiesDetail: 300,
  landingUrl: 2048,
  promoCode: 60,
  notes: 2000,
  attribution: 200,
  referrer: 2048,
} as const;

/** What the browser posts. Every key optional so a partial body validates cleanly. */
export interface BrandApplicationInput {
  companyName?: unknown;
  website?: unknown;
  contactName?: unknown;
  workEmail?: unknown;
  title?: unknown;
  offerName?: unknown;
  offerDescription?: unknown;
  qualifies?: unknown;
  qualifiesDetail?: unknown;
  verification?: unknown;
  landingUrl?: unknown;
  promoCode?: unknown;
  hasAffiliateProgram?: unknown;
  affiliateNetwork?: unknown;
  partnerTierInterest?: unknown;
  notes?: unknown;
  attribution?: unknown;
}

export interface Attribution {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  referrer: string;
  pageUrl: string;
}

export interface BrandApplication {
  companyName: string;
  website: string;
  contactName: string;
  workEmail: string;
  title: string;
  offerName: string;
  offerDescription: string;
  qualifies: Qualifies;
  qualifiesDetail: string;
  verification: Verification;
  landingUrl: string;
  promoCode: string;
  hasAffiliateProgram: Affiliate;
  affiliateNetwork: Network | "";
  partnerTierInterest: boolean;
  notes: string;
  attribution: Attribution;
}

export type FieldKey = Exclude<keyof BrandApplicationInput, "attribution">;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export type ValidationResult =
  | { ok: true; data: BrandApplication }
  | { ok: false; errors: FieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** Multi-line text keeps its newlines; only surrounding whitespace goes. */
function text(v: unknown): string {
  return typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "";
}

export function isValidEmail(v: string): boolean {
  return v.length <= LIMITS.workEmail && EMAIL_RE.test(v);
}

/**
 * Accepts "doordash.com", "www.doordash.com/students" or a full URL and returns
 * a canonical http(s) href, or null if it is not a usable web address.
 */
export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v || /\s/.test(v)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // A hostname needs a dot and a plausible TLD; "localhost" and bare words are
  // typos, not brand sites.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
  return url.href;
}

function oneOf<T extends string>(
  v: unknown,
  options: ReadonlyArray<{ value: T }>,
): T | null {
  const s = str(v);
  return options.some((o) => o.value === s) ? (s as T) : null;
}

function attribution(v: unknown): Attribution {
  const a = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const short = (k: string) => str(a[k]).slice(0, LIMITS.attribution);
  const long = (k: string) => str(a[k]).slice(0, LIMITS.referrer);
  return {
    utmSource: short("utmSource"),
    utmMedium: short("utmMedium"),
    utmCampaign: short("utmCampaign"),
    utmContent: short("utmContent"),
    utmTerm: short("utmTerm"),
    referrer: long("referrer"),
    pageUrl: long("pageUrl"),
  };
}

export function validateBrandApplication(raw: unknown): ValidationResult {
  const input = (raw && typeof raw === "object" ? raw : {}) as BrandApplicationInput;
  const errors: FieldErrors = {};

  const required = (key: FieldKey, value: string, label: string, max: number): string => {
    if (!value) errors[key] = `${label} is required.`;
    else if (value.length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
    return value;
  };

  const optional = (key: FieldKey, value: string, label: string, max: number): string => {
    if (value.length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
    return value;
  };

  const companyName = required("companyName", str(input.companyName), "Company name", LIMITS.companyName);

  const websiteRaw = str(input.website);
  let website = "";
  if (!websiteRaw) errors.website = "Website is required.";
  else if (websiteRaw.length > LIMITS.website) errors.website = "Website is too long.";
  else {
    const n = normalizeUrl(websiteRaw);
    if (!n) errors.website = "Enter a valid website, like brand.com.";
    else website = n;
  }

  const contactName = required("contactName", str(input.contactName), "Your name", LIMITS.contactName);

  const workEmail = str(input.workEmail).toLowerCase();
  if (!workEmail) errors.workEmail = "Work email is required.";
  else if (!isValidEmail(workEmail)) errors.workEmail = "Enter a valid email address.";

  const title = required("title", str(input.title), "Your title", LIMITS.title);
  const offerName = required("offerName", str(input.offerName), "Offer name", LIMITS.offerName);
  const offerDescription = required(
    "offerDescription",
    text(input.offerDescription),
    "Offer description",
    LIMITS.offerDescription,
  );

  const qualifies = oneOf(input.qualifies, QUALIFIES_OPTIONS);
  if (!qualifies) errors.qualifies = "Tell us who qualifies.";

  const qualifiesDetail = text(input.qualifiesDetail);
  if (qualifies && qualifies !== "all" && !qualifiesDetail) {
    errors.qualifiesDetail =
      qualifies === "specific_schools" ? "List the schools." : "Tell us who qualifies.";
  } else {
    optional("qualifiesDetail", qualifiesDetail, "Who qualifies", LIMITS.qualifiesDetail);
  }

  const verification = oneOf(input.verification, VERIFICATION_OPTIONS);
  if (!verification) errors.verification = "Tell us how students are verified today.";

  const landingRaw = str(input.landingUrl);
  let landingUrl = "";
  if (!landingRaw) errors.landingUrl = "Landing URL is required.";
  else if (landingRaw.length > LIMITS.landingUrl) errors.landingUrl = "Landing URL is too long.";
  else {
    const n = normalizeUrl(landingRaw);
    if (!n) errors.landingUrl = "Enter the full link students use to claim the offer.";
    else landingUrl = n;
  }

  const promoCode = optional("promoCode", str(input.promoCode), "Promo code", LIMITS.promoCode);

  const hasAffiliateProgram = oneOf(input.hasAffiliateProgram, AFFILIATE_OPTIONS);
  if (!hasAffiliateProgram) errors.hasAffiliateProgram = "Let us know about your affiliate program.";

  let affiliateNetwork: Network | "" = "";
  if (hasAffiliateProgram === "yes") {
    const n = oneOf(input.affiliateNetwork, NETWORK_OPTIONS);
    if (!n) errors.affiliateNetwork = "Which network runs it?";
    else affiliateNetwork = n;
  }

  const partnerTierInterest =
    input.partnerTierInterest === true ||
    input.partnerTierInterest === "true" ||
    input.partnerTierInterest === "on" ||
    input.partnerTierInterest === 1;

  const notes = optional("notes", text(input.notes), "Anything else", LIMITS.notes);

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      companyName,
      website,
      contactName,
      workEmail,
      title,
      offerName,
      offerDescription,
      qualifies: qualifies as Qualifies,
      qualifiesDetail,
      verification: verification as Verification,
      landingUrl,
      promoCode,
      hasAffiliateProgram: hasAffiliateProgram as Affiliate,
      affiliateNetwork,
      partnerTierInterest,
      notes,
      attribution: attribution(input.attribution),
    },
  };
}

export function labelFor<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T | "",
): string {
  return options.find((o) => o.value === value)?.label ?? "";
}
