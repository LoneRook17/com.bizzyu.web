import type { Metadata } from "next";
import Link from "next/link";
import SignupFlow from "@/components/signup/SignupFlow";
import CouponFan from "@/components/signup/CouponFan";
import CampusStrip from "@/components/signup/CampusStrip";
import AnimatedSection from "@/components/ui/AnimatedSection";
import AutoLoopVideo from "@/components/ui/AutoLoopVideo";
import Parallax from "@/components/ui/Parallax";
import { CONTACT_EMAIL } from "@/lib/constants";
import { fetchTrendingDeals } from "@/lib/deals";
import { fetchUniversities } from "@/lib/universities";

export const metadata: Metadata = {
  title: "Get Featured in Your University's Largest Coupon Book | Bizzy",
  description:
    "Add a student-only deal to the coupon book thousands of students near campus already carry. Free to list, you keep every sale, no POS or contracts. Takes about 5 minutes.",
  openGraph: {
    title: "Get Featured in Your University's Largest Coupon Book | Bizzy",
    description:
      "Add a student-only deal to the coupon book students near campus already carry. Free to list, you keep every sale.",
  },
};

/* Brand green (#05EB54) is 1.61:1 on white: it fails WCAG AA for text at any
   size, and white-on-green fails too. Green fills shapes here, ink letters
   them. Small green copy uses text-primary-dark (5.05:1). See globals.css. */

const QUALIFIES = [
  "Buy one, get one margarita",
  "Free appetizer with an entrée",
  "Monthly student-only special",
  "Exclusive meal or drink bundle",
];

const DOES_NOT = [
  "An existing Instagram promotion",
  "A regular happy hour",
  "A permanent public special",
  "A discount already offered to all students",
];

const STEPS = [
  { n: "1", t: "Send us the deal", d: "Fill in the offer below. About five minutes." },
  { n: "2", t: "We build the listing", d: "We design the card and post it to your campus." },
  { n: "3", t: "Students walk in", d: "They show it at the counter. Staff taps once to verify." },
];

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

export default async function PostADealPage() {
  // The book, shown rather than described. A marketing page must never 500
  // because a deals API blipped, so failure degrades to no fan at all.
  let deals: Awaited<ReturnType<typeof fetchTrendingDeals>> = [];
  let universities: Awaited<ReturnType<typeof fetchUniversities>> = [];
  try {
    // Independent calls, so pay for the slower one rather than both.
    const [d, u] = await Promise.all([fetchTrendingDeals(), fetchUniversities()]);
    deals = d.slice(0, 3);
    universities = u;
  } catch (err) {
    console.warn("[post-a-deal] live data fetch failed", err);
  }

  return (
    <main className="min-h-screen bg-white">
      {/* ─── Hero: the corkboard ──────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* The dot grid is the bulletin board this page is set on. */}
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(120%_90%_at_20%_0%,black,transparent_70%)] [-webkit-mask-image:radial-gradient(120%_90%_at_20%_0%,black,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(65%_50%_at_95%_0%,rgba(5,235,84,0.16),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-10 md:pt-28 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            <div className="lg:col-span-7">
              <AnimatedSection>
                <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-5">
                  Free to list
                </p>

                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-[1.05] tracking-tight mb-6">
                  Get featured in your university&apos;s largest{" "}
                  <span className="marker-underline marker-draw">coupon book</span>.
                </h1>

                <p className="text-lg md:text-xl text-muted mb-8 max-w-xl leading-relaxed">
                  Thousands of students near campus already carry it on their phones. Add one
                  student-only offer and we&apos;ll build the listing for you.{" "}
                  <span className="text-ink font-semibold">Free, and you keep every sale.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="#your-deal"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base bg-primary text-ink shadow-lg shadow-primary/25 hover:brightness-105 transition-all"
                  >
                    Add your deal
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  </Link>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base text-primary-dark border-2 border-primary/40 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    Ask us first
                  </a>
                </div>

                <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted">
                  {["No credit card", "No cut of your sales", "No POS or hardware", "About 5 minutes"].map((p) => (
                    <li key={p} className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-primary-dark" />
                      {p}
                    </li>
                  ))}
                </ul>
              </AnimatedSection>
            </div>

            <div className="lg:col-span-5">
              <AnimatedSection delay={0.15} variant="fade-left">
                <Parallax distance={26}>
                  <CouponFan deals={deals} />
                </Parallax>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Campuses ─────────────────────────────────────────
          The H1 says "your university's", so answer "is mine one of them?"
          before anything else. Live from the API: names only, never crests. */}
      {universities.length > 0 && (
        <section className="border-y border-gray-100 bg-white overflow-hidden">
          <div className="py-8 md:py-12">
            <AnimatedSection>
              <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary-dark mb-7 px-6">
                Live on {universities.length} campuses
              </p>
            </AnimatedSection>
            <CampusStrip universities={universities} />
          </div>
        </section>
      )}

      {/* ─── What happens next ────────────────────────────────
          The video is step 3 actually happening, so it carries this section
          and the steps become the caption beside it. */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-primary/12 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <div className="relative flex justify-center">
                {/* A warm ring behind the phone so it lifts off the ink. */}
                <div className="absolute -inset-8 bg-gradient-to-tr from-primary/25 via-emerald-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                <Parallax distance={24} className="relative">
                  <AutoLoopVideo
                    src="/videos/bizzy-slice.mp4"
                    poster="/images/bizzy-slice-poster.jpg"
                    label="A student shows a deal on their phone at the counter of a local pizzeria near campus, and walks away with a slice."
                    className="w-[270px] sm:w-[310px] rounded-[2rem] ring-1 ring-white/15 shadow-2xl shadow-black/50"
                  />
                </Parallax>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.1} variant="fade-left">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">
                What happens next
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                Post a Discount. Students Come{" "}
                <span className="marker-sticker">
                  <span>In Store</span>
                </span>
                .
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-9 max-w-lg">
                Send us one offer and we handle the listing. It lands in the coupon book students
                already carry, and then this happens.
              </p>

              <ol className="space-y-5">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex items-start gap-4">
                    <span
                      className="w-8 h-8 rounded-lg bg-primary text-ink text-sm font-bold flex items-center justify-center flex-shrink-0"
                      aria-hidden
                    >
                      {s.n}
                    </span>
                    <div>
                      <h3 className="font-bold text-white leading-snug">{s.t}</h3>
                      <p className="text-white/50 text-sm leading-relaxed mt-0.5">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─── The only requirement ─────────────────────────────
          The rule holds the left at size; the two cards sit tight on the
          right. No dividers: bordered lists read as terms and conditions, and
          this is a conversion page. */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-10 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[11fr_9fr] gap-10 lg:gap-14 items-center">
            {/* The rule, 55% */}
            <div>
              <AnimatedSection>
                <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">
                  The only requirement
                </p>
                {/* Ink, never muted, and only under the one word that matters.
                    The highlighter sits UNDER dark letters; beneath grey ones
                    the band reads as a strikethrough, which on this sentence
                    would say the exact opposite of the rule. */}
                <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-ink tracking-tight leading-[1.05] mb-5">
                  Make it <span className="marker-underline marker-draw">exclusive</span> to Bizzy.
                </h2>
                <p className="text-lg text-muted leading-relaxed max-w-lg">
                  The offer should only be available through Bizzy. If students can get the same deal
                  elsewhere, there is no reason to open the app.
                </p>
              </AnimatedSection>
            </div>

            {/* The examples, 45% */}
            <div className="space-y-4">
              <AnimatedSection delay={0.1}>
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm shadow-black/[0.03]">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-ink" />
                    </div>
                    <h3 className="font-bold text-ink text-sm">Good Bizzy offers</h3>
                  </div>
                  <ul className="space-y-2">
                    {QUALIFIES.map((item) => (
                      <li key={item} className="text-sm text-ink leading-snug">
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
                    <h3 className="font-bold text-muted text-sm">Not exclusive enough</h3>
                  </div>
                  <ul className="space-y-2">
                    {DOES_NOT.map((item) => (
                      <li key={item} className="text-sm text-muted leading-snug">
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

      {/* ─── The form ─────────────────────────────────────────── */}
      <section id="your-deal" className="relative overflow-hidden bg-white">
        {/* The page ends on its loudest section, not its palest: green washes
            down from the top edge over the bulletin texture, and the preview
            card is dark, so the form reads as the destination. */}
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(100%_55%_at_50%_0%,black,transparent_75%)] [-webkit-mask-image:radial-gradient(100%_55%_at_50%_0%,black,transparent_75%)] pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(85%_45%_at_50%_0%,rgba(5,235,84,0.16),transparent_65%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-24">
          <AnimatedSection>
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight mb-3">
                Build your <span className="marker-underline marker-draw">deal</span>.
              </h2>
              <p className="text-muted leading-relaxed">
                Watch it build itself as you type, exactly as students will see it. We review every
                listing to keep the book worth opening, then post it for you.
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.08}>
            <SignupFlow universities={universities} />
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Help ─────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 py-8 px-6">
        <AnimatedSection>
        <p className="text-center text-sm text-muted">
          Questions first?{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary-dark font-semibold hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        </AnimatedSection>
      </section>
    </main>
  );
}
