"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TurnstileWidget from "@/components/ui/TurnstileWidget";
import { APP_STORE_URL } from "@/lib/constants";
import { track } from "@/lib/analytics";
import { BRANDS_API_PATH, BRANDS_CONTACT_EMAIL } from "@/lib/brands/copy";
import {
  AFFILIATE_OPTIONS,
  LIMITS,
  NETWORK_OPTIONS,
  QUALIFIES_OPTIONS,
  VERIFICATION_OPTIONS,
  validateBrandApplication,
  type Attribution,
  type FieldErrors,
  type FieldKey,
} from "@/lib/brands/validate";

const TURNSTILE_ENABLED = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
const ATTRIBUTION_KEY = "bizzy_brands_attribution";

const inputClass =
  "w-full px-4 py-3 rounded-xl border bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

type Values = {
  companyName: string;
  website: string;
  contactName: string;
  workEmail: string;
  title: string;
  offerName: string;
  offerDescription: string;
  qualifies: string;
  qualifiesDetail: string;
  verification: string;
  landingUrl: string;
  promoCode: string;
  hasAffiliateProgram: string;
  affiliateNetwork: string;
  partnerTierInterest: boolean;
  notes: string;
};

const EMPTY: Values = {
  companyName: "",
  website: "",
  contactName: "",
  workEmail: "",
  title: "",
  offerName: "",
  offerDescription: "",
  qualifies: "",
  qualifiesDetail: "",
  verification: "",
  landingUrl: "",
  promoCode: "",
  hasAffiliateProgram: "",
  affiliateNetwork: "",
  partnerTierInterest: false,
  notes: "",
};

/**
 * utm_* and the referrer, read once when the page loads and kept for the
 * session. A brand that lands from an outreach email, reads /about, and comes
 * back to apply still carries the campaign that brought them.
 */
function readAttribution(): Attribution {
  const empty: Attribution = {
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
    referrer: "",
    pageUrl: "",
  };
  if (typeof window === "undefined") return empty;

  const params = new URLSearchParams(window.location.search);
  const fromUrl: Attribution = {
    utmSource: params.get("utm_source") ?? "",
    utmMedium: params.get("utm_medium") ?? "",
    utmCampaign: params.get("utm_campaign") ?? "",
    utmContent: params.get("utm_content") ?? "",
    utmTerm: params.get("utm_term") ?? "",
    referrer: document.referrer,
    pageUrl: window.location.href,
  };
  const hasUtm = Boolean(fromUrl.utmSource || fromUrl.utmMedium || fromUrl.utmCampaign);

  try {
    if (hasUtm) {
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return { ...empty, ...(JSON.parse(stored) as Partial<Attribution>) };
  } catch {
    // Storage blocked: the current URL is still the best we have.
  }
  return fromUrl;
}

function Required() {
  return (
    <span className="text-primary-dark" aria-hidden>
      {" "}*
    </span>
  );
}

function Optional() {
  return <span className="font-normal text-muted"> (optional)</span>;
}

export default function BrandApplicationForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const attribution = useRef<Attribution | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    attribution.current = readAttribution();
  }, []);

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key as FieldKey];
        return next;
      });
    }
  }

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = Object.keys(fieldErrors)[0];
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const payload = { ...values, attribution: attribution.current ?? readAttribution() };
    const local = validateBrandApplication(payload);
    if (!local.ok) {
      setErrors(local.errors);
      setFormError("Please fix the highlighted fields.");
      focusFirstError(local.errors);
      return;
    }
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setFormError("Please complete the verification check below.");
      return;
    }

    setSubmitting(true);
    const honeypot = (formRef.current?.elements.namedItem("website_url") as HTMLInputElement | null)?.value ?? "";

    try {
      const res = await fetch(BRANDS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, turnstileToken, website_url: honeypot }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: FieldErrors };
        if (body.fields && Object.keys(body.fields).length > 0) {
          setErrors(body.fields);
          focusFirstError(body.fields);
        }
        throw new Error(body.error || "Something went wrong.");
      }

      track("brand_application_submitted", {
        partner_tier_interest: values.partnerTierInterest,
        has_affiliate_program: values.hasAffiliateProgram,
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : `Something went wrong. Please try again or email ${BRANDS_CONTACT_EMAIL}.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="bg-primary-light rounded-2xl p-8 md:p-10 text-center focus:outline-none"
      >
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#030303" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-ink mb-3">Thanks. We&apos;ve got your application.</h3>
        <p className="text-muted text-lg leading-relaxed max-w-md mx-auto">
          We review every offer by hand and will be in touch within a few business days.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-7 py-3 rounded-full font-semibold text-base bg-ink text-white hover:bg-ink/90 transition-all"
          >
            Back to homepage
          </Link>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-7 py-3 rounded-full font-semibold text-base text-ink border-2 border-ink/15 hover:border-ink/40 hover:bg-white/60 transition-all"
          >
            See Bizzy on the App Store
          </a>
        </div>
      </div>
    );
  }

  const field = (key: FieldKey) => ({
    id: key,
    name: key,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
    className: `${inputClass} ${errors[key] ? "border-red-400" : "border-gray-200"}`,
  });

  const errorFor = (key: FieldKey) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
        {errors[key]}
      </p>
    ) : null;

  const label = (key: FieldKey, text: string, required = true) => (
    <label htmlFor={key} className="block text-sm font-medium text-ink mb-1.5">
      {text}
      {required ? <Required /> : <Optional />}
    </label>
  );

  const showQualifiesDetail = values.qualifies === "specific_schools" || values.qualifies === "other";
  const showNetwork = values.hasAffiliateProgram === "yes";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="bg-white rounded-2xl p-5 sm:p-6 md:p-10 shadow-sm border border-gray-100"
    >
      <p className="text-sm text-muted mb-8">
        Fields marked <span className="text-primary-dark font-semibold">*</span> are required.
      </p>

      <fieldset className="space-y-5">
        <legend className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark mb-4">
          Your company
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            {label("companyName", "Company name")}
            <input
              type="text"
              autoComplete="organization"
              maxLength={LIMITS.companyName}
              value={values.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="DoorDash"
              {...field("companyName")}
            />
            {errorFor("companyName")}
          </div>
          <div>
            {label("website", "Website")}
            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              maxLength={LIMITS.website}
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="doordash.com"
              {...field("website")}
            />
            {errorFor("website")}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            {label("contactName", "Your name")}
            <input
              type="text"
              autoComplete="name"
              maxLength={LIMITS.contactName}
              value={values.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Sam Rivera"
              {...field("contactName")}
            />
            {errorFor("contactName")}
          </div>
          <div>
            {label("workEmail", "Work email")}
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={LIMITS.workEmail}
              value={values.workEmail}
              onChange={(e) => set("workEmail", e.target.value)}
              placeholder="you@brand.com"
              {...field("workEmail")}
            />
            {errorFor("workEmail")}
          </div>
        </div>

        <div>
          {label("title", "Your title")}
          <input
            type="text"
            autoComplete="organization-title"
            maxLength={LIMITS.title}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Partnerships Manager"
            {...field("title")}
          />
          {errorFor("title")}
        </div>
      </fieldset>

      <fieldset className="space-y-5 mt-10">
        <legend className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark mb-4">
          Your student offer
        </legend>

        <div>
          {label("offerName", "Offer name")}
          <input
            type="text"
            maxLength={LIMITS.offerName}
            value={values.offerName}
            onChange={(e) => set("offerName", e.target.value)}
            placeholder="DashPass for Students"
            {...field("offerName")}
          />
          <p className="mt-1.5 text-xs text-muted">Short. This is what students see first.</p>
          {errorFor("offerName")}
        </div>

        <div>
          {label("offerDescription", "Offer description")}
          <textarea
            rows={4}
            maxLength={LIMITS.offerDescription}
            value={values.offerDescription}
            onChange={(e) => set("offerDescription", e.target.value)}
            placeholder="What students get. Price, discount, how long it lasts, any conditions."
            {...field("offerDescription")}
            className={`${field("offerDescription").className} resize-y`}
          />
          {errorFor("offerDescription")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            {label("qualifies", "Who qualifies")}
            <select
              value={values.qualifies}
              onChange={(e) => set("qualifies", e.target.value)}
              {...field("qualifies")}
            >
              <option value="">Select one</option>
              {QUALIFIES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errorFor("qualifies")}
          </div>
          <div>
            {label("verification", "How students are verified today")}
            <select
              value={values.verification}
              onChange={(e) => set("verification", e.target.value)}
              {...field("verification")}
            >
              <option value="">Select one</option>
              {VERIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errorFor("verification")}
          </div>
        </div>

        {showQualifiesDetail && (
          <div>
            {label(
              "qualifiesDetail",
              values.qualifies === "specific_schools" ? "Which schools?" : "Tell us who qualifies",
            )}
            <textarea
              rows={2}
              maxLength={LIMITS.qualifiesDetail}
              value={values.qualifiesDetail}
              onChange={(e) => set("qualifiesDetail", e.target.value)}
              placeholder={
                values.qualifies === "specific_schools"
                  ? "University of Florida, Arizona State, ..."
                  : "Graduate students only, students in specific states, ..."
              }
              {...field("qualifiesDetail")}
              className={`${field("qualifiesDetail").className} resize-y`}
            />
            {errorFor("qualifiesDetail")}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            {label("landingUrl", "Landing URL")}
            <input
              type="text"
              inputMode="url"
              maxLength={LIMITS.landingUrl}
              value={values.landingUrl}
              onChange={(e) => set("landingUrl", e.target.value)}
              placeholder="brand.com/students"
              {...field("landingUrl")}
            />
            <p className="mt-1.5 text-xs text-muted">Where students go to claim the offer.</p>
            {errorFor("landingUrl")}
          </div>
          <div>
            {label("promoCode", "Promo code", false)}
            <input
              type="text"
              autoComplete="off"
              maxLength={LIMITS.promoCode}
              value={values.promoCode}
              onChange={(e) => set("promoCode", e.target.value)}
              placeholder="STUDENT20"
              {...field("promoCode")}
            />
            {errorFor("promoCode")}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 mt-10">
        <legend className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark mb-4">
          Working together
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            {label("hasAffiliateProgram", "Do you have an existing affiliate program?")}
            <select
              value={values.hasAffiliateProgram}
              onChange={(e) => {
                set("hasAffiliateProgram", e.target.value);
                if (e.target.value !== "yes") set("affiliateNetwork", "");
              }}
              {...field("hasAffiliateProgram")}
            >
              <option value="">Select one</option>
              {AFFILIATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errorFor("hasAffiliateProgram")}
          </div>
          {showNetwork && (
            <div>
              {label("affiliateNetwork", "Which network?")}
              <select
                value={values.affiliateNetwork}
                onChange={(e) => set("affiliateNetwork", e.target.value)}
                {...field("affiliateNetwork")}
              >
                <option value="">Select one</option>
                {NETWORK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errorFor("affiliateNetwork")}
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary/40 transition-colors">
          <input
            type="checkbox"
            name="partnerTierInterest"
            checked={values.partnerTierInterest}
            onChange={(e) => set("partnerTierInterest", e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#05EB54]"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Interested in the Partner tier?</span>
            <span className="block text-xs text-muted mt-0.5">
              Tracked referrals, featured placement, and campus-level reporting. We&apos;ll follow up with terms.
            </span>
          </span>
        </label>

        <div>
          {label("notes", "Anything else?", false)}
          <textarea
            rows={3}
            maxLength={LIMITS.notes}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Timing, campuses you care about most, or questions for us."
            {...field("notes")}
            className={`${field("notes").className} resize-y`}
          />
          {errorFor("notes")}
        </div>
      </fieldset>

      {/* Honeypot: humans never see this, bots fill every field. */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="mt-8 space-y-4">
        <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />

        {formError && (
          <p className="text-red-600 text-sm text-center" role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-primary text-ink text-base font-semibold rounded-full hover:brightness-105 transition-all shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {submitting ? "Submitting..." : "Submit application"}
        </button>

        <p className="text-center text-muted text-xs leading-relaxed">
          By submitting you agree to our{" "}
          <Link href="/privacy" className="text-primary-dark font-medium hover:underline">
            Privacy Policy
          </Link>
          . Questions first? Email{" "}
          <a href={`mailto:${BRANDS_CONTACT_EMAIL}`} className="text-primary-dark font-medium hover:underline">
            {BRANDS_CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </form>
  );
}
