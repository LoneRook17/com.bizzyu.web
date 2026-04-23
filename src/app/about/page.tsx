import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import { APP_STORE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Bizzy — The Student Deals App for Your Campus",
  description:
    "Bizzy connects college students with exclusive local deals at restaurants, bars, and shops near campus. Learn our story and mission.",
  alternates: {
    canonical: "https://bizzyu.com/about",
  },
  openGraph: {
    title: "About Bizzy — The Student Deals App for Your Campus",
    description:
      "Bizzy connects college students with exclusive local deals at restaurants, bars, and shops near campus. Learn our story and mission.",
  },
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="py-20 md:py-32">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                Our Story
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                Building the bridge between{" "}
                <span className="text-primary">campus and community.</span>
              </h1>
              <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
                Bizzy started with a simple idea: college students deserve better
                access to the local spots around them, and local businesses
                deserve a direct line to the campus crowd.
              </p>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Our Story */}
      <SectionContainer>
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6 text-muted text-lg leading-relaxed">
              <p className="text-xl text-ink font-medium">
                The internet connects us to the whole world. We think it should
                connect you to what is right outside your door.
              </p>
              <p>That belief is what led to Bizzy.</p>
              <p>
                College students are more connected online than any generation
                before them, yet many are deeply disconnected from the place they
                actually live. They can access almost anything from a screen, but
                still miss the restaurants, events, and experiences happening
                right around them. Local businesses struggle to reach nearby
                students. Students struggle to discover what is worth showing up
                for. And the campus community loses something because of it.
              </p>
              <p>We saw that gap clearly and kept asking a simple question:</p>
              <blockquote className="border-l-4 border-primary pl-6 py-2 text-ink font-medium italic text-xl">
                Why can the internet connect us globally, but fail to connect us
                locally?
              </blockquote>
              <p>That question became Bizzy.</p>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* Founder Story */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="max-w-3xl mx-auto">
              <div className="space-y-6 text-muted text-lg leading-relaxed">
                <p>
                  My name is Cooper Aiello, and when I came to Florida Gulf Coast
                  University, I found myself in the same position a lot of
                  students do: in a new place, surrounded by opportunity, but not
                  truly connected to it. I was trying to figure out where to go,
                  what was worth doing, and how to actually feel part of the
                  community around me. What became obvious pretty quickly was
                  that the problem was not a lack of great places or experiences.
                  The problem was that students had no real way to discover them.
                </p>
                <p className="text-ink font-medium">
                  So I decided to build one.
                </p>
                <p>
                  When I first started, I hired a freelance developer because I
                  thought it would be the fastest way to get the first version of
                  Bizzy built. It ended up being a disaster. I got scammed for
                  $4,000, the last $4,000 I had saved from working college jobs
                  serving at restaurants.
                </p>
                <p>
                  That moment could have ended Bizzy before it ever began.
                </p>
                <p>
                  Instead, it changed the way I approached building. I started
                  learning the basics of app development myself. I stopped
                  waiting for someone else to bring the vision to life and made
                  the decision to become part of building it.
                </p>
                <p>
                  A few months later, we started to see real traction, and I
                  reached out to my close friend and mentor, Evangelos Milionis.
                  He believed in the vision early and invested $20,000 into
                  Bizzy, helping give the company real momentum in its early
                  stages. He also brought valuable experience in the college bar
                  and events market. Together, we saw the opportunity clearly: if
                  Bizzy could work at one campus, it could work across the
                  country.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* Cofounder */}
      <SectionContainer>
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
              Meet the Cofounder
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
              Evangelos Milionis
            </h2>
            <div className="space-y-6 text-muted text-lg leading-relaxed">
              <p>
                Evangelos Milionis is a Miami-based entrepreneur and operator
                whose career has moved from banking to entertainment,
                hospitality, and technology. A 2022 graduate in Finance from
                Florida Gulf Coast University, he began his career as an
                analyst at J.P. Morgan Private Bank before leaving to found
                DadBod Hospitality Group, a college entertainment company that
                has booked the NELK Boys, Rob Rausch, and other national
                headliners into campus venues across the country.
              </p>
              <p>
                He went on to acquire Backroads Brewhouse &amp; Sports in Fort
                Myers, Florida, a live-music and sports bar catering primarily
                to the nearby FGCU college crowd, where he serves as
                owner-operator. He also founded and runs multiple SaaS
                companies.
              </p>
              <p>
                Bizzy founder Cooper Aiello brought him into the company as his
                cofounder following its initial launch to lead venue
                partnerships and scale the platform&apos;s footprint across the
                bar and nightlife industry through the events &amp; ticketing
                function.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* Growth & Product */}
      <SectionContainer>
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6 text-muted text-lg leading-relaxed">
              <p>
                Bizzy started with exclusive local deals built specifically for
                college students. Not generic coupons. Not public specials
                recycled from social media. Real offers from local restaurants,
                bars, and businesses that students could only access through
                Bizzy.
              </p>
              <p>
                From there, we expanded into events. Because saving money
                matters, but college life is also about knowing what is happening
                tonight. Bizzy brings local deals, events, bar nights, and
                campus experiences into one feed built for each school.
              </p>

              <div className="bg-primary-light rounded-2xl p-8 text-center my-8">
                <p className="text-4xl font-bold text-primary mb-2">55%</p>
                <p className="text-ink font-medium">
                  monthly usage across the FGCU student body within our first
                  year
                </p>
              </div>

              <p className="text-ink font-medium text-xl">
                That is what makes Bizzy different.
              </p>
              <p>
                We are not building a generic coupon app, and we are not building
                just another event platform. Bizzy is built specifically for
                college campuses, connecting students to the businesses, events,
                and experiences that make each school feel alive.
              </p>
              <p>
                Our vision is to become the pulse of every college campus in the
                country by helping students show up more, discover more, and
                connect more deeply with the places around them.
              </p>
            </div>

            <div className="mt-12 text-center">
              <p className="text-xl text-ink font-semibold mb-1">
                We are not anti-internet.
              </p>
              <p className="text-xl text-primary font-bold mb-1">
                We are pro-real life.
              </p>
              <p className="text-muted text-lg">
                And we are building Bizzy to prove those two things belong
                together.
              </p>
              <p className="mt-8 text-ink font-medium">
                — Cooper Aiello, Founder
              </p>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* Mission Card */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-primary to-emerald-500 rounded-3xl p-10 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  Make college life more affordable, more social, and more
                  connected — while helping the local businesses that shape
                  campus communities grow alongside the students they serve.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* What Makes Us Different */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                What makes Bizzy different
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Exclusive, Not Recycled",
                desc: "Our deals aren't generic coupons everyone gets. They're exclusive offers businesses create specifically for the college audience.",
              },
              {
                title: "Campus by Campus",
                desc: "Bizzy isn't one-size-fits-all. Every school has its own ecosystem of businesses, deals, events, and student community.",
              },
              {
                title: "More Than Discounts",
                desc: "We're a lifestyle platform. Deals, events, rankings, and discovery - making college feel more alive, not just cheaper.",
              },
            ].map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-8 shadow-sm h-full">
                  <h3 className="text-xl font-bold text-ink mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Vision */}
      <SectionContainer>
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
              Where we&apos;re going
            </h2>
            <div className="space-y-4 text-muted text-lg leading-relaxed">
              <p>
                Bizzy is built to scale campus by campus, creating localized
                ecosystems where each school has its own business network,
                student community, and curated experience.
              </p>
              <p>
                Our vision goes beyond deals. We&apos;re building the platform that
                strengthens the relationship between every college campus and
                the local businesses around it - making communities more active,
                helping good businesses grow, and making student life better
                everywhere.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Be part of the movement
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Whether you&apos;re a student or a business, Bizzy is built for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button href={APP_STORE_URL} variant="white" size="lg">
                Download the App
              </Button>
              <Button href="/business/signup" variant="outline" size="lg" className="!border-white !text-white hover:!bg-white/10">
                List Your Business
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
