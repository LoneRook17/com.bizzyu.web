import type { Metadata } from "next";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import { CONTACT_EMAIL } from "@/lib/constants";

const CALENDLY_URL =
  "https://calendly.com/partnerships-bizzyu/bizzy-bar-intro";

export const metadata: Metadata = {
  title: "Bizzy for College Bars — 0% Fees on Events & Ticketing",
  description:
    "Sell tickets, collect cover, and pack your bar with college students — all with 0% fees. Tap to Pay at the door. Powered by Stripe.",
  alternates: {
    canonical: "https://bizzyu.com/events",
  },
  openGraph: {
    title: "Bizzy for College Bars — 0% Fees on Events & Ticketing",
    description:
      "Sell tickets, collect cover, and pack your bar with college students — all with 0% fees. Tap to Pay at the door. Powered by Stripe.",
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
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: "Tap to Pay",
    description:
      "Accept cover charges and payments at the door with just your phone. No extra hardware needed.",
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
        <path d="M15 5v2" />
        <path d="M15 11v2" />
        <path d="M15 17v2" />
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 22h6" />
      </svg>
    ),
    title: "In-App Ticketing",
    description:
      "Students discover, RSVP, or buy tickets directly inside the Bizzy app. No third-party links.",
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
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Skip the Line",
    description:
      "Let students pay for express entry — a brand-new revenue stream for your bar. Powered by Stripe with 0% Bizzy fees.",
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
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "0% Fees — Keep Every Dollar",
    description:
      "Powered by Stripe. Bizzy never takes a cut of your ticket sales or cover charges. Zero fees, ever.",
  },
];

export default function EventsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="max-w-xl">
                <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                  0% Fees. 100% Yours.
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                  Turn every college student nearby into a{" "}
                  <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                    paying customer.
                  </span>
                </h1>
                <p className="text-lg text-muted mb-8 max-w-md leading-relaxed">
                  Sell tickets, collect cover at the door with Tap to Pay, and
                  keep every dollar — 0% fees, powered by Stripe. Bizzy puts
                  your events in front of thousands of students nearby.
                </p>
                <Button href={CALENDLY_URL} size="lg" external>
                  Book a Call
                </Button>
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

      {/* Features */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Everything you need to run events
            </h2>
            <p className="text-muted text-lg">
              Ticketing, payments, and promotion — all in one place.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
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

      {/* Skip the Line Explainer */}
      <section className="bg-gray-50">
        <SectionContainer className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                  A new revenue stream — built into every event
                </h2>
                <p className="text-muted text-lg">
                  Skip the Line lets students pay for express entry. You keep
                  every dollar.
                </p>
              </div>
            </AnimatedSection>

            <div className="space-y-8">
              <AnimatedSection delay={0.1}>
                <div className="flex gap-5 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-ink mb-1">
                      You set a Skip the Line price
                    </h3>
                    <p className="text-muted text-base">
                      Add an express entry tier to any event in seconds. You
                      choose the price — $5, $10, $20, whatever works for your
                      venue.
                    </p>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.2}>
                <div className="flex gap-5 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-ink mb-1">
                      Students pay in-app
                    </h3>
                    <p className="text-muted text-base">
                      They buy priority entry before they arrive. No cash, no
                      awkward upsells at the door — just a seamless checkout in
                      the Bizzy app.
                    </p>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.3}>
                <div className="flex gap-5 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-ink mb-1">
                      Money hits your Stripe account each night
                    </h3>
                    <p className="text-muted text-base">
                      Every dollar goes directly to you. Bizzy takes 0% — zero
                      fees, ever. All revenue flows straight into your Stripe
                      account.
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-24">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to pack your bar?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Book a quick call and we&apos;ll get you set up in minutes. 0%
              fees, no contracts, no catch.
            </p>
            <Button href={CALENDLY_URL} variant="white" size="lg" external>
              Book a Call
            </Button>
            <p className="mt-6 text-white/60 text-sm">
              Or email us directly at{" "}
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
