import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FeatureCard from "@/components/ui/FeatureCard";
import DealTypeGrid from "@/components/ui/DealTypeGrid";
import CampusGrid from "@/components/ui/CampusGrid";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import { APP_STORE_URL, STUDENT_FAQ } from "@/lib/constants";

export const metadata: Metadata = {
  title: "For Students",
  description:
    "Discover exclusive college deals, local events, and save money on food, drinks, and entertainment near your campus with Bizzy.",
  openGraph: {
    title: "For Students | Bizzy",
    description:
      "Exclusive deals, events, and experiences near your campus. Download Bizzy free.",
  },
};

function TagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TrophyIcon() {
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

function MapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export default function StudentsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                Free on the App Store
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                Your campus.
                <br />
                Your deals.
                <br />
                <span className="text-primary">Your way.</span>
              </h1>
              <p className="text-lg text-muted mb-8 max-w-xl mx-auto leading-relaxed">
                Stop paying full price for everything. Bizzy gives you exclusive
                access to the best deals, events, and spots near your school — all
                in one free app.
              </p>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <svg width="160" height="54" viewBox="0 0 160 54" className="hover:opacity-80 transition-opacity mx-auto">
                  <rect width="160" height="54" rx="10" fill="#000" />
                  <text x="80" y="22" fill="#fff" fontSize="10" fontFamily="system-ui" textAnchor="middle">Download on the</text>
                  <text x="80" y="38" fill="#fff" fontSize="16" fontWeight="600" fontFamily="system-ui" textAnchor="middle">App Store</text>
                </svg>
              </a>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Features */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Why students love Bizzy
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              More than a deal app — it&apos;s your guide to campus life.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatedSection delay={0}>
            <FeatureCard icon={<TagIcon />} title="Exclusive Deals" description="Access discounts you won't find anywhere else — BOGO meals, drink specials, free activities, and more from local businesses." />
          </AnimatedSection>
          <AnimatedSection delay={0.08}>
            <FeatureCard icon={<CalendarIcon />} title="Events Near You" description="See what's happening tonight, this weekend, or anytime. Bar nights, campus activities, live events — all in one feed." />
          </AnimatedSection>
          <AnimatedSection delay={0.16}>
            <FeatureCard icon={<TrophyIcon />} title="Compete & Rank" description="Track your savings, climb your school's leaderboard, and see who's getting the most out of college life." />
          </AnimatedSection>
          <AnimatedSection delay={0.08}>
            <FeatureCard icon={<MapIcon />} title="Campus-Centered" description="Everything is curated for your specific school. Deals and events from the spots students actually go to." />
          </AnimatedSection>
          <AnimatedSection delay={0.16}>
            <FeatureCard icon={<HeartIcon />} title="Save Your Favorites" description="Heart the deals you love and build a personal list of go-to spots and offers." />
          </AnimatedSection>
          <AnimatedSection delay={0.24}>
            <FeatureCard icon={<ZapIcon />} title="Instant Claims" description="No coupons, no codes. Just open the deal, show it at checkout, and save. It's that fast." />
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* Deal Types */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                What kind of deals will you find?
              </h2>
              <p className="text-muted text-lg max-w-2xl mx-auto">
                Real savings on the places you actually go.
              </p>
            </div>
          </AnimatedSection>
          <DealTypeGrid />
        </SectionContainer>
      </section>

      {/* Events Section */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-10">
            <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
              Events Tab
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Never miss what&apos;s happening
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Bizzy isn&apos;t just deals. Discover everything going on around campus — bar nights,
              live music, themed events, campus activities, and ticketed experiences.
            </p>
          </div>
        </AnimatedSection>
        <AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: "🍻", label: "Bar Nights" },
              { icon: "🎵", label: "Live Music" },
              { icon: "🎭", label: "Themed Events" },
              { icon: "🎟️", label: "Ticketed Shows" },
              { icon: "🧠", label: "Trivia Nights" },
              { icon: "🏈", label: "Watch Parties" },
              { icon: "🎤", label: "Karaoke" },
              { icon: "🌴", label: "Campus Pop-Ups" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-center hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <span className="text-sm font-medium text-ink">{item.label}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* How It Works */}
      <section className="bg-secondary/50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Start saving in 60 seconds
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Download Bizzy", desc: "Free on the App Store. Sign up with your school email in seconds." },
              { step: "2", title: "Explore Your Campus", desc: "Browse deals, events, and trending spots tailored to your school." },
              { step: "3", title: "Claim & Save", desc: "Tap a deal, show it at checkout, done. Track your savings on your profile." },
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

      {/* Campus Presence */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Live on campus now
            </h2>
            <p className="text-muted text-lg">
              Students at these schools are already saving with Bizzy.
            </p>
          </div>
        </AnimatedSection>
        <CampusGrid />
      </SectionContainer>

      {/* FAQ */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Frequently asked questions
              </h2>
            </div>
          </AnimatedSection>
          <FAQ items={STUDENT_FAQ} />
        </SectionContainer>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Your friends are already on Bizzy
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Don&apos;t be the one paying full price. Download Bizzy and start living
              college the smarter way.
            </p>
            <Button href={APP_STORE_URL} variant="white" size="lg">
              Download Bizzy Free
            </Button>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
