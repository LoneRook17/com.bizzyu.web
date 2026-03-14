import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FeatureCard from "@/components/ui/FeatureCard";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "For Businesses",
  description:
    "Reach thousands of college students near your business. List deals and events for free on Bizzy and drive foot traffic from the campus crowd.",
};

function UsersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

export default function BusinessesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                For Businesses
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-dark leading-tight mb-6">
                Put your business in front of{" "}
                <span className="text-primary">thousands of students.</span>
              </h1>
              <p className="text-lg text-gray mb-8 max-w-xl mx-auto leading-relaxed">
                Bizzy gives local businesses a direct channel to the college
                crowd. List deals and events for free and start driving foot
                traffic from nearby campuses.
              </p>
              <Button href="/contact" size="lg">
                Get Started — It&apos;s Free
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Benefits */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
              Why businesses choose Bizzy
            </h2>
            <p className="text-gray text-lg max-w-2xl mx-auto">
              A free, focused way to reach the most active customer base in your area.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatedSection delay={0}>
            <FeatureCard
              icon={<UsersIcon />}
              title="Reach Students Directly"
              description="Get your brand in front of thousands of college students who are actively looking for places to eat, drink, and hang out."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FeatureCard
              icon={<TrendingIcon />}
              title="Increase Foot Traffic"
              description="Students see your deal, claim it in the app, and walk through your door. Fill slower hours and boost weekday traffic."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <FeatureCard
              icon={<DollarIcon />}
              title="100% Free to List"
              description="There's no cost to join Bizzy and list your deals or events. Zero risk, all upside."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FeatureCard
              icon={<BarChartIcon />}
              title="Real-Time Insights"
              description="See how many students view and claim your deals. Understand what works and optimize your offers."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <FeatureCard
              icon={<StoreIcon />}
              title="Local Visibility"
              description="Stand out in the campus community. Students see your business alongside the best spots around their school."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.3}>
            <FeatureCard
              icon={<RepeatIcon />}
              title="Build Repeat Customers"
              description="Turn first-time visitors into regulars. Students who discover you through Bizzy keep coming back."
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
                Getting started is easy
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Sign Up Free", desc: "Create your business profile on Bizzy in minutes. No fees, no contracts." },
              { step: "2", title: "Post a Deal or Event", desc: "List your best offers — BOGO specials, happy hours, events, whatever brings students in." },
              { step: "3", title: "Watch Students Show Up", desc: "Students discover your deal, claim it in the app, and come to your business ready to buy." },
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
              { value: "10K+", label: "Active Students" },
              { value: "500+", label: "Deals Claimed Weekly" },
              { value: "50+", label: "Business Partners" },
              { value: "Free", label: "To Get Started" },
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

      {/* CTA */}
      <section className="bg-primary">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to reach the campus crowd?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Join Bizzy for free and start connecting with the students near
              your business today.
            </p>
            <Button href="/contact" variant="white" size="lg">
              List Your Business — Free
            </Button>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
