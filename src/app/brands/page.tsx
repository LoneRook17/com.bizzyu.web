import type { Metadata } from "next";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import FAQ from "@/components/ui/FAQ";
import JsonLd from "@/components/seo/JsonLd";
import BrandApplicationForm from "@/components/brands/BrandApplicationForm";
import StickyApplyCTA from "@/components/brands/StickyApplyCTA";
import NationalDealsShelf from "@/components/brands/NationalDealsShelf";
import BrandLogoStrip from "@/components/brands/BrandLogoStrip";
import { fetchNationalDeals } from "@/lib/brands/nationalDeals";
import { og } from "@/lib/og";
import {
  BRANDS_CONTACT_EMAIL,
  BRANDS_FAQ,
  BRANDS_FORM_ID,
  BRANDS_HOW_ID,
  BRAND_STATS,
  DOES_NOT_QUALIFY,
  HOW_IT_WORKS,
  QUALIFIES,
  STAT_PLACEHOLDER,
  TIERS,
  WHY_BIZZY,
} from "@/lib/brands/copy";

const PAGE_URL = "https://bizzyu.com/brands";
const DESCRIPTION =
  "List your student offer on Bizzy and reach verified college students at every US campus. Free to list. Partner tier with tracked referrals.";

export const metadata: Metadata = {
  // Absolute: the layout template appends "| Bizzy", and this title already
  // leads with the brand.
  title: { absolute: "Bizzy for Brands: Student Discount & Perk Partnerships" },
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  ...og({
    title: "Put your student offer in front of every campus",
    description:
      "Bizzy is the app students open to save money and go out. List a student-only offer free, or apply for tracked referral terms.",
  }),
};

/* JSON-LD. The Organization lives in the root layout with the @id referenced
   here, so this page points at it instead of restating it. Service describes
   the program itself; it names the free tier's price and nothing about the
   Partner tier's economics, matching the page. */
const ORG_ID = "https://bizzyu.com/#organization";

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#webpage`,
  url: PAGE_URL,
  name: "Bizzy for Brands",
  description: DESCRIPTION,
  isPartOf: { "@type": "WebSite", url: "https://bizzyu.com", name: "Bizzy" },
  about: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
  audience: { "@type": "BusinessAudience", audienceType: "Brand partnerships teams" },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${PAGE_URL}#service`,
  name: "Bizzy Brand Partner Program",
  serviceType: "Student discount and perk listings",
  description:
    "Brands list a student-specific offer in the Bizzy app's National Deals tab, reaching verified college students at every US campus.",
  provider: { "@id": ORG_ID },
  areaServed: { "@type": "Country", name: "United States" },
  audience: { "@type": "BusinessAudience", audienceType: "National brands" },
  url: PAGE_URL,
  offers: [
    {
      "@type": "Offer",
      name: "Listed",
      description: "Placement in National Deals at every campus. Free to list.",
      price: "0",
      priceCurrency: "USD",
      url: `${PAGE_URL}#${BRANDS_FORM_ID}`,
    },
    {
      "@type": "Offer",
      name: "Partner",
      description:
        "Tracked referrals, featured placement, and campus-level reporting. Terms agreed by application.",
      url: `${PAGE_URL}#${BRANDS_FORM_ID}`,
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: BRANDS_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

/* Brand green (#05EB54) is 1.61:1 on white: green fills shapes, ink letters
   them, and small green copy uses text-primary-dark. See globals.css. */

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Cross({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function WhyIcon({ name, className = "" }: { name: string; className?: string }) {
  const common = {
    className,
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "shield")
    return (
      <svg {...common}>
        <path d="M12 3 4 6v6c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V6l-8-3Z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    );
  if (name === "bolt")
    return (
      <svg {...common}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  );
}

export default async function BrandsPage() {
  // Real brands from the live National Deals feed, for the hero shelf and the
  // logo strip. Degrades to [] so a dead API costs the proof, not the page.
  const deals = await fetchNationalDeals();
  const realStats = BRAND_STATS.filter((s) => s.value !== STAT_PLACEHOLDER);

  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* ─── 1. Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(90%_70%_at_15%_0%,black,transparent_70%)] [-webkit-mask-image:radial-gradient(90%_70%_at_15%_0%,black,transparent_70%)] pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_0%,rgba(5,235,84,0.14),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 pt-10 pb-12 md:pt-28 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center">
            <div className="lg:col-span-7">
              <AnimatedSection>
                <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-5">
                  Brand partner program
                </p>
                <h1 className="text-[2.35rem] sm:text-5xl md:text-6xl font-bold text-ink leading-[1.05] tracking-tight mb-5 md:mb-6">
                  Reach verified college students at{" "}
                  <span className="marker-underline marker-draw">every campus</span> in the country.
                </h1>
                <p className="text-[17px] md:text-xl text-muted mb-7 md:mb-8 max-w-xl leading-relaxed">
                  Bizzy is the app students open to save money and go out. List a student-only
                  offer and put your brand in front of students at the moment they&apos;re deciding
                  where to spend.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`#${BRANDS_FORM_ID}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base bg-primary text-ink shadow-lg shadow-primary/25 hover:brightness-105 transition-all"
                  >
                    Apply to list your offer
                    <ArrowRight />
                  </Link>
                  <Link
                    href={`#${BRANDS_HOW_ID}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base text-primary-dark border-2 border-primary/40 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    See how it works
                    <ArrowRight />
                  </Link>
                </div>

                {/* STAT ROW. Two of these are STAT_PLACEHOLDER until Cooper
                    supplies real numbers; see lib/brands/copy.ts. */}
                {/* Stat row only once at least two real numbers exist in
                    lib/brands/copy.ts; a single "Free" on its own read as a
                    leftover. Until then, the three facts a brand checks first. */}
                {realStats.length >= 2 ? (
                  <dl className="mt-8 md:mt-10 grid grid-cols-3 gap-3 sm:gap-4 max-w-lg">
                    {realStats.map((s) => (
                      <div key={s.label} className="border-l-2 border-primary pl-3 sm:pl-4">
                        <dt className="sr-only">{s.label}</dt>
                        <dd className="text-xl sm:text-2xl md:text-3xl font-bold text-ink tracking-tight leading-none">
                          {s.value}
                        </dd>
                        <dd className="text-[11px] sm:text-xs md:text-sm text-muted mt-1.5 leading-tight" aria-hidden>
                          {s.label}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted">
                    {["Free to list", "Non-exclusive", "Reviewed by hand", "Live at every US university"].map((p) => (
                      <li key={p} className="inline-flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-primary-dark" />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </AnimatedSection>
            </div>

            <div className="lg:col-span-5">
              <AnimatedSection delay={0.15} variant="fade-left">
                <NationalDealsShelf deals={deals} />
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 1b. Proof: brands already in National Deals ───────── */}
      <BrandLogoStrip deals={deals} />

      {/* ─── 2. Why Bizzy ─────────────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100">
        <SectionContainer className="!py-16 md:!py-24">
          <AnimatedSection>
            <div className="max-w-2xl mb-12">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">
                Why Bizzy
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight">
                Not another coupon site.
              </h2>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {WHY_BIZZY.map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.08}>
                <div className="bg-white rounded-2xl p-7 md:p-8 shadow-sm border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-5 text-primary-dark">
                    <WhyIcon name={item.icon} />
                  </div>
                  <h3 className="text-xl font-bold text-ink mb-2.5">{item.title}</h3>
                  <p className="text-muted leading-relaxed">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* ─── 3. How it works ──────────────────────────────────── */}
      <section id={BRANDS_HOW_ID} className="relative overflow-hidden bg-ink text-white">
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-primary/12 rounded-full blur-3xl pointer-events-none" />
        <SectionContainer className="relative !py-16 md:!py-24">
          <AnimatedSection>
            <div className="max-w-2xl mb-12">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">
                How it works
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                Apply once. We handle the{" "}
                <span className="marker-sticker">
                  <span>listing</span>
                </span>
                .
              </h2>
              <p className="text-lg text-white/60 leading-relaxed">
                Four steps from application to students claiming your offer.
              </p>
            </div>
          </AnimatedSection>
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <AnimatedSection key={s.n} delay={i * 0.08} className="h-full">
                <li className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:p-7 flex flex-row lg:flex-col gap-4 lg:gap-0">
                  <span
                    className="w-9 h-9 rounded-lg bg-primary text-ink text-sm font-bold flex items-center justify-center flex-shrink-0 lg:mb-5"
                    aria-hidden
                  >
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug mb-1.5 lg:mb-2">{s.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{s.description}</p>
                  </div>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </SectionContainer>
      </section>

      {/* ─── 4. What qualifies ────────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[11fr_9fr] gap-10 lg:gap-14 items-start">
            <div className="lg:sticky lg:top-24">
              <AnimatedSection>
                <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">
                  What qualifies
                </p>
                <h2 className="text-4xl md:text-5xl font-bold text-ink tracking-tight leading-[1.05] mb-5">
                  Your offer must be{" "}
                  <span className="marker-underline marker-draw">student-specific</span>.
                </h2>
                <p className="text-lg text-muted leading-relaxed max-w-lg mb-4">
                  Bizzy exists to give students a real advantage. Every listing has to earn its
                  place.
                </p>
                <p className="text-lg text-ink font-medium leading-relaxed max-w-lg">
                  It has to give students something the general public doesn&apos;t get.
                </p>

                <div className="mt-8 rounded-2xl border border-primary/25 bg-white px-5 py-4 max-w-lg">
                  <p className="text-sm font-bold text-ink mb-1">Non-exclusive.</p>
                  <p className="text-sm text-muted leading-relaxed">
                    You can keep running your student offer everywhere else. We just want Bizzy
                    students to have access to it.
                  </p>
                </div>
              </AnimatedSection>
            </div>

            <div className="space-y-4">
              <AnimatedSection delay={0.1}>
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm shadow-black/[0.03]">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-ink" />
                    </div>
                    <h3 className="font-bold text-ink text-sm">Examples that qualify</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {QUALIFIES.map((item) => (
                      <li key={item} className="text-sm text-ink leading-snug flex gap-2.5">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.16}>
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm shadow-black/[0.03]">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <Cross className="w-3 h-3 text-ink" />
                    </div>
                    <h3 className="font-bold text-muted text-sm">Examples that don&apos;t qualify</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {DOES_NOT_QUALIFY.map((item) => (
                      <li key={item} className="text-sm text-muted leading-snug flex gap-2.5">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Partner tiers ─────────────────────────────────── */}
      <SectionContainer className="!py-16 md:!py-24">
        <AnimatedSection>
          <div className="max-w-2xl mb-10 md:mb-12">
            <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">
              Partner tiers
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-4">
              Two ways to work with Bizzy.
            </h2>
            <p className="text-lg text-muted leading-relaxed">
              Start free. Move to tracked terms when the numbers say you should.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <AnimatedSection className="h-full">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-light via-white to-primary-light border border-primary/15 p-6 md:p-10 h-full flex flex-col">
              <div className="absolute -right-32 -top-32 w-[400px] h-[400px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h3 className="text-2xl md:text-3xl font-bold text-ink">{TIERS.listed.name}</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-primary text-ink rounded-full text-[11px] font-bold uppercase tracking-widest">
                    {TIERS.listed.price}
                  </span>
                </div>
                <p className="text-muted leading-relaxed mb-7">{TIERS.listed.tagline}</p>
                <ul className="space-y-3 mb-8">
                  {TIERS.listed.features.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-ink text-sm md:text-base">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="text-ink w-3 h-3" />
                      </div>
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button href={`#${BRANDS_FORM_ID}`} variant="primary" size="lg" className="w-full sm:w-auto !text-ink">
                    Apply to list free
                  </Button>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1} className="h-full">
            <div className="relative overflow-hidden rounded-3xl bg-ink p-6 md:p-10 h-full flex flex-col">
              <div className="absolute -right-32 -top-32 w-[500px] h-[500px] bg-primary/25 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h3 className="text-2xl md:text-3xl font-bold text-white">{TIERS.partner.name}</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-white/10 border border-white/15 text-white rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
                    {TIERS.partner.price}
                  </span>
                </div>
                <p className="text-white/70 leading-relaxed mb-7">{TIERS.partner.tagline}</p>
                <ul className="space-y-3 mb-8">
                  {TIERS.partner.features.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-white/90 text-sm md:text-base">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                        <Check className="text-primary w-3 h-3" />
                      </div>
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button href={`#${BRANDS_FORM_ID}`} variant="primary" size="lg" className="w-full sm:w-auto !text-ink">
                    Apply for Partner
                  </Button>
                  <p className="mt-4 text-white/50 text-sm">
                    Tick &ldquo;Interested in the Partner tier&rdquo; on the form. We&apos;ll follow up with terms.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* ─── 6. Application form ──────────────────────────────── */}
      <section id={BRANDS_FORM_ID} className="relative overflow-hidden bg-white border-t border-gray-100">
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(100%_55%_at_50%_0%,black,transparent_75%)] [-webkit-mask-image:radial-gradient(100%_55%_at_50%_0%,black,transparent_75%)] pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(85%_45%_at_50%_0%,rgba(5,235,84,0.16),transparent_65%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 md:py-24">
          <AnimatedSection>
            <div className="text-center max-w-xl mx-auto mb-10">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">
                Application
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight mb-3">
                Apply to list your offer.
              </h2>
              <p className="text-muted leading-relaxed">
                About five minutes. We review every application by hand and reply within a few
                business days.
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.08} immediate>
            <BrandApplicationForm />
          </AnimatedSection>
        </div>
      </section>

      {/* ─── 7. FAQ ───────────────────────────────────────────── */}
      <section className="bg-gray-50">
        <SectionContainer className="!py-16 md:!py-24">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-3">
                Questions.
              </h2>
              <p className="text-muted text-lg">
                What brand partnerships teams ask before they list. Anything else, email{" "}
                <a href={`mailto:${BRANDS_CONTACT_EMAIL}`} className="text-primary-dark font-medium hover:underline">
                  {BRANDS_CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <FAQ items={[...BRANDS_FAQ]} />
          </div>
        </SectionContainer>
      </section>

      {/* ─── 8. Closing CTA ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-emerald-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
        <SectionContainer className="relative text-center !pt-14 !pb-24 md:!py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-6">
              Put your student offer in front of every campus.
            </h2>
            <Button href={`#${BRANDS_FORM_ID}`} variant="white" size="lg">
              Apply
              <ArrowRight className="ml-2" />
            </Button>
          </AnimatedSection>
        </SectionContainer>
      </section>

      <StickyApplyCTA />
    </>
  );
}
