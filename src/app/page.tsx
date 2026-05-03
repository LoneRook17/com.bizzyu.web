import type { Metadata } from "next";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import JsonLd from "@/components/seo/JsonLd";
import { APP_STORE_URL, CALENDLY_DEMO_URL, STUDENT_FAQ } from "@/lib/constants";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: STUDENT_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export const metadata: Metadata = {
  title: "Bizzy — Your Campus, All in One App",
  description:
    "Bizzy is the campus app that connects students with events, tickets, deals, and local spots near their school.",
  alternates: {
    canonical: "https://bizzyu.com/",
  },
};

const STUDENT_FEATURES = [
  { title: "Find events near campus", desc: "Browse what's happening this week, this weekend, or tonight." },
  { title: "Buy tickets in the app", desc: "Tap to grab a ticket. No third-party platforms, no extra apps." },
  { title: "Skip lines at venues", desc: "Walk past the wait at participating spots near your school." },
  { title: "Unlock exclusive deals", desc: "Bizzy-only offers from the places you actually go." },
  { title: "Discover local spots", desc: "Restaurants, bars, and student-friendly spots in one feed." },
];

const BUSINESS_FEATURES = [
  { title: "List your business", desc: "Get on the map with the students near you." },
  { title: "Add exclusive deals", desc: "Create offers students can only find on Bizzy." },
  { title: "Create events", desc: "Publish events to a built-in student audience." },
  { title: "Sell tickets", desc: "In-app tickets, line skip, and cover — keep 100%." },
  { title: "Promote to students", desc: "Reach students through campus marketing channels." },
  { title: "Merchant portal", desc: "Manage everything from one simple dashboard." },
];

const EVENT_FEATURES = [
  { title: "Event discovery", desc: "Curated for each campus and updated weekly." },
  { title: "In-app tickets", desc: "Buy, store, and scan tickets right in Bizzy." },
  { title: "Line skip", desc: "Cut the wait with line skip at participating venues." },
  { title: "Door & event tools", desc: "Scanning, cover, and staff access for venues." },
];

const DEAL_FEATURES = [
  { title: "Food deals", desc: "BOGO meals, meal deals, and student-only specials." },
  { title: "Drink deals", desc: "Offers at local cafés, bars, and hangout spots." },
  { title: "Entertainment deals", desc: "Discounts on the things students do for fun." },
  { title: "Local student offers", desc: "Built specifically for the college audience." },
  { title: "Bizzy-only deals", desc: "Offers you won't find on any other app." },
];

const PROOF_STATS = [
  { value: "25,000+", label: "Student users" },
  { value: "400+", label: "Local businesses" },
  { value: "Expanding", label: "Nationwide" },
  { value: "0%", label: "Venue platform fees" },
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`text-primary ${className}`}
      width="20"
      height="20"
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

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full hover:-translate-y-1 hover:border-primary/30 transition-all duration-300">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">
          <CheckIcon className="w-4 h-4" />
        </div>
        <h3 className="text-lg font-semibold text-ink leading-snug pt-1.5">{title}</h3>
      </div>
      <p className="text-muted text-sm leading-relaxed pl-12">{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd data={faqJsonLd} />

      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="!py-12 md:!py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center">
            <AnimatedSection immediate>
              <div className="max-w-xl">
                <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-xs md:text-sm font-semibold mb-6 tracking-wide">
                  Events • Tickets • Deals • Local Spots
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                  Your campus,{" "}
                  <span className="text-primary">all in one app.</span>
                </h1>
                <p className="text-lg text-muted mb-8 max-w-md leading-relaxed">
                  Find events, buy tickets, skip lines, and unlock local deals near your school.
                </p>
                <div className="flex flex-wrap gap-3 mb-8">
                  <Button href={APP_STORE_URL} variant="primary" size="md" external>
                    Explore Bizzy
                  </Button>
                  <Button href="/businesses" variant="outline" size="md">
                    List Your Business
                  </Button>
                </div>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                  aria-label="Download Bizzy on the App Store"
                >
                  <svg width="160" height="54" viewBox="0 0 160 54" className="hover:opacity-80 transition-opacity">
                    <rect width="160" height="54" rx="10" fill="#000" />
                    <g transform="translate(18, 10) scale(0.065)">
                      <path fill="#fff" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-62.1 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                    </g>
                    <text x="92" y="22" fill="#fff" fontSize="10" fontFamily="system-ui" textAnchor="middle">Download on the</text>
                    <text x="92" y="38" fill="#fff" fontSize="16" fontWeight="600" fontFamily="system-ui" textAnchor="middle">App Store</text>
                  </svg>
                </a>
              </div>
            </AnimatedSection>

            {/* Floating phone screens */}
            <AnimatedSection delay={0.2} className="flex justify-center">
              <div className="relative w-full h-[440px] lg:h-[580px]">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[240px] lg:w-[280px] z-10 animate-float">
                  <Image
                    src="/images/screen-2.png"
                    alt="Bizzy home feed"
                    width={280}
                    height={600}
                    className="rounded-[2rem]"
                    priority
                  />
                </div>
                <div
                  className="absolute left-0 lg:-left-4 top-14 w-[200px] lg:w-[240px] animate-float -rotate-6 opacity-90"
                  style={{ animationDelay: "0.5s" }}
                >
                  <Image
                    src="/images/screen-5.png"
                    alt="Bizzy events screen"
                    width={240}
                    height={520}
                    className="rounded-[2rem]"
                  />
                </div>
                <div
                  className="absolute right-0 lg:-right-4 top-18 w-[200px] lg:w-[240px] animate-float rotate-6 opacity-90"
                  style={{ animationDelay: "1s" }}
                >
                  <Image
                    src="/images/screen-3.png"
                    alt="Bizzy deal detail screen"
                    width={240}
                    height={520}
                    className="rounded-[2rem]"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* 2. Student section */}
      <SectionContainer>
        <AnimatedSection>
          <div className="max-w-2xl mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wide mb-3">For Students</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Everything students need near campus.
            </h2>
            <p className="text-muted text-lg leading-relaxed">
              Bizzy helps students discover what is happening around their school, from events and tickets to exclusive deals and local spots.
            </p>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STUDENT_FEATURES.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 0.05}>
              <FeatureCard title={f.title} desc={f.desc} />
            </AnimatedSection>
          ))}
        </div>
      </SectionContainer>

      {/* 3. Business section */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="max-w-2xl mb-12">
              <p className="text-primary text-sm font-semibold uppercase tracking-wide mb-3">For Businesses</p>
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Reach students where they already are.
              </h2>
              <p className="text-muted text-lg leading-relaxed">
                Bizzy helps local businesses and venues connect with nearby students, promote offers, sell tickets, and drive real foot traffic.
              </p>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BUSINESS_FEATURES.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.05}>
                <FeatureCard title={f.title} desc={f.desc} />
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.2}>
            <div className="flex flex-wrap gap-3 mt-10">
              <Button href="/businesses" variant="primary" size="md">
                List Your Business
              </Button>
              <Button href={CALENDLY_DEMO_URL} variant="outline" size="md" external>
                Book a Call
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* 4. Events / ticketing */}
      <SectionContainer>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <AnimatedSection>
            <div className="max-w-xl">
              <p className="text-primary text-sm font-semibold uppercase tracking-wide mb-3">Events & Tickets</p>
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Events and tickets built into campus life.
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-8">
                Students can discover events, buy tickets, and access line skip directly through Bizzy.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EVENT_FEATURES.map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-ink font-semibold text-sm">{f.title}</p>
                      <p className="text-muted text-sm">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.15} variant="fade-left" className="flex justify-center">
            <div className="relative w-full max-w-md h-[460px]">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[240px] z-10">
                <Image
                  src="/images/screen-5.png"
                  alt="Bizzy events feed"
                  width={240}
                  height={520}
                  className="rounded-[2rem] shadow-2xl"
                />
              </div>
              <div className="absolute right-2 top-12 w-[200px] rotate-6 opacity-90">
                <Image
                  src="/images/screen-6.png"
                  alt="Bizzy event ticket"
                  width={200}
                  height={440}
                  className="rounded-[2rem] shadow-xl"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* 5. Deals / local spots */}
      <section className="bg-gray-50">
        <SectionContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <AnimatedSection variant="fade-right" className="flex justify-center order-2 lg:order-1">
              <div className="relative w-full max-w-md h-[460px]">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[240px] z-10">
                  <Image
                    src="/images/screen-3.png"
                    alt="Bizzy deal detail"
                    width={240}
                    height={520}
                    className="rounded-[2rem] shadow-2xl"
                  />
                </div>
                <div className="absolute left-2 top-12 w-[200px] -rotate-6 opacity-90">
                  <Image
                    src="/images/screen-4d.png"
                    alt="Bizzy deal redeemed"
                    width={200}
                    height={440}
                    className="rounded-[2rem] shadow-xl"
                  />
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection className="order-1 lg:order-2">
              <div className="max-w-xl">
                <p className="text-primary text-sm font-semibold uppercase tracking-wide mb-3">Deals & Local Spots</p>
                <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                  Local deals students actually use.
                </h2>
                <p className="text-muted text-lg leading-relaxed mb-8">
                  Bizzy gives students access to exclusive local deals from restaurants, bars, entertainment venues, and businesses near campus.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DEAL_FEATURES.map((f) => (
                    <div key={f.title} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-ink font-semibold text-sm">{f.title}</p>
                        <p className="text-muted text-sm">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* 6. Proof */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Built for real college town activity.
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Real students, real local businesses, expanding nationwide.
            </p>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {PROOF_STATS.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.05}>
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 text-center h-full">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted text-sm md:text-base">{stat.label}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Chartwells partnership badge */}
        <AnimatedSection delay={0.2}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 bg-white rounded-2xl border border-gray-100 px-6 py-5 md:py-6 max-w-2xl mx-auto">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-muted">
              Proudly partnered with
            </p>
            <div className="flex items-center gap-3">
              <span
                className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Chartwells
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-primary" aria-hidden />
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* 7. Final CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center !py-16 md:!py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Bring Bizzy to your campus.
            </h2>
            <p className="text-white/90 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
              Whether you are a student, business, or venue, Bizzy helps connect campus life in one place.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button href={APP_STORE_URL} variant="white" size="lg" external>
                Explore Bizzy
              </Button>
              <Button href="/businesses" variant="white" size="lg">
                List Your Business
              </Button>
              <Button href={CALENDLY_DEMO_URL} variant="white" size="lg" external>
                Book a Call
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
