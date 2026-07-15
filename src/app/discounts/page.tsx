import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import BizzyVenuesMarquee from "@/components/ui/BizzyVenuesMarquee";
import BizzyLogoCluster from "@/components/ui/BizzyLogoCluster";
import AutoLoopVideo from "@/components/ui/AutoLoopVideo";
import DiscountTestimonials from "@/components/discounts/DiscountTestimonials";
import CouponBook from "@/components/discounts/CouponBook";
import { BUSINESS_FAQ, CONTACT_EMAIL, PARTNERSHIPS_EMAIL } from "@/lib/constants";
import { fetchTrendingDeals } from "@/lib/deals";

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
      "You're invited to put a student-only deal in front of thousands of students near campus. Free to list, you keep every sale, live in minutes.",
  },
};

/* Brand green (#05EB54) is 1.61:1 on white — it fails WCAG AA for text at any
   size, and white-on-green fails too. So on this page green FILLS shapes and
   dark ink LETTERS them: `text-primary-dark` (5.05:1) for small green copy,
   `!text-ink` on green buttons (12.8:1). See globals.css. */
const GREEN_BUTTON_INK = "!text-ink";

const STATS = [
  { value: "$0", label: "To list a deal" },
  { value: "100%", label: "Of every sale is yours" },
];

const REDEEM_STEPS = [
  {
    num: "1",
    title: "Post your deal",
    desc: "List your Bizzy-exclusive offer from your dashboard. Takes a couple of minutes.",
    icon: "post",
  },
  {
    num: "2",
    title: "Set the frequency",
    desc: "Per day, week, month, one-time, or unlimited. You decide how often each student can claim it.",
    icon: "frequency",
  },
  {
    num: "3",
    title: "A student redeems",
    desc: "They find your deal on their phone, walk in, and show it at checkout.",
    icon: "store",
  },
  {
    num: "4",
    title: "Staff taps to verify",
    desc: "One tap on “Staff member tap here.” Verifies on the spot, then locks for the window you set.",
    icon: "verify",
  },
];

const CONTROLS = [
  {
    title: "Set the offer",
    desc: "BOGO, dollars off, a free item, a percentage. Whatever moves product for you.",
  },
  {
    title: "Cap how often",
    desc: "Per day, week, month, one time, or unlimited. A deal never crushes a shift.",
  },
  {
    title: "Pick when it runs",
    desc: "Set a start date and steer students toward your slow hours, not your rush.",
  },
  {
    title: "Stay in control",
    desc: "Edit, pause, or pull a deal anytime. Performance updates land in your inbox.",
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

const WHY_IT_WORKS = [
  {
    icon: "reach",
    title: "Reach students for free",
    desc: "Thousands of students near campus are already on Bizzy hunting for somewhere to eat, drink, and shop.",
  },
  {
    icon: "keep",
    title: "Keep 100% of every sale",
    desc: "No platform fees. No commission on redemptions. Bizzy never takes a cut.",
  },
  {
    icon: "friction",
    title: "Zero friction to start",
    desc: "No POS integration, hardware, or coupon codes. Live in under 5 minutes; staff just tap one button.",
  },
];

/* Reassurance strip. Every claim is true: free to list, no cut of sales, no
   hardware/POS, cancel anytime. Appears ONCE, in the hero — repeating it down
   the page was the main source of the old page's noise. */
const REASSURE_POINTS = ["No credit card", "No cut of your sales", "No POS or hardware", "Cancel anytime"];

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

function IconUsers({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconWallet({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M17 12h.01" />
    </svg>
  );
}

function IconBolt({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </svg>
  );
}

function StepIcon({ name, className = "" }: { name: string; className?: string }) {
  if (name === "post") return <IconTag className={className} />;
  if (name === "frequency") return <IconRepeat className={className} />;
  if (name === "store") return <IconPhone className={className} />;
  return <CheckIcon className={className} />;
}

function WhyIcon({ name, className = "" }: { name: string; className?: string }) {
  if (name === "reach") return <IconUsers className={className} />;
  if (name === "keep") return <IconWallet className={className} />;
  return <IconBolt className={className} />;
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

export default async function DiscountsPage() {
  // Live deals for the coupon book. A marketing page must never 500 because a
  // deals API blipped, so failure degrades to an empty book, which renders
  // nothing at all.
  let deals: Awaited<ReturnType<typeof fetchTrendingDeals>> = [];
  try {
    deals = (await fetchTrendingDeals()).slice(0, 5);
  } catch (err) {
    console.warn("[discounts] deal fetch failed", err);
  }

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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <AnimatedSection>
                <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-5">
                  Free for local businesses
                </p>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-ink leading-[1.04] tracking-tight mb-6">
                  Get more students through your{" "}
                  <span className="marker-underline marker-draw">door</span>.
                </h1>

                <p className="text-lg md:text-xl text-muted mb-8 max-w-xl leading-relaxed">
                  You&apos;re invited to put a student-only deal in front of thousands of students near campus.
                  Fill your slow hours, turn first visits into regulars —{" "}
                  <span className="text-ink font-semibold">free to list, and you keep every sale.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    href="/business/signup"
                    variant="primary"
                    size="lg"
                    className={`w-full sm:w-auto ${GREEN_BUTTON_INK}`}
                  >
                    Get Started Free
                  </Button>
                  <Link
                    href="#how-it-works"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base text-primary-dark border-2 border-primary/40 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    See how it works
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* The page's ONLY reassurance strip. */}
                <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted">
                  {REASSURE_POINTS.map((point) => (
                    <li key={point} className="inline-flex items-center gap-1.5">
                      <CheckIcon className="w-4 h-4 text-primary-dark" />
                      {point}
                    </li>
                  ))}
                </ul>

                <BizzyLogoCluster className="mt-9 pt-8 border-t border-gray-100">
                  <span className="font-semibold text-ink">20+ local spots near campus</span> are already on Bizzy.
                </BizzyLogoCluster>
              </AnimatedSection>
            </div>

            <div className="lg:col-span-5">
              <AnimatedSection delay={0.15} variant="fade-left">
                <div className="relative flex justify-center">
                  <div className="absolute inset-0 -m-6 bg-gradient-to-tr from-primary/25 via-emerald-300/15 to-transparent rounded-[3rem] blur-3xl pointer-events-none" />
                  <PhonePhoto
                    src="/images/bizzy-card-deal.png"
                    alt="The Bizzy app showing a student deal at a Taco Bell near campus — one free medium drink, claim once per day — with a Staff Member Tap Here button for staff to verify it at checkout"
                    priority
                    className="relative"
                  />
                </div>
              </AnimatedSection>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* ─── 2. Stats band ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute -left-32 -top-32 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <SectionContainer className="relative !py-14 md:!py-16">
          <AnimatedSection>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-6 max-w-2xl mx-auto text-center">
              {/* col-reverse: <dt> must precede <dd> to be valid inside <dl>,
                  but the number reads first visually. */}
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse gap-3">
                  <dt className="text-sm text-white/60">{stat.label}</dt>
                  <dd className="text-5xl md:text-6xl font-bold text-primary leading-none tracking-tight">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── 3. How a redemption works ────────────────────────── */}
      <section className="bg-gray-50" id="how-it-works">
        <SectionContainer className="!py-20 md:!py-28">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-3">How it works</p>
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
                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-ink flex items-center justify-center shadow-lg shadow-primary/25 ring-8 ring-gray-50 flex-shrink-0 md:mx-auto md:mb-5">
                      <StepIcon name={step.icon} className="w-7 h-7" />
                    </div>
                    <div className="pt-1 md:pt-0">
                      <div className="text-[11px] font-bold text-primary-dark uppercase tracking-widest mb-1 md:mb-1.5">
                        Step {step.num}
                      </div>
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
                      The redemption frequency you set is enforced for you. Run a once-a-month deal and it locks on each
                      student&apos;s phone for 30 days after they redeem, then it unlocks and pings them that it&apos;s
                      back. You stay protected from overuse, and the reminder pulls them right back through your door.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── 4. Your deal, your terms ─────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(5,235,84,0.08),transparent_55%)] pointer-events-none" />
        <SectionContainer className="relative !py-20 md:!py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">You set the rules</p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
                Your deal.
                <br />
                <span className="font-display-italic font-normal text-muted">
                  Your <span className="marker-underline">terms</span>.
                </span>
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-8 max-w-xl">
                You decide what the offer is and exactly how it runs. The only rule: it has to be exclusive to Bizzy, a
                deal students can&apos;t get anywhere else.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CONTROLS.map((c) => (
                  <div key={c.title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center mb-3">
                      <CheckIcon className="text-primary-dark w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-ink leading-snug mb-1">{c.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.15} variant="fade-left">
              <div className="relative flex justify-center">
                <div className="absolute -inset-8 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                {/* Interactive stand-in for the old static phone shot: owners can
                    tap through a real redemption instead of reading about one. */}
                <div className="relative w-full">
                  <CouponBook deals={deals} notchClassName="bg-white" />
                </div>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* ─── 5. Deal types ────────────────────────────────────── */}
      <section className="bg-gray-50">
        <SectionContainer className="!py-20 md:!py-24">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.18em] mb-3">Pick your play</p>
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

      {/* ─── 6. Why it works ──────────────────────────────────── */}
      <SectionContainer className="!py-20 md:!py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <AnimatedSection>
            <div className="relative flex justify-center lg:justify-start">
              <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-emerald-300/10 to-transparent rounded-[3rem] blur-3xl pointer-events-none" />
              {/* Real footage of a real redemption. Carries the argument that
                  the icon cards next to it can only assert. */}
              <AutoLoopVideo
                src="/videos/bizzy-slice.mp4"
                poster="/images/bizzy-slice-poster.jpg"
                label="A student shows a deal on their phone at the counter of a local pizzeria near campus, and walks away with a slice."
                className="relative w-[280px] sm:w-[320px] rounded-[2rem] ring-1 ring-black/5 shadow-2xl shadow-black/15"
              />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1} variant="fade-left">
            <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">More than a discount</p>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-9">
              Become their{" "}
              <span className="font-display-italic font-normal text-muted">
                <span className="marker-underline">spot</span>
              </span>
              .
            </h2>

            <div className="space-y-6">
              {WHY_IT_WORKS.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0">
                    <WhyIcon name={item.icon} className="w-5 h-5 text-primary-dark" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink mb-1 leading-snug">{item.title}</h3>
                    <p className="text-muted leading-relaxed text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* ─── 7. Testimonials ──────────────────────────────────────
          Renders nothing until each business approves its quote in writing.
          Drafts + the approval email: TESTIMONIAL_DRAFTS.md */}
      <DiscountTestimonials />

      {/* ─── 8. A note from the founder ───────────────────────── */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute -right-40 top-0 w-[32rem] h-[32rem] bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <SectionContainer className="relative !py-20 md:!py-28">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">A note from the founder</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-8">
                You&apos;re invited to be featured this school year.
              </h2>

              <div className="space-y-5 text-lg text-white/70 leading-relaxed">
                <p>
                  Bizzy helps students near campus find local deals, and it&apos;s 100% free for businesses to add a
                  student-only offer. We work closely with campus partners to put participating businesses in front of
                  students — and more than 20 nearby spots have already signed up.
                </p>
                <p className="text-white">
                  If you&apos;re interested, just send over the deals you&apos;d like listed and we&apos;ll set
                  everything up for you.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 px-6 py-5">
                <p className="text-sm text-white/50 mb-1.5">Example</p>
                <p className="text-lg text-white font-medium">Buy any entrée, get a free soft drink.</p>
              </div>

              {/* Founder card. TODO: swap the monogram for a real photo of
                  Cooper at /public/images/founder-cooper.jpg — a face here is
                  the single biggest warmth win left on this page. */}
              <div className="mt-10 flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full bg-primary text-ink flex items-center justify-center font-bold text-lg flex-shrink-0"
                  aria-hidden
                >
                  CA
                </div>
                <div>
                  <p className="font-bold text-white">Cooper Aiello</p>
                  <p className="text-white/50 text-sm">Founder, Bizzy</p>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Button
                  href="/business/signup"
                  variant="primary"
                  size="lg"
                  className={`w-full sm:w-auto ${GREEN_BUTTON_INK}`}
                >
                  List my deal free
                </Button>
                <a
                  href={`mailto:${PARTNERSHIPS_EMAIL}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base text-white border-2 border-white/25 hover:border-white/60 hover:bg-white/5 transition-all"
                >
                  Email us your deals
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── 9. Businesses already on Bizzy ───────────────────── */}
      <BizzyVenuesMarquee label="Already on Bizzy" theme="light" />

      {/* ─── 10. FAQ ──────────────────────────────────────────── */}
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

      {/* ─── 11. Final CTA ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-emerald-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_50%)] pointer-events-none" />
        <SectionContainer className="relative text-center !py-20 md:!py-28">
          <AnimatedSection>
            <h2 className="text-4xl md:text-6xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
              Post your first deal today.
            </h2>
            <p className="text-ink/75 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Free to list, you keep every sale, live in minutes.
            </p>
            <Button href="/business/signup" variant="white" size="lg">
              Get Started Free
            </Button>
            <p className="mt-6 text-ink/70 text-sm">
              Questions first?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink font-medium underline hover:no-underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
