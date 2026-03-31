import type { Metadata } from "next";
import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import TrendingDeals from "@/components/students/TrendingDeals";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import JsonLd from "@/components/seo/JsonLd";
import { APP_STORE_URL, STUDENT_FAQ } from "@/lib/constants";

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
  title: "Bizzy — Student Deals & Discounts at Your College Campus",
  description:
    "Bizzy is the #1 student deals app. Get exclusive discounts at local restaurants, bars, and shops near your college campus.",
  alternates: {
    canonical: "https://bizzyu.com/",
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={faqJsonLd} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
        <SectionContainer className="!py-12 md:!py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
            <AnimatedSection>
              <div className="max-w-xl">
                <div className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary text-sm font-semibold mb-6">
                  Free on the App Store
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-ink leading-tight mb-6">
                  Your Campus.{" "}
                  <span className="text-primary">Your Way.</span>
                </h1>
                <p className="text-lg text-muted mb-8 max-w-md leading-relaxed">
                  Stop paying full price for everything. Bizzy gives you exclusive
                  access to the best deals, events, and spots near your school - all
                  in one free app.
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

            {/* Floating phone screens */}
            <AnimatedSection delay={0.2} className="flex justify-center">
              <div className="relative w-full h-[440px] lg:h-[580px]">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[240px] lg:w-[280px] z-10 animate-float">
                  <Image
                    src="/images/screen-2.png"
                    alt="Bizzy deals home feed"
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
                    src="/images/screen-1.png"
                    alt="Bizzy student profile and savings"
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

      {/* Features - 2 column cards */}
      <SectionContainer>
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Everything you get with Bizzy
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              More than a deal app - it&apos;s your guide to campus life.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatedSection>
            <div className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 h-full hover:-translate-y-1 transition-transform duration-300">
              <div className="inline-flex items-center px-3 py-1 bg-primary-light rounded-full text-primary text-xs font-semibold mb-4">
                Deals
              </div>
              <h3 className="text-2xl font-bold text-ink mb-3">Exclusive deals near campus</h3>
              <p className="text-muted text-base mb-6">
                Access BOGO meals, free drinks, meal deals, and discounts you won&apos;t find anywhere else - only on Bizzy.
              </p>
              <div className="flex gap-4 mb-6 justify-center">
                <div className="w-[140px] -rotate-3">
                  <Image src="/images/screen-3.png" alt="Bizzy deal detail screen" width={140} height={300} className="rounded-xl shadow-md w-full" />
                </div>
                <div className="w-[140px] rotate-3">
                  <Image src="/images/screen-4d.png" alt="Bizzy deal claimed screen" width={140} height={300} className="rounded-xl shadow-md w-full" />
                </div>
              </div>
              <div className="space-y-3">
                {["Show the deal, save instantly", "New deals added every week", "Track your total savings", "Curated for your school"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span className="text-ink text-base">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button href={APP_STORE_URL} variant="outline" size="sm">Browse Deals</Button>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 h-full hover:-translate-y-1 transition-transform duration-300">
              <div className="inline-flex items-center px-3 py-1 bg-primary-light rounded-full text-primary text-xs font-semibold mb-4">
                Events
              </div>
              <h3 className="text-2xl font-bold text-ink mb-3">Events happening near you</h3>
              <p className="text-muted text-base mb-6">
                See what&apos;s happening tonight, this weekend, or anytime. Bar nights, campus activities, live events - all in one feed.
              </p>
              <div className="flex gap-4 mb-6 justify-center">
                <div className="w-[140px] -rotate-3">
                  <Image src="/images/screen-5.png" alt="Bizzy event screen" width={140} height={300} className="rounded-xl shadow-md w-full" />
                </div>
                <div className="w-[140px] rotate-3">
                  <Image src="/images/screen-6.png" alt="Bizzy event tickets" width={140} height={300} className="rounded-xl shadow-md w-full" />
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { title: "Buy Tickets In-App", desc: "RSVP or buy tickets directly in Bizzy. No third-party apps." },
                  { title: "Never Miss Out", desc: "See events curated for your campus as soon as they drop." },
                  { title: "Compete on the Leaderboard", desc: "Track your savings and rank against your friends." },
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
                <Button href={APP_STORE_URL} variant="outline" size="sm">See Events</Button>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* Deal Types */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">What kind of deals will you find?</h2>
              <p className="text-muted text-lg max-w-2xl mx-auto">Real savings on the places you actually go.</p>
            </div>
          </AnimatedSection>
          <TrendingDeals />
        </SectionContainer>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50">
        <SectionContainer className="!pb-8 md:!pb-10">
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Start saving in 60 seconds</h2>
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
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5">{item.step}</div>
                  <h3 className="text-xl font-bold text-ink mb-3">{item.title}</h3>
                  <p className="text-muted max-w-xs mx-auto">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Why Bizzy */}
      <SectionContainer className="!pt-4 md:!pt-6">
        <AnimatedSection>
          <div className="bg-gradient-to-br from-primary to-emerald-500 rounded-3xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-6">Built for the way you live on campus.</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {["Deals you won't find anywhere else", "New offers and events added every week", "Curated for your specific school", "Save on food, drinks, and experiences", "Works at every partnered campus"].map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/90 text-lg">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
        <div className="flex justify-center mt-10">
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
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
      </SectionContainer>

      {/* FAQ */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Frequently asked questions</h2>
            </div>
          </AnimatedSection>
          <FAQ items={STUDENT_FAQ} />
        </SectionContainer>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary to-emerald-500">
        <SectionContainer className="text-center py-16 md:py-20">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your friends are already on Bizzy</h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Don&apos;t be the one paying full price. Download Bizzy and start living college the smarter way.
            </p>
            <Button href={APP_STORE_URL} variant="white" size="lg">Download Bizzy Free</Button>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
