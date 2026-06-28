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
  title: "Post Student Discounts | Bizzy: Free to List, Keep Every Sale",
  description:
    "Restaurants, cafés, and retail: post a student-only discount and reach thousands of nearby students. Free to list, you keep every sale, no POS integration. See exactly how signup and redemption work.",
  alternates: {
    canonical: "https://bizzyu.com/discounts",
  },
  openGraph: {
    title: "Post Student Discounts | Bizzy: Free to List, Keep Every Sale",
    description:
      "Reach thousands of local students and build a crowd of regulars. Post a Bizzy-exclusive deal. Free to list, you keep every sale, no POS integration. Live in minutes.",
  },
};

const REDEEM_STEPS = [
  {
    num: "1",
    title: "Post your deal",
    desc: "List your Bizzy-exclusive offer from your dashboard. It takes a couple of minutes.",
    icon: "post",
  },
  {
    num: "2",
    title: "Set the redemption frequency",
    desc: "Once per day, week, month, one-time, or unlimited. You decide how often each student can claim it.",
    icon: "frequency",
  },
  {
    num: "3",
    title: "A student redeems in store",
    desc: "They find your deal on their phone, walk in, and show it at checkout.",
    icon: "store",
  },
  {
    num: "4",
    title: "Staff taps to verify",
    desc: "Your staff taps 'Staff member tap here.' It verifies on the spot, then locks for the window you set.",
    icon: "verify",
  },
];

const CONTROLS = [
  {
    title: "Set the offer",
    desc: "BOGO, dollars off, a free item, a percentage. Whatever moves product for you. You write it, you own it.",
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
  "Keep 100% of every sale, Bizzy never takes a cut",
  "No POS integration, hardware, or coupon codes",
  "A Bizzy-exclusive audience you can't reach on other apps",
  "Cancel anytime, no contracts, no lock-in",
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

function IconTag({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7" cy="7" r="1.4" />
    </svg>
  );
}

function IconRepeat({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconPhone({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </svg>
  );
}

function IconLock({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function StepIcon({ name, className = "" }: { name: string; className?: string }) {
  if (name === "post") return <IconTag className={className} />;
  if (name === "frequency") return <IconRepeat className={className} />;
  if (name === "store") return <IconPhone className={className} />;
  return <CheckIcon className={className} />;
}

/* Reassurance strip under CTAs. Every claim is true: free to list, no cut of
   sales, no hardware/POS, cancel anytime. Lowers the perceived cost of
   starting an account for cold visitors arriving from outreach. */
const REASSURE_POINTS = ["No credit card", "No cut of your sales", "No POS or hardware", "Cancel anytime"];

function ReassureStrip({
  className = "",
  align = "left",
  tone = "muted",
}: {
  className?: string;
  align?: "left" | "center";
  tone?: "muted" | "light";
}) {
  const text = tone === "light" ? "text-white/80" : "text-muted";
  const dot = tone === "light" ? "text-white/90" : "text-primary";
  return (
    <ul
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium ${text} ${
        align === "center" ? "justify-center" : ""
      } ${className}`}
    >
      {REASSURE_POINTS.map((point) => (
        <li key={point} className="inline-flex items-center gap-1.5">
          <CheckIcon className={`w-4 h-4 ${dot}`} />
          {point}
        </li>
      ))}
    </ul>
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
      className={`w-[240px] sm:w-[270px] md:w-[300px] lg:w-[320px] h-auto animate-float ${className}`}
    />
  );
}

export default function DiscountsPage() {
  return (
    <>
      {/* ─── 1. Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Structured atmosphere: bulletin-board dots + one intentional green
            glow + a top hairline, instead of the AI-default blur blobs. */}
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(115%_85%_at_12%_-10%,black,transparent_72%)] [-webkit-mask-image:radial-gradient(115%_85%_at_12%_-10%,black,transparent_72%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_100%_0%,rgba(5,235,84,0.18),transparent_62%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent pointer-events-none" />

        <SectionContainer className="relative !py-16 md:!py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <AnimatedSection>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-ink leading-[1.04] tracking-tight mb-6">
                  Reach local students.
                  <br />
                  <span className="font-display-italic font-normal text-ink">
                    Build local <span className="marker-underline marker-draw">community</span>.
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-muted mb-9 max-w-xl leading-relaxed">
                  Thousands of students near campus are looking for their spot. Post a Bizzy-exclusive deal, fill your slow hours, and turn first visits into regulars.{" "}
                  <span className="text-ink font-semibold">Free to list. You keep every sale.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button href="/business/signup" variant="primary" size="lg" className="w-full sm:w-auto">
                    Get Started Free
                  </Button>
                  <Link
                    href="#how-it-works"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base text-primary border-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    See how it works
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <ReassureStrip className="mt-5" />

                <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-primary leading-none">$0</p>
                    <p className="text-xs text-muted mt-1.5">To list a deal</p>
                  </div>
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-ink leading-none">100%</p>
                    <p className="text-xs text-muted mt-1.5">Yours to keep</p>
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

      {/* ─── 2. You're in control + redemption ────────────────── */}
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
                You decide what the offer is and exactly how it runs. The only rule: it has to be exclusive to Bizzy, a deal students can&apos;t get anywhere else.
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

      {/* ─── 3. How a redemption works ───────────────────────────────── */}
      <section className="bg-gray-50" id="how-it-works">
        <SectionContainer className="!py-20 md:!py-28">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">How it works</p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-4">
                How a redemption works.
              </h2>
              <p className="text-lg text-muted">
                From posting your deal to a student walking back in. Here&apos;s the whole loop.
              </p>
            </div>
          </AnimatedSection>

          {/* Connected step diagram */}
          <div className="relative max-w-6xl mx-auto">
            {/* horizontal connector (desktop) */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-primary/20" aria-hidden />
            {/* vertical connector (mobile timeline) */}
            <div className="md:hidden absolute top-8 bottom-8 left-8 w-0.5 bg-primary/20" aria-hidden />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-7 md:gap-6 relative">
              {REDEEM_STEPS.map((step, i) => (
                <AnimatedSection key={step.num} delay={i * 0.08}>
                  <div className="flex items-start gap-4 md:block md:text-center">
                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/25 ring-8 ring-gray-50 flex-shrink-0 md:mx-auto md:mb-5">
                      <StepIcon name={step.icon} className="w-7 h-7" />
                    </div>
                    <div className="pt-1 md:pt-0">
                      <div className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1 md:mb-1.5">Step {step.num}</div>
                      <h3 className="text-lg font-bold text-ink mb-1.5 md:mb-2 leading-tight">{step.title}</h3>
                      <p className="text-sm text-muted leading-relaxed md:max-w-[15rem] md:mx-auto">{step.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>

          {/* Frequency lock + auto-notify callout */}
          <AnimatedSection delay={0.2}>
            <div className="mt-14 md:mt-16 max-w-4xl mx-auto">
              <div className="relative overflow-hidden rounded-3xl bg-ink p-8 md:p-10 text-white">
                <div className="absolute -right-24 -top-24 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                    <IconLock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-white">Your cap runs on autopilot.</h3>
                    <p className="text-white/70 leading-relaxed">
                      The redemption frequency you set is enforced for you. Run a once-a-month deal and it locks on each student&apos;s phone for 30 days after they redeem, then it unlocks and pings them that it&apos;s back. You stay protected from overuse, and the reminder pulls them right back through your door.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="flex flex-col items-center mt-12">
              <Button href="/business/signup" variant="primary" size="lg">
                Get Started Free
              </Button>
              <ReassureStrip className="mt-5" align="center" />
            </div>
          </AnimatedSection>
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
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">More than a discount</p>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
              Become their spot.
              <br />
              <span className="font-display-italic font-normal text-muted">
                Not a one-time <span className="marker-underline">deal</span>.
              </span>
            </h2>
            <p className="text-lg text-muted leading-relaxed max-w-xl">
              Students near campus are already on Bizzy hunting for somewhere to eat, drink, and shop. A Bizzy-exclusive deal gets them through the door, and the local following you build keeps them coming back, without paying a cut of every sale.
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
              Free to list, you keep every sale, live in minutes. Create your account, post your first deal, and start turning local students into regulars this week.
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
