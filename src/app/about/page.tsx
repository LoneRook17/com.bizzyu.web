import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import { APP_STORE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Bizzy's mission to connect college students with the best local deals, events, and experiences while helping businesses grow.",
  openGraph: {
    title: "About Bizzy",
    description:
      "Building the bridge between campus and community. Deals, events, and experiences for college students.",
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

      {/* Mission */}
      <SectionContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
              The problem we saw
            </h2>
            <div className="space-y-4 text-muted leading-relaxed">
              <p>
                College students spend money every day on food, drinks,
                entertainment, and experiences — but most of them don&apos;t know
                where the best local deals are. There&apos;s no central place to see
                what&apos;s actually worth it nearby.
              </p>
              <p>
                At the same time, local businesses near campuses struggle to
                reach the student audience. They know students are their core
                customers, but there&apos;s no easy way to get in front of them with
                relevant offers.
              </p>
              <p>
                We built Bizzy to fix both sides of that equation.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="bg-primary-light rounded-3xl p-10">
              <h3 className="text-2xl font-bold text-ink mb-4">Our Mission</h3>
              <p className="text-ink/80 text-lg leading-relaxed">
                Make college life more affordable, more social, and more
                connected — while helping the local businesses that shape campus
                communities grow alongside the students they serve.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* What Makes Us Different */}
      <section className="bg-secondary/50">
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
                desc: "We're a lifestyle platform. Deals, events, rankings, and discovery — making college feel more alive, not just cheaper.",
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
                the local businesses around it — making communities more active,
                helping good businesses grow, and making student life better
                everywhere.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* CTA */}
      <section className="bg-primary">
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
              <Button href="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                List Your Business
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
