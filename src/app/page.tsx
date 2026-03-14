import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FeatureCard from "@/components/ui/FeatureCard";
import PhoneMockup from "@/components/ui/PhoneMockup";
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
                <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                  Now live on campus
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-dark leading-tight mb-6">
                  Save more.
                  <br />
                  <span className="text-primary">Do more.</span>
                  <br />
                  College made better.
                </h1>
                <p className="text-lg text-gray mb-8 leading-relaxed max-w-md">
                  Discover exclusive deals, events, and experiences near your
                  campus. One app for everything worth doing in college.
                </p>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <svg width="160" height="54" viewBox="0 0 160 54" className="hover:opacity-80 transition-opacity">
                    <rect width="160" height="54" rx="10" fill="#000" />
                    <text x="80" y="22" fill="#fff" fontSize="10" fontFamily="system-ui" textAnchor="middle">Download on the</text>
                    <text x="80" y="38" fill="#fff" fontSize="16" fontWeight="600" fontFamily="system-ui" textAnchor="middle">App Store</text>
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

      {/* Features */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
              Everything campus life needs
            </h2>
            <p className="text-gray text-lg max-w-2xl mx-auto">
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
              description="Never miss what's happening. Find parties, bar nights, campus activities, and everything in between."
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

      {/* How It Works */}
      <section className="bg-secondary/50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
                How it works
              </h2>
              <p className="text-gray text-lg">
                Three steps to start saving.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Download Bizzy", desc: "Get the app free from the App Store and sign up with your school." },
              { step: "2", title: "Browse Deals", desc: "Explore exclusive offers from restaurants, bars, and local spots near campus." },
              { step: "3", title: "Claim & Save", desc: "Show the deal at checkout. It's that simple. Start saving instantly." },
            ].map((item, i) => (
              <AnimatedSection key={item.step} delay={i * 0.1}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-3">{item.title}</h3>
                  <p className="text-gray max-w-xs mx-auto">{item.desc}</p>
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
            {[
              { value: "500+", label: "Active Deals" },
              { value: "10K+", label: "Students" },
              { value: "$250K+", label: "Saved by Students" },
              { value: "50+", label: "Campus Partners" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-gray text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* CTA Banner */}
      <section className="bg-primary">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to start saving?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Join thousands of students already using Bizzy to make college
              more affordable and more fun.
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
