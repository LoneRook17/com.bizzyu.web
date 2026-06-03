import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import ZeroFrictionBanner from "@/components/ui/ZeroFrictionBanner";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import BizzyVenuesMarquee from "@/components/ui/BizzyVenuesMarquee";
import { BUSINESS_FAQ, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Post Student Discounts | Bizzy: Free to List, 0% Commission",
  description:
    "Restaurants, cafés, and retail: post a student-only discount and reach thousands of nearby students. Free to list, 0% commission, no POS integration. See exactly how signup and redemption work.",
  alternates: {
    canonical: "https://bizzyu.com/discounts",
  },
  openGraph: {
    title: "Post Student Discounts | Bizzy: Free to List, 0% Commission",
    description:
      "Create a free account, post a Bizzy-exclusive deal, and students walk in. No fees, no commissions, no POS integration. Live in minutes.",
  },
};

const FLOW_STEPS = [
  {
    num: "1",
    title: "Create your free account",
    desc: "Business name, address, and the campus you want to reach. No card, no contract. Takes about 2 minutes.",
  },
  {
    num: "2",
    title: "Post your first deal",
    desc: "Set the offer, the estimated savings, how often students can claim it, and an optional photo. Watch it preview live as you type.",
  },
  {
    num: "3",
    title: "Go live to nearby students",
    desc: "Your deal lands in the Bizzy app in front of students around your campus — exactly the crowd you want walking in.",
  },
  {
    num: "4",
    title: "They walk in and redeem",
    desc: "A student shows the deal in-store and your staff taps Verify. That's it. No POS integration, no coupons, no extra equipment.",
  },
];

const CONTROLS = [
  {
    title: "Set the offer",
    desc: "BOGO, dollars off, a free item, a percentage — whatever moves product for you. You write it, you own it.",
  },
  {
    title: "Cap how often they claim",
    desc: "Once per day, per week, per month, one time only, or unlimited. Throttle redemptions so a deal never crushes a shift.",
  },
  {
    title: "Pick when it runs",
    desc: "Set a start date and steer students toward your slow hours instead of your rush.",
  },
  {
    title: "Stay in control after launch",
    desc: "Edit, pause, or pull a deal anytime from your dashboard. Performance updates land in your inbox.",
  },
];

const DEAL_TYPES = [
  { icon: "🎁", title: "BOGO", desc: "Buy one, get one on a hero item." },
  { icon: "💰", title: "Flat $ off", desc: "$5, $10, $15 off a check or order." },
  { icon: "🍔", title: "Meal deals", desc: "A full combo at a student price." },
  { icon: "🎉", title: "Free item", desc: "A free side, drink, or dessert with purchase." },
  { icon: "🏷️", title: "% off", desc: "A straight percentage off the order." },
  { icon: "🗓️", title: "Monthly exclusive", desc: "A rotating offer only Bizzy students see." },
];

const WHY_LIST = [
  "Reach thousands of students near your campus, for free",
  "Push product during slow hours and quiet days",
  "0% commission — keep every dollar of every sale",
  "No POS integration, hardware, or coupon codes",
  "A Bizzy-exclusive audience you can't reach on other apps",
  "Cancel anytime — no contracts, no lock-in",
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 flex-shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

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

/* ─── Real app screenshots (device frame baked into each PNG) ─ */

function PhonePhoto({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={2160}
      height={3840}
      priority={priority}
      sizes="(max-width: 640px) 240px, (max-width: 768px) 270px, 320px"
      className={`w-[240px] sm:w-[270px] md:w-[300px] lg:w-[320px] h-auto animate-float drop-shadow-[0_30px_45px_rgba(4,40,20,0.28)] ${className}`}
    />
  );
}

export default function DiscountsPage() {
  return (
    <>
      {/* ─── 1. Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/50 via-white to-white pointer-events-none" />
        <div className="absolute top-1/4 -right-20 w-[520px] h-[520px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <SectionContainer className="relative !py-16 md:!py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-primary/20 rounded-full text-xs font-semibold mb-7 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-ink">For restaurants, cafés &amp; retail</span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-ink leading-[1.04] tracking-tight mb-6">
                  Post a discount in seconds.
                  <br />
                  <span className="font-display-italic font-normal text-ink">
                    Reach more <span className="marker-underline">local students</span>.
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-muted mb-9 max-w-xl leading-relaxed">
                  List a student-only deal, set your redemption cap, and Bizzy puts it in front of thousands of students in your college town.{" "}
                  <span className="text-ink font-semibold">Free to list. 0% commission. Live in minutes.</span>
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button href="/business/signup" variant="primary" size="lg">
                    Get Started Free
                  </Button>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base text-primary border-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    See how it works
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-primary leading-none">$0</p>
                    <p className="text-xs text-muted mt-1.5">To list a deal</p>
                  </div>
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-ink leading-none">0%</p>
                    <p className="text-xs text-muted mt-1.5">Commission</p>
                  </div>
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-ink leading-none">25K+</p>
                    <p className="text-xs text-muted mt-1.5">Students reachable</p>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            <div className="lg:col-span-5">
              <AnimatedSection delay={0.15} variant="fade-left">
                <div className="relative flex justify-center">
                  <div className="absolute inset-0 -m-6 bg-gradient-to-tr from-primary/25 via-emerald-300/15 to-transparent rounded-[3rem] blur-3xl pointer-events-none" />
                  <PhonePhoto
                    src="/images/bizzy-deals-screen.png"
                    alt="The Bizzy app showing a feed of student deals near campus"
                    priority
                    className="relative"
                  />
                </div>
              </AnimatedSection>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* ─── 2. The signup flow ───────────────────────────────── */}
      <section className="bg-gray-50" id="how-it-works">
        <SectionContainer className="!py-20 md:!py-28">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">How it works</p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-4">
                From signup to first redemption.
              </h2>
              <p className="text-lg text-muted">
                Four steps, start to finish. No sales call required — you can do the whole thing yourself.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-12">
            {FLOW_STEPS.map((step, i) => (
              <AnimatedSection key={step.num} delay={i * 0.08}>
                <div className="relative bg-white rounded-2xl p-7 border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-emerald-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-4 shadow-lg shadow-primary/25">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2 leading-tight">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.3}>
            <div className="text-center">
              <Button href="/business/signup" variant="primary" size="lg">
                Create your free account
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── 3. You're in control + redemption ────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(5,235,84,0.08),transparent_55%)] pointer-events-none" />
        <SectionContainer className="relative !py-20 md:!py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">You set the rules</p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
                Your deal.
                <br />
                <span className="font-display-italic font-normal text-muted">
                  Your <span className="marker-underline">terms</span>.
                </span>
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-8 max-w-xl">
                You decide what the offer is and exactly how it runs. The only rule: it has to be exclusive to Bizzy — a deal students can&apos;t get anywhere else.
              </p>

              <div className="space-y-5">
                {CONTROLS.map((c) => (
                  <div key={c.title} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="text-primary w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink leading-snug">{c.title}</h3>
                      <p className="text-sm text-muted leading-relaxed mt-0.5">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.15} variant="fade-left">
              <div className="relative flex justify-center">
                <div className="absolute -inset-8 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                <PhonePhoto
                  src="/images/bizzy-taco-main.png"
                  alt="A Bizzy deal open in the app with a Staff Member Tap Here button to verify the discount in store"
                  className="relative [animation-delay:-2s]"
                />
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* ─── 4. Deal types ────────────────────────────────────── */}
      <section className="bg-gray-50">
        <SectionContainer className="!py-20 md:!py-24">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.18em] mb-3">Pick your play</p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-3">
                Any kind of deal works.
              </h2>
              <p className="text-muted text-lg">
                Run whatever fits your margins. Not sure what to post? We&apos;ll help you choose on signup.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
            {DEAL_TYPES.map((deal, i) => (
              <AnimatedSection key={deal.title} delay={i * 0.06}>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/30 transition-all duration-300 group h-full">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{deal.icon}</div>
                  <h3 className="font-bold text-ink mb-1.5">{deal.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{deal.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* ─── 5. Why list ──────────────────────────────────────── */}
      <SectionContainer className="!py-20 md:!py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <AnimatedSection>
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">Why restaurants &amp; retail list</p>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
              The crowd you want.
              <br />
              <span className="font-display-italic font-normal text-muted">
                Walking through the <span className="marker-underline">door</span>.
              </span>
            </h2>
            <p className="text-lg text-muted leading-relaxed max-w-xl">
              Students near campus are already on Bizzy hunting for somewhere to eat, drink, and shop. A discount puts you at the top of that list — without paying a cut of every sale.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1} variant="fade-left">
            <div className="space-y-3">
              {WHY_LIST.map((line) => (
                <div key={line} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="text-white w-3.5 h-3.5" />
                  </div>
                  <span className="text-ink/90 text-base">{line}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* ─── 6. Zero friction banner ──────────────────────────── */}
      <SectionContainer className="!pt-0 !pb-20 md:!pb-24">
        <ZeroFrictionBanner />
      </SectionContainer>

      {/* ─── 7. Brands on Bizzy ───────────────────────────────── */}
      <BizzyVenuesMarquee label="Already on Bizzy" theme="light" />

      {/* ─── 8. FAQ ───────────────────────────────────────────── */}
      <section className="bg-gray-50">
        <SectionContainer className="!py-20 md:!py-24">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-3">
                Common questions.
              </h2>
              <p className="text-muted text-lg">Everything restaurants and retail ask before they post a deal.</p>
            </div>
          </AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <FAQ items={BUSINESS_FAQ} />
          </div>
        </SectionContainer>
      </section>

      {/* ─── 9. Final CTA ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-emerald-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_50%)] pointer-events-none" />
        <SectionContainer className="relative text-center !py-20 md:!py-28">
          <AnimatedSection>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
              Post your first deal today.
            </h2>
            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Free to list, 0% commission, live in minutes. Create your account and have a deal in front of students this week.
            </p>
            <Button href="/business/signup" variant="white" size="lg">
              Get Started Free
            </Button>
            <p className="mt-6 text-white/80 text-sm">
              Questions first?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:no-underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
