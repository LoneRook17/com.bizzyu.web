import type { Metadata } from "next";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import EventsHowItWorks from "@/components/events/EventsHowItWorks";
import { EVENTS_FAQ, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sell Event Tickets & Fill Your Venue — Bizzy",
  description:
    "Bizzy helps local bars, restaurants, and venues sell tickets and manage door entry for college students. Zero monthly fees. You keep 100% of ticket revenue.",
  alternates: {
    canonical: "https://bizzyu.com/events",
  },
  openGraph: {
    title: "Sell Event Tickets & Fill Your Venue — Bizzy",
    description:
      "Bizzy helps local bars, restaurants, and venues sell tickets and manage door entry for college students. Zero monthly fees. You keep 100% of ticket revenue.",
  },
};

const FEATURES = [
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#05EB54"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 5v2" />
        <path d="M15 11v2" />
        <path d="M15 17v2" />
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 22h6" />
      </svg>
    ),
    title: "Flexible ticket tiers",
    description:
      "Set early-bird pricing, VIP tiers, guest lists, and per-person caps. Charge what you want.",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#05EB54"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 7h.01" />
        <path d="M17 7h.01" />
        <path d="M7 17h.01" />
        <path d="M17 17h.01" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
    title: "Built-in door scanner",
    description:
      "Free web-based QR scanner works on any phone. Gold-flag Line Skip passes so door staff know at a glance.",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#05EB54"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: "Tap-to-pay at the door",
    description:
      "Accept cash-equivalent payments at the door with Bizzy Terminal. No card reader hardware needed — use your phone.",
  },
];

const LINE_SKIP_POINTS = [
  "Cover included, guaranteed entry — Line Skip price IS the cover charge. Students skip the line and walk in.",
  "Recurring schedules — Set a weekly or nightly pattern and Bizzy auto-generates instances. No manual work per night.",
  "Scan with any phone\u2019s camera — Students hold up their QR, staff point any iPhone or Android camera at it, the Bizzy check-in page opens automatically. No app install, no separate scanner hardware.",
];

export default function EventsPage() {
  return (
    <>
      {/* A — Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="max-w-xl">
                <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                  0% Fees. 100% Yours.
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                  Pack your bar with{" "}
                  <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                    college students.
                  </span>
                </h1>
                <p className="text-lg text-muted mb-8 max-w-md leading-relaxed">
                  Sell tickets, collect cover at the door with Tap to Pay, and
                  keep every dollar — 0% fees, powered by Stripe. Bizzy puts
                  your events in front of thousands of students nearby.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    href="https://calendly.com/partnerships-bizzyu/bizzy-bar-intro"
                    size="lg"
                    external
                  >
                    Book a Demo
                  </Button>
                  <Button href="#how-it-works" variant="outline" size="lg">
                    See How It Works
                  </Button>
                </div>
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

      {/* B — How Events Work on Bizzy */}
      <EventsHowItWorks />

      {/* C — Feature Highlights */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Everything you need to run events
            </h2>
            <p className="text-muted text-lg">
              Ticketing, payments, and door management — all in one place.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {FEATURES.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.1}>
              <div className="bg-white rounded-2xl p-8 border border-gray-100 h-full hover:-translate-y-1 transition-transform duration-300 text-center">
                <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-ink mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted text-base">{feature.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </SectionContainer>

      {/* D — Line Skips Feature Spotlight */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                New Feature
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Line Skips for Venue Nights
              </h2>
              <p className="text-lg text-muted mb-8 leading-relaxed">
                Bizzy Line Skips let bars and venues sell cover + guaranteed
                entry passes for recurring nights — every Friday, every
                Saturday, weekly trivia, whatever you run. Students pay cover in
                advance and walk up to a guaranteed spot. Gold-flagged tickets at
                the door so your staff knows at a glance they&apos;re Line Skip
                passes (not full event tickets). Set up a weekly schedule once
                and Bizzy auto-generates the instances.
              </p>
              <div className="space-y-4 mb-8">
                {LINE_SKIP_POINTS.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="#05EB54"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-ink text-base">{point}</span>
                  </div>
                ))}
              </div>
              <Button href="/business/signup" size="lg">
                Start Selling Line Skips
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* E — Fees / Transparency */}
      <SectionContainer>
        <AnimatedSection>
          <div className="bg-gradient-to-br from-primary to-emerald-500 rounded-3xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              0% Fees. 100% Yours.
            </h3>
            <p className="text-white/90 text-lg max-w-2xl leading-relaxed">
              No monthly fees, no platform cut, no per-ticket fees. You keep the
              full ticket face value, paid out through Stripe Connect. Refunds
              and cancellations are handled in your dashboard.
            </p>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* F — FAQ */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Frequently asked questions
              </h2>
              <p className="text-muted text-lg">
                Everything you need to know about events on Bizzy.
              </p>
            </div>
          </AnimatedSection>
          <FAQ items={EVENTS_FAQ} />
        </SectionContainer>
      </section>

      {/* G — Final CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-24">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to fill your room?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Create your Bizzy business account in 60 seconds. Free forever.
            </p>
            <Button href="/business/signup" variant="white" size="lg">
              Get Started Free
            </Button>
            <p className="mt-6 text-white/60 text-sm">
              Questions?{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-white/80 hover:text-white transition-colors underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
