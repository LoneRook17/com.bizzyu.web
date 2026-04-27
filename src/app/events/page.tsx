import type { Metadata } from "next";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import SavingsCalculator from "@/components/events/SavingsCalculator";
import StickyDemoCTA from "@/components/events/StickyDemoCTA";
import { EVENTS_FAQ, CALENDLY_DEMO_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sell Tickets, Cover & Line Skip — 0% Venue Fees | Bizzy",
  description:
    "Bizzy helps college bars sell tickets, line skip, and cover with 0% venue platform fees. Tap to Pay at the door, scan tickets, manage staff, and reach local students. Book a 15-min demo.",
  alternates: {
    canonical: "https://bizzyu.com/events",
  },
  openGraph: {
    title: "Sell Tickets, Cover & Line Skip — 0% Venue Fees | Bizzy",
    description:
      "Bizzy helps college bars keep 100% of ticket and cover revenue. Students pay the service fee at checkout.",
  },
};

const STATS = [
  { value: "15,000+", label: "Student downloads" },
  { value: "400+", label: "Businesses on Bizzy" },
  { value: "Multiple", label: "College markets active" },
  { value: "0%", label: "Venue platform fees" },
];

const PROBLEMS = [
  {
    title: "Platform fees cut into your upside",
    desc: "When a venue sells thousands in tickets, cover, or line skip, every percentage point matters.",
  },
  {
    title: "Slow doors cost money",
    desc: "Long lines, manual check-ins, and cash handling create friction right when demand is highest.",
  },
  {
    title: "Promoter tracking gets messy",
    desc: "Without clean promo codes and reporting, it's hard to know who actually drove sales.",
  },
  {
    title: "Students forget fast",
    desc: "If your events aren't in front of students consistently, another bar wins the night.",
  },
];

const FEATURES = [
  {
    title: "Sell tickets online",
    desc: "Create events with GA, early bird, tiered, VIP, or custom ticket types.",
  },
  {
    title: "Collect cover with Tap to Pay",
    desc: "Take cover at the door without extra hardware.",
  },
  {
    title: "Sell line skip",
    desc: "Let students pay for faster entry and premium access.",
  },
  {
    title: "Scan tickets fast",
    desc: "Door staff can check in guests quickly from their device.",
  },
  {
    title: "Assign door staff",
    desc: "Give team members controlled access to scan tickets and manage entry.",
  },
  {
    title: "Create promo codes",
    desc: "Track Greek life, influencers, promoters, ambassadors, and special campaigns.",
  },
  {
    title: "Live sales dashboard",
    desc: "See ticket sales, check-ins, revenue, and event performance in real time.",
  },
  {
    title: "Promote to students nearby",
    desc: "Put your events and deals inside a student app built for college towns.",
  },
  {
    title: "Add exclusive student deals",
    desc: "Drive repeat traffic on slower nights with Bizzy-only deals.",
  },
  {
    title: "Direct Stripe payouts",
    desc: "Your ticket and cover revenue flows through Stripe.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "1",
    title: "Book a quick demo",
    desc: "We learn how your venue currently handles ticketing, cover, line skip, and door staff.",
  },
  {
    num: "2",
    title: "We set up your venue",
    desc: "We help build your profile, events, ticket tiers, promo codes, staff access, and Stripe payout flow.",
  },
  {
    num: "3",
    title: "Run your first night",
    desc: "Sell tickets, collect cover, scan guests, manage entry, and track performance live.",
  },
  {
    num: "4",
    title: "Keep students coming back",
    desc: "Use events, exclusive deals, and campus marketing to stay in front of local students.",
  },
];

const USE_CASES = [
  "Weekly cover nights",
  "Line skip",
  "DJ nights",
  "Artist appearances",
  "Greek life events",
  "Bar crawls",
  "Theme nights",
  "VIP packages",
  "Free RSVP events",
  "Promoter-driven events",
  "Tailgate weekends",
  "Rivalry weekends",
  "Spring break events",
  "Graduation week events",
];

const MARKETING_BENEFITS = [
  {
    title: "Reach students where they discover deals and events",
    desc: "Your venue can appear inside the Bizzy app for nearby students.",
  },
  {
    title: "Promote events by campus",
    desc: "Create campus-specific campaigns for the students most likely to show up.",
  },
  {
    title: "Use deals to drive off-night traffic",
    desc: "Add exclusive Bizzy-only deals to bring students in before big events or during slower nights.",
  },
  {
    title: "Track what actually works",
    desc: "Use ticket sales, check-ins, promo codes, and claims to understand what drives traffic.",
  },
];

const NIGHTLIFE_REACH = [
  {
    title: "Influencer-driven events",
    desc: "Bring recognizable names and creators into college nightlife markets.",
  },
  {
    title: "Promotion support",
    desc: "Help top partner venues package events, create buzz, and push student attendance.",
  },
  {
    title: "Venue growth network",
    desc: "Connect bars with opportunities beyond ticketing, from talent nights to campus campaigns.",
  },
];

const COMPARISON = [
  { feature: "Takes a cut of your sales", bizzy: "No", others: "Often" },
  { feature: "Online ticketing", bizzy: "Yes", others: "Yes" },
  { feature: "Line skip", bizzy: "Yes", others: "Yes" },
  { feature: "Tap to Pay cover", bizzy: "Yes", others: "Sometimes" },
  { feature: "Ticket scanning", bizzy: "Yes", others: "Yes" },
  { feature: "Door staff access", bizzy: "Yes", others: "Sometimes" },
  { feature: "Promo codes", bizzy: "Yes", others: "Yes" },
  { feature: "Student marketing app", bizzy: "Yes", others: "Limited" },
  { feature: "Exclusive student deals", bizzy: "Yes", others: "Usually no" },
  { feature: "Direct Stripe payouts", bizzy: "Yes", others: "Varies" },
  { feature: "Student-paid service fee", bizzy: "Yes", others: "Usually yes" },
];

const FOUNDING_PERKS = [
  "0% venue platform fees",
  "Free event setup",
  "Free staff onboarding",
  "Featured placement in the Bizzy app",
  "Launch marketing support",
  "Promo code setup",
  "Direct Stripe payout support",
  "Early access to new features",
  "Priority support during launch events",
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 flex-shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DemoButton({
  variant = "primary",
  size = "lg",
  className = "",
  children = "Book a 15-Min Demo",
}: {
  variant?: "primary" | "outline" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Button
      href={CALENDLY_DEMO_URL}
      external
      variant={variant}
      size={size}
      className={className}
    >
      {children}
    </Button>
  );
}

export default function EventsPage() {
  return (
    <>
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="max-w-xl">
                <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                  0% Venue Fees. 100% of Sales.
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                  Sell tickets, run cover, and{" "}
                  <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                    keep 100% of your sales.
                  </span>
                </h1>
                <p className="text-lg text-muted mb-8 leading-relaxed">
                  Bizzy helps college bars sell tickets, line skip, and cover,
                  manage door staff, scan tickets, and use Tap to Pay. Your
                  venue pays 0% platform fees and keeps 100% of ticket and
                  cover revenue. Students pay the service fee at checkout.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <DemoButton />
                  <Button href="#how-it-works" variant="outline" size="lg">
                    See How It Works
                  </Button>
                </div>
                <p className="mt-6 text-sm text-muted">
                  Free setup. Direct Stripe payouts. Built for college bars
                  and nightlife operators.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2} className="flex justify-center">
              <div className="flex gap-6">
                <div className="w-[180px] md:w-[220px] -rotate-3">
                  <Image
                    src="/images/screens/6.png"
                    alt="Bizzy event ticket tiers"
                    width={220}
                    height={470}
                    className="rounded-2xl shadow-xl w-full"
                  />
                </div>
                <div className="w-[180px] md:w-[220px] rotate-3 mt-8">
                  <Image
                    src="/images/screens/5.png"
                    alt="Bizzy event ticket purchase with Apple Pay"
                    width={220}
                    height={470}
                    className="rounded-2xl shadow-xl w-full"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* Section 2 — Savings calculator */}
      <section className="bg-gray-50 border-y border-gray-100">
        <SectionContainer className="py-16 md:py-20">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-3">
                See what you could keep with Bizzy.
              </h2>
              <p className="text-muted">
                Plug in your monthly volume and current platform fee. The
                difference is what stays with your venue.
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="max-w-4xl mx-auto">
              <SavingsCalculator />
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 3 — Proof strip */}
      <section className="border-y border-gray-100 bg-white">
        <SectionContainer className="py-12 md:py-16">
          <AnimatedSection>
            <p className="text-center text-sm font-semibold uppercase tracking-wider text-muted mb-8">
              Built for college towns. Direct payouts via Stripe.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-5xl font-bold text-ink mb-2">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 4 — Problem */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Stop losing venue revenue to ticketing platforms.
              </h2>
              <p className="text-lg text-muted">
                Most college bars are forced to choose between clunky door
                systems, high platform fees, slow lines, and weak student
                marketing. Bizzy gives you the tools without taking a cut from
                your venue.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {PROBLEMS.map((p, i) => (
              <AnimatedSection key={p.title} delay={i * 0.05}>
                <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 h-full">
                  <h3 className="text-lg font-bold text-ink mb-2">
                    {p.title}
                  </h3>
                  <p className="text-muted">{p.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Section 5 — Feature grid */}
      <section id="features">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Everything your venue needs to run a packed night.
              </h2>
              <p className="text-lg text-muted">
                Ticketing, line skip, Tap to Pay, scanning, door staff, promo
                codes, and student marketing — all in one platform.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {FEATURES.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.04}>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full hover:-translate-y-1 hover:border-primary/30 transition-all duration-300">
                  <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center mb-4">
                    <CheckIcon className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-ink mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Section 6 — How it works */}
      <section id="how-it-works">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Launch your first event in days.
              </h2>
              <p className="text-lg text-muted">
                Onboarding is hands-on. We help you get live without the
                headache.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {HOW_IT_WORKS.map((step, i) => (
              <AnimatedSection key={step.num} delay={i * 0.08}>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold mb-4">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection>
            <div className="text-center">
              <DemoButton>Book your first setup call</DemoButton>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 7 — Built for college nightlife */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Built for every kind of college night.
              </h2>
              <p className="text-lg text-muted">
                Whether you charge cover every weekend or only ticket special
                events, Bizzy helps you sell, scan, collect, and promote from
                one place.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {USE_CASES.map((u) => (
                <span
                  key={u}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink"
                >
                  {u}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 8 — Student marketing advantage */}
      <section>
        <SectionContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                  Ticketing plus student demand.
                </h2>
                <p className="text-lg text-muted mb-8 leading-relaxed">
                  Bizzy isn&apos;t just a checkout link. Your events and deals
                  live inside a student app built to drive local college
                  traffic.
                </p>
                <div className="space-y-5">
                  {MARKETING_BENEFITS.map((b) => (
                    <div key={b.title} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckIcon className="text-primary w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink mb-1">
                          {b.title}
                        </h3>
                        <p className="text-sm text-muted leading-relaxed">
                          {b.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <DemoButton>See the student marketing system</DemoButton>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.15} className="flex justify-center">
              <div className="flex gap-6">
                <div className="w-[180px] md:w-[220px] rotate-2">
                  <Image
                    src="/images/screens/2.png"
                    alt="Bizzy student app deals feed"
                    width={220}
                    height={470}
                    className="rounded-2xl shadow-xl w-full"
                  />
                </div>
                <div className="w-[180px] md:w-[220px] -rotate-2 mt-8">
                  <Image
                    src="/images/screens/3.png"
                    alt="Bizzy student app events feed"
                    width={220}
                    height={470}
                    className="rounded-2xl shadow-xl w-full"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* Section 9 — Nightlife reach (Dadbod Hospitality) */}
      <section className="bg-gradient-to-br from-primary-light/30 via-white to-white">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center px-4 py-1.5 bg-white border border-primary/20 rounded-full text-primary text-sm font-semibold mb-6">
                Powered by Dadbod Hospitality
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                More than software. Real college nightlife reach.
              </h2>
              <p className="text-lg text-muted leading-relaxed">
                Through Dadbod Hospitality, our team has helped bring talent,
                influencers, and high-attention events to college venues. For
                top Bizzy partner bars, this creates another advantage: access
                to people, promotions, and event concepts that can help drive
                real student turnout.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
            {NIGHTLIFE_REACH.map((card, i) => (
              <AnimatedSection key={card.title} delay={i * 0.08}>
                <div className="bg-white rounded-2xl p-6 md:p-7 border border-gray-100 h-full">
                  <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center mb-4">
                    <CheckIcon className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-ink mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection>
            <div className="text-center">
              <DemoButton>Book a Demo to Learn More</DemoButton>
              <p className="mt-6 text-sm text-muted">
                Follow{" "}
                <a
                  href="https://instagram.com/dadbodhospitality"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink font-semibold hover:text-primary transition-colors"
                >
                  @dadbodhospitality
                </a>{" "}
                and{" "}
                <a
                  href="https://instagram.com/Bizzy.University"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink font-semibold hover:text-primary transition-colors"
                >
                  @Bizzy.University
                </a>{" "}
                on Instagram.
              </p>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 10 — Comparison */}
      <section>
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Same core tools. Better venue economics.
              </h2>
              <p className="text-lg text-muted">
                Bizzy gives your venue ticketing, line skip, Tap to Pay cover,
                ticket scanning, door staff access, promo codes, direct Stripe
                payouts, and student marketing without taking a cut of your
                ticket or cover sales.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-muted">
                        Feature
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-bold text-primary">
                        Bizzy
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-muted">
                        Traditional platforms
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => (
                      <tr
                        key={row.feature}
                        className={`border-b border-gray-100 last:border-0 ${
                          i % 2 === 1 ? "bg-gray-50/40" : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-ink text-sm">
                          {row.feature}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-primary">
                          {row.bizzy}
                        </td>
                        <td className="px-6 py-4 text-center text-muted">
                          {row.others}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="text-center mt-10">
              <DemoButton>Compare your current setup</DemoButton>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 11 — Social proof */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Built with college venues, students, and local businesses.
              </h2>
              <p className="text-lg text-muted">
                Want to be one of the first venues in your market?
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-10">
            {[
              { value: "15,000+", label: "Student downloads" },
              { value: "400+", label: "Businesses on Bizzy" },
              { value: "Multiple", label: "College markets" },
              { value: "1000s", label: "Deal claims & event interactions" },
            ].map((s) => (
              <AnimatedSection key={s.label}>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center h-full">
                  <p className="text-3xl md:text-4xl font-bold text-ink mb-2">
                    {s.value}
                  </p>
                  <p className="text-sm text-muted">{s.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection>
            <div className="text-center">
              <DemoButton>Become a founding venue</DemoButton>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 12 — Founding Venue Program */}
      <section>
        <SectionContainer>
          <AnimatedSection>
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-ink to-gray-900 rounded-3xl p-8 md:p-12 text-white">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary/20 text-primary rounded-full text-sm font-semibold mb-6">
                Founding Venue Program
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Become a founding Bizzy venue in your college market.
              </h2>
              <p className="text-white/80 text-lg mb-8 leading-relaxed">
                We&apos;re onboarding select college bars before fall.
                Founding venues get free setup, launch support, featured
                placement, and early access to new nightlife tools.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {FOUNDING_PERKS.map((perk) => (
                  <div key={perk} className="flex items-start gap-3">
                    <CheckIcon className="text-primary mt-0.5" />
                    <span className="text-white/90">{perk}</span>
                  </div>
                ))}
              </div>
              <DemoButton>Apply for Founding Venue Access</DemoButton>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Section 13 — FAQ */}
      <section id="faq" className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Frequently asked questions
              </h2>
              <p className="text-muted text-lg">
                Everything you need to know about Bizzy for venues.
              </p>
            </div>
          </AnimatedSection>
          <FAQ items={EVENTS_FAQ} />
        </SectionContainer>
      </section>

      {/* Section 14 — Final CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-24">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to keep 100% of your ticket and cover sales?
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Book a 15-minute demo and we&apos;ll show you how Bizzy can help
              your venue sell tickets, run line skip, collect cover with Tap
              to Pay, manage door staff, and reach local students with 0%
              venue platform fees.
            </p>
            <DemoButton variant="white" />
            <p className="mt-6 text-white/70 text-sm">
              Free setup. Student-paid service fees. Direct Stripe payouts.
              Built for college bars.
            </p>
          </AnimatedSection>
        </SectionContainer>
      </section>

      <StickyDemoCTA />
    </>
  );
}
