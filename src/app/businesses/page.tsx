import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FeatureCard from "@/components/ui/FeatureCard";
import ZeroFrictionBanner from "@/components/ui/ZeroFrictionBanner";
import FAQ from "@/components/ui/FAQ";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Button from "@/components/ui/Button";
import { BUSINESS_FAQ, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "For Businesses",
  description:
    "Reach thousands of college students near your business. List deals and events for free on Bizzy and drive foot traffic from the campus crowd.",
  openGraph: {
    title: "For Businesses | Bizzy",
    description:
      "Put your business in front of thousands of students. List deals and events for free.",
  },
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
                100% Free — No Fees Ever
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                Put your business in front of{" "}
                <span className="text-primary">thousands of students.</span>
              </h1>
              <p className="text-lg text-muted mb-8 max-w-xl mx-auto leading-relaxed">
                List your deals and events on Bizzy for free. Reach college students
                at nearby campuses and turn them into loyal customers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button href="/contact?type=business" size="lg">
                  Get Started — It&apos;s Free
                </Button>
                <Button
                  href={`mailto:${CONTACT_EMAIL}`}
                  variant="outline"
                  size="lg"
                >
                  Email Us: {CONTACT_EMAIL}
                </Button>
              </div>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Two Value Props: Deals + Events */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Two powerful ways to reach students
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Whether it&apos;s deals or events, Bizzy puts your business where students are looking.
            </p>
          </div>
        </AnimatedSection>

        {/* Deals Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <AnimatedSection>
            <div>
              <div className="inline-flex items-center px-3 py-1 bg-primary-light rounded-full text-primary text-sm font-semibold mb-4">
                Deals
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-ink mb-4">
                List deals students actually want
              </h3>
              <p className="text-muted text-lg leading-relaxed mb-6">
                The best-performing deals on Bizzy are exclusive, compelling offers
                that give students a real reason to visit. Here&apos;s what works:
              </p>
              <div className="space-y-4">
                {[
                  { type: "BOGO Deals", example: "Buy one burger, get one free" },
                  { type: "Meal Deals", example: "Combo meal for $7.95" },
                  { type: "Flat $ Off", example: "$10 off your order of $25+" },
                  { type: "Free Items", example: "Free dessert with any entree" },
                  { type: "% Off Discounts", example: "20% off your entire check" },
                  { type: "Monthly Exclusives", example: "March special: $5 pitchers" },
                ].map((deal) => (
                  <div key={deal.type} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-ink">{deal.type}</span>
                      <span className="text-muted"> — {deal.example}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Events Section */}
          <AnimatedSection delay={0.15}>
            <div>
              <div className="inline-flex items-center px-3 py-1 bg-primary-light rounded-full text-primary text-sm font-semibold mb-4">
                Events
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-ink mb-4">
                Promote events to the campus crowd
              </h3>
              <p className="text-muted text-lg leading-relaxed mb-6">
                Students use Bizzy&apos;s Events tab to find what&apos;s happening near campus.
                List your events and get them in front of thousands of students who are
                actively looking for things to do.
              </p>
              <div className="space-y-4">
                {[
                  { type: "Bar Nights", example: "AYCD Saturdays, themed nights" },
                  { type: "Live Music & DJs", example: "Friday live band, DJ sets" },
                  { type: "Themed Events", example: "Trivia night, karaoke, game day watch parties" },
                  { type: "Ticketed Experiences", example: "Comedy shows, concerts, pop-ups" },
                  { type: "Weekly Specials", example: "Taco Tuesday, Wing Wednesday" },
                  { type: "Campus Pop-Ups", example: "Spring break events, holiday specials" },
                ].map((event) => (
                  <div key={event.type} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-ink">{event.type}</span>
                      <span className="text-muted"> — {event.example}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* Benefits Grid */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Why businesses choose Bizzy
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatedSection delay={0}>
              <FeatureCard icon={<UsersIcon />} title="Reach Students Directly" description="Get in front of thousands of college students who are actively looking for places to eat, drink, and hang out." />
            </AnimatedSection>
            <AnimatedSection delay={0.08}>
              <FeatureCard icon={<TrendingIcon />} title="Increase Foot Traffic" description="Students see your deal, claim it in the app, and walk through your door. Fill slower hours and boost weekday traffic." />
            </AnimatedSection>
            <AnimatedSection delay={0.16}>
              <FeatureCard icon={<DollarIcon />} title="100% Free to List" description="No cost to join. No commissions. No percentage of sales. Zero risk, all upside." />
            </AnimatedSection>
            <AnimatedSection delay={0.08}>
              <FeatureCard icon={<CalendarIcon />} title="Promote Events" description="List your events in the dedicated Events tab. Bar nights, live music, themed events — students find them all here." />
            </AnimatedSection>
            <AnimatedSection delay={0.16}>
              <FeatureCard icon={<BarChartIcon />} title="Real-Time Insights" description="See how many students view and claim your deals. Understand what works and optimize your offers." />
            </AnimatedSection>
            <AnimatedSection delay={0.24}>
              <FeatureCard icon={<RepeatIcon />} title="Build Repeat Customers" description="Turn first-time visitors into regulars. Students who discover you through Bizzy keep coming back." />
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* Zero Friction */}
      <SectionContainer>
        <ZeroFrictionBanner />
      </SectionContainer>

      {/* How It Works */}
      <section className="bg-secondary/50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Getting started takes 5 minutes
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Reach Out", desc: "Contact us through the form or email Contact@BizzyU.com. We'll get you set up in minutes." },
              { step: "2", title: "List Deals & Events", desc: "Tell us what offers or events you want to promote. We handle the rest — no tech setup needed." },
              { step: "3", title: "Students Show Up", desc: "Students discover your business, claim deals in the app, and walk through your door." },
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
                <AnimatedCounter end={10} suffix="K+" />
              </div>
              <div className="text-muted text-sm font-medium">Active Students</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <AnimatedCounter end={500} suffix="+" />
              </div>
              <div className="text-muted text-sm font-medium">Deals Claimed Weekly</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <AnimatedCounter end={50} suffix="+" />
              </div>
              <div className="text-muted text-sm font-medium">Business Partners</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                Free
              </div>
              <div className="text-muted text-sm font-medium">To Get Started</div>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* FAQ */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Frequently asked questions
              </h2>
              <p className="text-muted text-lg">
                Everything you need to know about listing on Bizzy.
              </p>
            </div>
          </AnimatedSection>
          <FAQ items={BUSINESS_FAQ} />
        </SectionContainer>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to reach the campus crowd?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Join Bizzy for free and start connecting with students near
              your business today. Deals and events — we&apos;ve got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button href="/contact?type=business" variant="white" size="lg">
                List Your Business — Free
              </Button>
              <Button
                href={`mailto:${CONTACT_EMAIL}`}
                variant="outline"
                size="lg"
                className="!border-white !text-white hover:!bg-white/10"
              >
                Email {CONTACT_EMAIL}
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
