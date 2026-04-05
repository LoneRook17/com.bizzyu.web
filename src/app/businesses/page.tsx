import type { Metadata } from "next";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import ZeroFrictionBanner from "@/components/ui/ZeroFrictionBanner";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import HeroDealCard from "@/components/businesses/HeroDealCard";
import HowItWorks from "@/components/businesses/HowItWorks";
import { BUSINESS_FAQ, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Partner With Bizzy — Reach College Students Near You",
  description:
    "Join 100+ local businesses on Bizzy. Reach thousands of college students with exclusive deals. No upfront cost to get started.",
  alternates: {
    canonical: "https://bizzyu.com/businesses",
  },
  openGraph: {
    title: "Partner With Bizzy — Reach College Students Near You",
    description:
      "Join 100+ local businesses on Bizzy. Reach thousands of college students with exclusive deals. No upfront cost to get started.",
  },
};

const LOGOS = [
  { src: "/images/logos/chick-fil-a.svg", alt: "Chick-fil-A", width: 280, height: "h-16" },
  { src: "/images/logos/taco-bell.svg", alt: "Taco Bell", width: 280, height: "h-16" },
  { src: "/images/logos/jersey-mikes.svg", alt: "Jersey Mike's", width: 280, height: "h-16" },
  { src: "/images/logos/tropical-smoothie.svg", alt: "Tropical Smoothie", width: 260, height: "h-14" },
  { src: "/images/logos/chipotle.svg", alt: "Chipotle", width: 280, height: "h-16" },
  { src: "/images/logos/crisp-and-green.svg", alt: "Crisp & Green", width: 260, height: "h-14" },
  { src: "/images/logos/playa-bowls.svg", alt: "Playa Bowls", width: 260, height: "h-14" },
  { src: "/images/logos/firehouse-subs.svg", alt: "Firehouse Subs", width: 280, height: "h-16" },
  { src: "/images/logos/jimmy-johns.svg", alt: "Jimmy John's", width: 260, height: "h-14" },
  { src: "/images/logos/zaxbys.svg", alt: "Zaxby's", width: 240, height: "h-14" },
  { src: "/images/logos/pei-wei.svg", alt: "Pei Wei", width: 220, height: "h-14" },
];

export default function BusinessesPage() {
  return (
    <>
      {/* 1. Hero -Split Layout with Floating Deal Card */}
      <section className="relative overflow-hidden">
        <SectionContainer className="py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="max-w-xl">
                <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                  Simple to Use. Reliable. Free
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                  Get college students through your door{" "}
                  <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                    for free.
                  </span>
                </h1>
                <p className="text-lg text-muted mb-8 max-w-md leading-relaxed">
                  Bizzy brings students to your business and inside your door
                  so you can sell them more. List student deals and sell event
                  tickets. No fees, no percent taken.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button href="/business/signup" size="lg">
                    Get Started Free
                  </Button>
                  <Button href="/signup" variant="outline" size="lg">
                    Submit a Deal
                  </Button>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2} className="flex justify-center">
              <HeroDealCard />
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* 2. Logo Trust Strip */}
      <section className="py-12 overflow-hidden">
        <p className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em] mb-8">
          Brands already on Bizzy
        </p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          <div className="flex animate-marquee" style={{ animationDuration: "7s" }}>
            {[...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS].map((logo, i) => (
              <div
                key={`${logo.alt}-${i}`}
                className="flex-shrink-0 mx-12 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-300"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={64}
                  className={`${logo.height} w-auto`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2.5 How Deals Work In-Store */}
      <section className="bg-gray-50">
        <SectionContainer className="!py-10 md:!py-14">
          <AnimatedSection>
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-2">
                How it works
              </h2>
              <p className="text-muted text-base">
                Simple for students. Even simpler for your staff.
              </p>
            </div>
          </AnimatedSection>

          <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Step 1 */}
                <AnimatedSection delay={0.15} variant="fade-left">
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-[260px] md:w-[320px] h-[520px] md:h-[570px] mb-2">
                    <div className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-xl scale-[0.85] -z-10" />
                    <Image src="/images/screen-1.png" alt="Student browsing deals on Bizzy" fill className="object-contain drop-shadow-xl" />
                  </div>
                  <h3 className="text-base font-bold text-ink mb-1">Student finds your deal</h3>
                  <p className="text-muted text-sm">They browse Bizzy, see your deal, and head to your business.</p>
                </div>
                </AnimatedSection>

                {/* Step 2 */}
                <AnimatedSection delay={0.35} variant="scale-in">
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-[260px] md:w-[320px] h-[520px] md:h-[570px] mb-2">
                    <div className="absolute inset-0 bg-primary/10 rounded-[2rem] blur-2xl scale-90 -z-10" />
                    <Image src="/images/screen-3.png" alt="Staff member tap here to verify deal" fill className="object-contain drop-shadow-xl" />
                  </div>
                  <h3 className="text-base font-bold text-ink mb-1">Staff taps to verify</h3>
                  <p className="text-muted text-sm">At checkout, your staff taps the green button. Takes 2 seconds.</p>
                </div>
                </AnimatedSection>

                {/* Step 3 */}
                <AnimatedSection delay={0.55} variant="fade-right">
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-[260px] md:w-[320px] h-[520px] md:h-[570px] mb-2">
                    <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-2xl scale-90 -z-10" />
                    <Image src="/images/screen-4d.png" alt="Deal claimed confirmation screen" fill className="object-contain drop-shadow-xl" />
                  </div>
                  <h3 className="text-base font-bold text-ink mb-1">Deal claimed, discount applied</h3>
                  <p className="text-muted text-sm">The deal locks. Staff honors the discount. Done.</p>
                </div>
                </AnimatedSection>
              </div>
            </div>
        </SectionContainer>
      </section>

      {/* 4. What You Can Do -Three Cards */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Everything you need to reach students
            </h2>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Deals card */}
          <AnimatedSection>
            <div className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 h-full hover:-translate-y-1 transition-transform duration-300">
              <div className="inline-flex items-center px-3 py-1 bg-primary-light rounded-full text-primary text-xs font-semibold mb-4">
                Deals
              </div>
              <h3 className="text-2xl font-bold text-ink mb-3">
                List exclusive deals
              </h3>
              <p className="text-muted text-base mb-6">
                Offer deals students can only get through Bizzy. The more
                compelling the offer, the more students walk in.
              </p>
              {/* Deal screen previews */}
              <div className="flex gap-4 mb-6 justify-center">
                <div className="w-[140px] -rotate-3">
                  <Image
                    src="/images/screens/3.png"
                    alt="Bizzy deal claim screen"
                    width={140}
                    height={300}
                    className="rounded-xl shadow-md w-full"
                  />
                </div>
                <div className="w-[140px] rotate-3">
                  <Image
                    src="/images/screens/4.png"
                    alt="Bizzy deal claimed confirmation"
                    width={140}
                    height={300}
                    className="rounded-xl shadow-md w-full"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {[
                  "Drive new foot traffic every week",
                  "Zero fees, zero commissions",
                  "You control the offer and terms",
                  "Turn first-timers into regulars",
                ].map((deal) => (
                  <div key={deal} className="flex items-center gap-2.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span className="text-ink text-base">{deal}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button href="/signup" variant="outline" size="sm">
                  List a Deal
                </Button>
              </div>
            </div>
          </AnimatedSection>

          {/* Events card */}
          <AnimatedSection delay={0.1}>
            <div className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 h-full hover:-translate-y-1 transition-transform duration-300">
              <div className="inline-flex items-center px-3 py-1 bg-primary-light rounded-full text-primary text-xs font-semibold mb-4">
                Events
              </div>
              <h3 className="text-2xl font-bold text-ink mb-3">
                Sell event tickets
              </h3>
              <p className="text-muted text-base mb-6">
                Post events for students to discover, RSVP, or buy tickets,
                all inside the app.
              </p>
              {/* Event screen previews */}
              <div className="flex gap-4 mb-6 justify-center">
                <div className="w-[140px] -rotate-3">
                  <Image
                    src="/images/screens/6.png"
                    alt="Bizzy event ticket tiers"
                    width={140}
                    height={300}
                    className="rounded-xl shadow-md w-full"
                  />
                </div>
                <div className="w-[140px] rotate-3">
                  <Image
                    src="/images/screens/5.png"
                    alt="Bizzy event ticket purchase with Apple Pay"
                    width={140}
                    height={300}
                    className="rounded-xl shadow-md w-full"
                  />
                </div>
              </div>
              <div className="space-y-4">
                {[
                  {
                    title: "Tap to Pay",
                    desc: "Accept cover and payments at the door with your phone.",
                  },
                  {
                    title: "In-App Ticketing",
                    desc: "Students RSVP or buy tickets directly in the app.",
                  },
                  {
                    title: "Keep 100% of Proceeds",
                    desc: "Powered by Stripe. You keep every dollar.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5">
                    <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <div>
                      <span className="text-ink text-base font-semibold">{item.title}</span>
                      <span className="text-muted text-base"> - {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button href="/events-contact" variant="outline" size="sm">
                  Contact Events Team
                </Button>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* 5.5 Getting Started */}
      <HowItWorks />

      {/* 6. Zero Friction Banner */}
      <SectionContainer className="!pt-4 md:!pt-6">
        <ZeroFrictionBanner />
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Button href="/signup" size="lg">
            List a Deal
          </Button>
          <Button href="/events-contact" variant="outline" size="lg">
            Contact Events Team
          </Button>
        </div>
      </SectionContainer>

      {/* 7. FAQ */}
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

      {/* 8. Final CTA - Green Gradient */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-24">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              List your business on Bizzy. It&apos;s free
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              500+ local business owners are already reaching students through
              Bizzy. No fees, no commissions, no contracts.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button href="/business/signup" variant="white" size="lg">
                Sign Up for Free
              </Button>
              <Button href="/signup" variant="white" size="lg" className="!bg-white/20 !text-white hover:!bg-white/30">
                Submit a Deal Instead
              </Button>
            </div>
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
