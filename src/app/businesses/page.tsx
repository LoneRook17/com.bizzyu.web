import type { Metadata } from "next";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import ZeroFrictionBanner from "@/components/ui/ZeroFrictionBanner";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import BizzyVenuesMarquee from "@/components/ui/BizzyVenuesMarquee";
import { BUSINESS_FAQ, CALENDLY_DEMO_URL, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "For Businesses | Bizzy: 0% Fees, 25K+ Students",
  description:
    "Two paths to reach 25,000+ college students. Bars & venues: tickets, line skip, promoter army, SMS blasts, plus 100+ influencer events brought to venues nationwide. Restaurants & retail: list exclusive deals free.",
  alternates: {
    canonical: "https://bizzyu.com/businesses",
  },
  openGraph: {
    title: "For Businesses | Bizzy: 0% Fees, 25K+ Students",
    description:
      "Bars & venues book a 15-min call. Restaurants & retail sign up free in 5 minutes. Both pay 0% to Bizzy.",
  },
};

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function BusinessesPage() {
  return (
    <>
      {/* ─── 1. Hero, Pick your lane ──────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/40 via-white to-white pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <SectionContainer className="relative !py-14 md:!py-20">
          <AnimatedSection>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-primary/20 rounded-full text-xs font-semibold mb-6 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-ink">25K+ students. 400+ businesses. 0% fees.</span>
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-ink leading-[1.05] tracking-tight mb-6">
                Reach the students near you.
                <br />
                <span className="font-display-italic font-normal text-ink">
                  Pick <span className="marker-underline">your lane</span>.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted max-w-2xl leading-relaxed">
                Bizzy is a free platform for any business that wants to reach college students. Two ways in. Choose the one that fits.
              </p>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── 2. The two doors ─────────────────────────────── */}
      <SectionContainer className="!pt-4 md:!pt-8 !pb-20 md:!pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {/* DOOR 1: Bars & Venues */}
          <AnimatedSection>
            <div className="group relative overflow-hidden rounded-3xl bg-ink p-8 md:p-10 lg:p-12 h-full min-h-[600px] flex flex-col">
              <div className="absolute -right-32 -top-32 w-[500px] h-[500px] bg-primary/25 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="inline-flex items-center w-fit gap-2 px-3 py-1.5 bg-primary text-ink rounded-full text-[11px] font-bold uppercase tracking-widest mb-6">
                  Bars & Event Venues
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                  Sell Tickets.
                  <br />
                  Reach More Students.
                  <br />
                  <span className="font-display-italic font-normal text-white">
                    Keep <span className="marker-sticker"><span>100%</span></span>.
                  </span>
                </h2>
                <p className="text-white/70 text-base md:text-lg leading-relaxed mb-7 max-w-md">
                  0% platform fees on tickets, line skip, and cover. Plus an auto-paid promoter army, SMS blasts to past attendees, and influencer + DJ talent we bring to venues nationwide.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    "0% platform fees on tickets and cover",
                    "Auto-paid promoter referral links",
                    "SMS blasts to past attendees, included",
                    "100+ influencer events brought to bars nationwide",
                  ].map((line) => (
                    <li key={line} className="flex items-center gap-3 text-white/90 text-sm md:text-base">
                      <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                        <CheckIcon className="text-primary w-3 h-3" />
                      </div>
                      {line}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  <Button href={CALENDLY_DEMO_URL} variant="primary" size="lg" external>
                    Book a 15-Min Call
                  </Button>
                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base text-white border-2 border-white/15 hover:border-white/40 hover:bg-white/5 transition-all"
                  >
                    See the full pitch
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <p className="mt-5 text-xs text-white/50">
                  Recommended for: college bars, nightclubs, music venues, event spaces, promoters.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* DOOR 2: Restaurants & Retail */}
          <AnimatedSection delay={0.1}>
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-light via-white to-primary-light border border-primary/15 p-8 md:p-10 lg:p-12 h-full min-h-[600px] flex flex-col">
              <div className="absolute -right-32 -top-32 w-[400px] h-[400px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="inline-flex items-center w-fit gap-2 px-3 py-1.5 bg-white border border-primary/20 rounded-full text-[11px] font-bold uppercase tracking-widest text-primary mb-6 shadow-sm">
                  Restaurants & Retail
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-4">
                  Post Discounts.
                  <br />
                  Reach Nearby Students.
                  <br />
                  <span className="font-display-italic font-normal text-ink">
                    <span className="marker-underline">Free</span> to list.
                  </span>
                </h2>
                <p className="text-muted text-base md:text-lg leading-relaxed mb-7 max-w-md">
                  Post a student discount and reach thousands of nearby students in your college town. You set the deal, the redemption cap, and the hours. Bizzy puts it in front of the right crowd.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    "Reach thousands of nearby students",
                    "Cap redemptions so you don't get crushed",
                    "Push product during slow hours",
                    "Free to list, no commissions on redemptions",
                  ].map((line) => (
                    <li key={line} className="flex items-center gap-3 text-ink text-sm md:text-base">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <CheckIcon className="text-white w-3 h-3" />
                      </div>
                      {line}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  <Button href="/business/signup" variant="primary" size="lg">
                    Get Started Free
                  </Button>
                  <Link
                    href="/discounts"
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base text-primary border-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    Learn more
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <p className="mt-5 text-xs text-muted">
                  Recommended for: restaurants, cafés, QSR, retail, services, anything off-premise students walk into.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* ─── 3. Live venue logo marquee ───────────────────── */}
      <BizzyVenuesMarquee label="Already on Bizzy" theme="light" />

      {/* ─── 4. Zero friction banner ─────────────────────── */}
      <SectionContainer className="!py-16 md:!py-24">
        <ZeroFrictionBanner />
      </SectionContainer>

      {/* ─── 4. FAQ ──────────────────────────────────────── */}
      <section className="bg-gray-50">
        <SectionContainer className="!py-20 md:!py-24">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-3">
                Common questions.
              </h2>
              <p className="text-muted text-lg">For deals and retail. For bar-specific questions, see the events page.</p>
            </div>
          </AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <FAQ items={BUSINESS_FAQ} />
          </div>
        </SectionContainer>
      </section>

      {/* ─── 5. Final CTA, mirror the two doors ───────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-emerald-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
        <SectionContainer className="relative text-center !py-20 md:!py-24">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-5">
              Pick your lane. Start today.
            </h2>
            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Both paths are free. Both reach the same 25,000+ students. Both pay 0% to Bizzy.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button href={CALENDLY_DEMO_URL} variant="white" size="lg" external>
                I run a bar → Book a call
              </Button>
              <Button
                href="/business/signup"
                variant="white"
                size="lg"
                className="!bg-white/15 !text-white hover:!bg-white/25 backdrop-blur-sm"
              >
                I run a restaurant → Sign up
              </Button>
            </div>
            <p className="mt-6 text-white/75 text-sm">
              Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:no-underline">{CONTACT_EMAIL}</a>
            </p>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
