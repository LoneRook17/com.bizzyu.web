import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FeatureCard from "@/components/ui/FeatureCard";
import PhoneMockup from "@/components/ui/PhoneMockup";
import DealTypeGrid from "@/components/ui/DealTypeGrid";

import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Marquee from "@/components/ui/Marquee";
import Button from "@/components/ui/Button";
import { APP_STORE_URL } from "@/lib/constants";

function DealsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function RankingsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 1012 0V2z" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="max-w-xl">
                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-4">
                  Live College
                  <br />
                  <span className="text-primary">For Less!</span>
                </h1>
                <p className="text-xl md:text-2xl text-ink/70 font-medium mb-2">
                  The Best Deals & Events Near Your Campus.
                </p>
                <p className="text-lg text-muted mb-8 leading-relaxed max-w-md">
                  Exclusive discounts on food, drinks, entertainment, and local
                  events - all in one app. Download Bizzy and start saving today.
                </p>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
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

            <AnimatedSection delay={0.2} className="flex justify-center">
              <PhoneMockup src="/images/bizzy-logo.png" alt="Bizzy app deals feed" />
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* Social Proof Marquee */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="text-center mb-4">
          <span className="text-sm font-semibold text-muted uppercase tracking-wider">
            Voted #1 By Students
          </span>
        </div>
        <Marquee
          items={[
            "FGCU - Fort Myers",
            "USF - Tampa",
            "UGA - Athens",
            "ASU - Tempe",
            "500+ Active Deals",
            "10,000+ Students",
            "$250K+ Saved",
          ]}
        />
      </section>

      {/* Features */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Everything campus life needs
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Deals, events, and a community of students all saving together.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AnimatedSection delay={0}>
            <FeatureCard
              icon={<DealsIcon />}
              title="Exclusive Deals"
              description="Access student-only discounts on food, drinks, entertainment, and more from local spots near your campus."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FeatureCard
              icon={<EventsIcon />}
              title="Local Events"
              description="Never miss what's happening. Find bar nights, campus activities, ticketed experiences, and everything in between."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <FeatureCard
              icon={<RankingsIcon />}
              title="Rankings & Rewards"
              description="Track how much you save, climb your school's leaderboard, and compete with friends."
            />
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* Deal Types */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Deals worth claiming
              </h2>
              <p className="text-muted text-lg max-w-2xl mx-auto">
                From BOGO to free items - real savings on the places you actually go.
              </p>
            </div>
          </AnimatedSection>
          <DealTypeGrid />
        </SectionContainer>
      </section>

      {/* Events Section */}
      <SectionContainer>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <AnimatedSection>
            <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
              New: Events Tab
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Never miss what&apos;s happening
            </h2>
            <p className="text-muted text-lg leading-relaxed mb-6">
              Discover everything going on around your campus - bar nights, live music,
              themed events, campus activities, and ticketed experiences. All in one place.
            </p>
            <div className="space-y-3">
              {[
                "Bar nights & drink specials",
                "Campus activities & club events",
                "Ticketed experiences & concerts",
                "Weekly recurring events",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-ink font-medium">{item}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="flex justify-center">
            <PhoneMockup src="/images/bizzy-logo.png" alt="Bizzy events tab" />
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* How It Works */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                How it works
              </h2>
              <p className="text-muted text-lg">
                Three steps to start saving.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Download Bizzy", desc: "Get the app free from the App Store and sign up with your school." },
              { step: "2", title: "Browse Deals & Events", desc: "Explore exclusive offers and upcoming events from local spots near campus." },
              { step: "3", title: "Claim & Save", desc: "Show the deal at checkout. It's that simple. Start saving instantly." },
            ].map((item, i) => (
              <AnimatedSection key={item.step} delay={i * 0.1}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-ink mb-3">{item.title}</h3>
                  <p className="text-muted max-w-xs mx-auto">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Stats */}
      <SectionContainer>
        <AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <AnimatedCounter end={500} suffix="+" />
              </div>
              <div className="text-muted text-sm font-medium">Active Deals</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <AnimatedCounter end={10} suffix="K+" />
              </div>
              <div className="text-muted text-sm font-medium">Students</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <AnimatedCounter prefix="$" end={250} suffix="K+" />
              </div>
              <div className="text-muted text-sm font-medium">Saved by Students</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <AnimatedCounter end={50} suffix="+" />
              </div>
              <div className="text-muted text-sm font-medium">Campus Partners</div>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* Dual CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to start saving?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Join thousands of students already using Bizzy to make college
              more affordable and more fun.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button href={APP_STORE_URL} variant="white" size="lg">
                Download Bizzy Free
              </Button>
              <Button href="/businesses" variant="outline" size="lg" className="!border-white !text-white hover:!bg-white/10">
                I&apos;m a Business
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
