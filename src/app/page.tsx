import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import AutoLoopVideo from "@/components/ui/AutoLoopVideo";
import Parallax from "@/components/ui/Parallax";
import Button from "@/components/ui/Button";
import FAQ from "@/components/ui/FAQ";
import JsonLd from "@/components/seo/JsonLd";
import { fetchTrendingDeals } from "@/lib/deals";
import {
  APP_STORE_URL,
  CALENDLY_DEMO_URL,
  STUDENT_FAQ,
} from "@/lib/constants";

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
  title: "Bizzy: The Campus App for Students & Local Businesses",
  description:
    "Students discover events, tickets, line skips, and exclusive deals near campus. Local businesses reach 25,000+ students with zero platform fees.",
  alternates: {
    canonical: "https://bizzyu.com/",
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

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
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

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const REDEEM_STEPS = [
  { n: "1", t: "Find a deal", d: "Browse student-only offers around your campus." },
  { n: "2", t: "Show the offer", d: "Open the deal before ordering or paying." },
  { n: "3", t: "Staff confirms it", d: "The employee taps the green button and honors the offer." },
  { n: "4", t: "Start saving", d: "The redemption is recorded right in Bizzy." },
];

export default async function Home() {
  // One real deal for the hero's floating card. A marketing page must never 500
  // because a deals API blipped, so failure just drops the card.
  let heroDeal: Awaited<ReturnType<typeof fetchTrendingDeals>>[number] | undefined;
  try {
    heroDeal = (await fetchTrendingDeals())[0];
  } catch (err) {
    console.warn("[home] deal fetch failed", err);
  }

  return (
    <>
      <JsonLd data={faqJsonLd} />

        {/* 1. HERO ------------------------------------------------------------
            Split screen: the pitch holds the left, a real redemption plays on
            the right. The old right column was a phone screenshot ringed by
            three deal-card PNGs; it showed the software and none of the
            experience. NOTE: no stat line under the CTA. Stats were cut from
            this page deliberately. */}
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-white to-white pointer-events-none" />
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(110%_80%_at_10%_0%,black,transparent_70%)] [-webkit-mask-image:radial-gradient(110%_80%_at_10%_0%,black,transparent_70%)] pointer-events-none opacity-70" />

          <SectionContainer className="relative !py-14 md:!py-24">
            <div className="grid grid-cols-1 lg:grid-cols-[11fr_9fr] gap-12 lg:gap-14 items-center">
              <div>
                <AnimatedSection>
                  <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-5">
                    Everything happening around campus
                  </p>

                  <h1 className="text-4xl md:text-6xl font-bold text-ink leading-[1.04] tracking-tight mb-6">
                    Find the deal. Get the ticket.
                    <br />
                    Make the{" "}
                    <span className="marker-underline marker-draw">night happen</span>.
                  </h1>

                  <p className="text-lg md:text-xl text-muted mb-8 max-w-xl leading-relaxed">
                    Discover student-only deals, campus events, tickets, and line skips in one app.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button href={APP_STORE_URL} variant="primary" size="lg" className="!text-ink" external>
                      Download Bizzy
                    </Button>
                    <Button href="/businesses" variant="outline" size="lg">
                      For Businesses
                    </Button>
                  </div>
                </AnimatedSection>
              </div>

              {/* Mobile puts the video under the headline and CTA, per the brief. */}
              <div>
                <AnimatedSection delay={0.15} variant="fade-left">
                  <div className="relative flex justify-center lg:justify-end">
                    <div className="absolute -inset-6 bg-gradient-to-tr from-primary/25 via-emerald-300/15 to-transparent rounded-[3rem] blur-3xl pointer-events-none" />
                    <div className="relative">
                      <AutoLoopVideo
                        src="/videos/bizzy-slice.mp4"
                        poster="/images/bizzy-slice-poster.jpg"
                        label="A student shows a deal on their phone at the counter of a local pizzeria near campus, and walks away with a slice."
                        className="w-[280px] sm:w-[320px] lg:w-[360px] rounded-[2rem] ring-1 ring-black/5 shadow-2xl shadow-black/20"
                      />

                      {/* Floating deal card. Real deal from the live feed, never
                          a hardcoded offer against a real business's name. */}
                      {heroDeal && (
                        <div className="absolute -left-6 sm:-left-10 bottom-10 w-[210px] rounded-2xl bg-white border border-gray-100 shadow-2xl shadow-black/10 overflow-hidden animate-float">
                          <div className="relative aspect-[16/10] bg-gray-100">
                            <Image src={heroDeal.image} alt="" fill sizes="210px" className="object-cover" />
                            {heroDeal.savings > 0 && (
                              <span className="absolute top-2 right-2 bg-primary text-ink text-[10px] font-bold rounded-full px-2 py-0.5">
                                Save ${heroDeal.savings}
                              </span>
                            )}
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="text-[13px] font-bold text-ink leading-snug line-clamp-2">
                              {heroDeal.title}
                            </p>
                            <p className="text-[11px] text-muted mt-0.5 truncate">{heroDeal.business}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </SectionContainer>
        </section>

      {/* 1b. REDEMPTION -----------------------------------------------------
          Sits directly under the hero because a visitor can grasp "Bizzy has
          deals" and still have no idea how redeeming one works. One photograph
          answers it: the phone is readable, the offer is real, and she is
          holding what she got. Interface AND outcome in a single frame. */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_20%_50%,rgba(5,235,84,0.10),transparent_60%)] pointer-events-none" />
        <SectionContainer className="relative !py-16 md:!py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <div className="relative flex justify-center">
                <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-emerald-300/10 to-transparent rounded-[3rem] blur-3xl pointer-events-none" />
                <Parallax distance={22} className="relative">
                  <Image
                    src="/images/student-redeem-urbanbuzz.png"
                    alt="A student holding up her phone showing a live Bizzy deal, one dollar off any medium drink at Urban Buzz, with the Staff Member Tap Here button on screen, and holding the drink she redeemed in her other hand."
                    width={1086}
                    height={1448}
                    sizes="(max-width: 640px) 320px, (max-width: 1024px) 400px, 460px"
                    className="w-[320px] sm:w-[400px] lg:w-[460px] h-auto rounded-[2rem] shadow-2xl shadow-black/15 ring-1 ring-black/5"
                  />
                </Parallax>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.1} variant="fade-left">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">
                From your phone to the counter
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
                See it. Show it.{" "}
                <span className="marker-underline marker-draw">Save</span>.
              </h2>
              <p className="text-lg text-muted leading-relaxed mb-9 max-w-lg">
                Open your deal in Bizzy, show it to staff, and redeem it in seconds. No codes, no
                printing, nothing to set up.
              </p>

              <ol className="space-y-5">
                {REDEEM_STEPS.map((s) => (
                  <li key={s.n} className="flex items-start gap-4">
                    <span
                      className="w-8 h-8 rounded-lg bg-primary text-ink text-sm font-bold flex items-center justify-center flex-shrink-0"
                      aria-hidden
                    >
                      {s.n}
                    </span>
                    <div>
                      <h3 className="font-bold text-ink leading-snug">{s.t}</h3>
                      <p className="text-muted text-sm leading-relaxed mt-0.5">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-9">
                <Button href={APP_STORE_URL} variant="primary" size="lg" className="!text-ink" external>
                  Find Deals Near Campus
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>


      {/* 2. LOGO MARQUEE ---------------------------------------------------- */}
      <section className="py-12 md:py-14 overflow-hidden border-t border-gray-100">
        <p className="text-center text-[11px] font-semibold text-muted uppercase tracking-[0.2em] mb-8">
          Deals from places students already go
        </p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          <div className="flex animate-marquee" style={{ animationDuration: "30s" }}>
            {[...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS].map((logo, i) => (
              <div
                key={`${logo.alt}-${i}`}
                className="flex-shrink-0 mx-10 md:mx-12 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-300"
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

      {/* 3. AUDIENCE SPLIT -------------------------------------------------- */}
      <SectionContainer className="!pt-12 md:!pt-20">
        <AnimatedSection>
          <div className="max-w-3xl mb-10 md:mb-14">
            <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.18em] mb-3">
              Two sides. One platform.
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight">
              Pick your side.
            </h2>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {/* Student card */}
          <AnimatedSection variant="fade-right">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-primary-light via-white to-primary-light border border-primary/15 p-8 md:p-10 h-full min-h-[420px] hover:border-primary/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative z-10 max-w-sm">
                <div className="inline-flex items-center px-3 py-1 bg-white rounded-full text-primary-dark text-xs font-bold mb-5 shadow-sm">
                  For Students
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-ink mb-3 leading-tight">
                  Find what&apos;s happening on your campus.
                </h3>
                <p className="text-ink/70 text-base leading-relaxed mb-6">
                  Events, tickets, line skips, and local deals at the spots near you. Discover where to go, what to do, and how to save around campus.
                </p>
                <span className="inline-flex items-center gap-2 text-ink font-semibold group-hover:text-primary-dark transition-colors">
                  Download on the App Store
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>

              <div className="hidden md:block absolute -right-6 -bottom-12 w-[260px] rotate-[6deg] opacity-90 group-hover:rotate-[3deg] group-hover:-translate-y-2 transition-transform duration-500">
                <Image
                  src="/images/bizzy-taco-main.png"
                  alt="Bizzy Taco Bell deal on iPhone"
                  width={260}
                  height={462}
                />
              </div>
            </Link>
          </AnimatedSection>

          {/* Business card */}
          <AnimatedSection variant="fade-left" delay={0.1}>
            <Link
              href="/businesses"
              className="group relative block overflow-hidden rounded-3xl bg-ink p-8 md:p-10 h-full min-h-[420px] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute -right-20 -top-20 w-[400px] h-[400px] bg-primary/30 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-sm">
                <div className="inline-flex items-center px-3 py-1 bg-primary text-ink rounded-full text-xs font-bold mb-5">
                  For Businesses
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                  Get your business on <span className="text-primary-dark">Bizzy</span>
                </h3>
                <p className="text-white/70 text-base leading-relaxed mb-6">
                  List deals, promote events, and sell tickets to students near your campus. No setup fees, no monthly fees, and businesses keep 100% of ticket and cover revenue sold.
                </p>
                <span className="inline-flex items-center gap-2 text-white font-semibold group-hover:text-primary-dark transition-colors">
                  See how it works
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>

              <div className="absolute right-6 bottom-2 md:right-10 md:bottom-6 leading-none pointer-events-none">
                <div className="text-[180px] md:text-[240px] font-black text-primary/15 select-none">
                  0%
                </div>
              </div>
            </Link>
          </AnimatedSection>
        </div>
      </SectionContainer>

      {/* 3b. EVENTS & NIGHTLIFE ---------------------------------------------
          Real footage of a real Bizzy-powered night, not a screenshot of the
          events tab. The brief's rule: show the listing beside the actual
          crowd. The clip carries the room; the stills carry the faces. */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-primary/12 rounded-full blur-3xl pointer-events-none" />
        <SectionContainer className="relative !py-20 md:!py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[9fr_11fr] gap-12 lg:gap-16 items-center">
            {/* The night itself */}
            <AnimatedSection>
              <div className="relative flex justify-center lg:justify-start">
                <div className="absolute -inset-6 bg-gradient-to-tr from-primary/25 via-emerald-400/10 to-transparent rounded-[3rem] blur-3xl pointer-events-none" />
                <div className="relative">
                  <AutoLoopVideo
                    src="/videos/bizzy-event-night.mp4"
                    poster="/images/bizzy-event-poster.jpg"
                    label="Students at a themed Bizzy event: neon lights, a packed crowd, phones out."
                    className="w-[260px] sm:w-[300px] rounded-[2rem] ring-1 ring-white/15 shadow-2xl shadow-black/50"
                  />

                  {/* Two stills, pinned off the clip, so the section has faces
                      as well as a room. */}
                  <div className="hidden sm:block absolute -right-16 top-8 w-[150px] rotate-3 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl shadow-black/50">
                    <Image
                      src="/images/event-friends.jpg"
                      alt="Two students at a Bizzy event at night."
                      width={1206}
                      height={1171}
                      sizes="150px"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="hidden sm:block absolute -right-10 bottom-6 w-[135px] -rotate-2 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl shadow-black/50">
                    <Image
                      src="/images/event-crowd.jpg"
                      alt="A student in the crowd at a themed Bizzy event."
                      width={811}
                      height={763}
                      sizes="135px"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* The pitch */}
            <AnimatedSection delay={0.1} variant="fade-left">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">
                Events and nightlife
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                From finding the event to getting{" "}
                <span className="marker-sticker">
                  <span>through the door</span>
                </span>
                .
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-9 max-w-lg">
                Discover campus events, buy tickets, and skip the line. Everything stays in Bizzy, so
                there is nothing to print and nothing to lose at the door.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button href={APP_STORE_URL} variant="primary" size="lg" className="!text-ink" external>
                  Get the App
                </Button>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base text-white border-2 border-white/25 hover:border-white/60 hover:bg-white/5 transition-all"
                >
                  For venues
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>


      {/* 4. FOR STUDENTS - BENTO ------------------------------------------- */}
      <SectionContainer className="!pt-16 md:!pt-24">
        <AnimatedSection>
          <div className="max-w-2xl mb-10 md:mb-12">
            <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.18em] mb-3">
              For Students
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-4">
              The whole college town in your pocket.
            </h2>
            <p className="text-muted text-lg leading-relaxed">
              One feed for events, tickets, line skips, and exclusive deals at the spots near your school.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 auto-rows-[200px] md:auto-rows-[260px]">
          <AnimatedSection className="md:row-span-2">
            <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-gray-800 p-7 md:p-8 flex flex-col justify-between">
              <div className="relative z-10">
                <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">
                  Events & Tickets
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                  Tonight, this weekend, all season.
                </h3>
                <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
                  Discover events, buy tickets, and store them right in Bizzy. No third-party apps.
                </p>
              </div>

              <div className="hidden md:block absolute -right-8 -bottom-12 w-[240px] rotate-[6deg] z-10">
                <Image
                  src="/images/screen-5.png"
                  alt="Bizzy events screen"
                  width={240}
                  height={520}
                  className="rounded-[2rem] shadow-2xl"
                />
              </div>
              <div className="absolute -right-10 top-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1} className="md:col-span-2">
            <div className="relative h-full overflow-hidden rounded-3xl bg-primary-light p-7 md:p-8 flex items-center gap-6">
              <div className="flex-1">
                <p className="text-primary-dark text-xs font-bold uppercase tracking-widest mb-2">
                  Line Skip
                </p>
                <h3 className="text-xl md:text-2xl font-bold text-ink leading-tight mb-2">
                  Walk past the wait.
                </h3>
                <p className="text-ink/70 text-sm leading-relaxed max-w-md">
                  Skip the line at participating venues with a tap.
                </p>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white items-center justify-center shadow-lg">
                <svg
                  className="text-primary-dark w-10 h-10 md:w-12 md:h-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-white border border-gray-100 p-6 md:p-7 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-widest mb-2">
                Exclusive Deals
              </p>
              <h3 className="text-xl font-bold text-ink leading-tight mb-2">
                BOGOs, meal deals, and more.
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Bizzy-only offers from the places you actually go.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-white border border-gray-100 p-6 md:p-7 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-widest mb-2">
                Local Spots
              </p>
              <h3 className="text-xl font-bold text-ink leading-tight mb-2">
                Restaurants, bars, and hangouts.
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                All the student-friendly spots in one feed.
              </p>
            </div>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={0.2}>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button href={APP_STORE_URL} variant="primary" size="md" external>
              Get the App
            </Button>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* 5. FOR BUSINESSES - 0% block -------------------------------------- */}
      <section className="bg-ink relative overflow-hidden mt-16 md:mt-24">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <SectionContainer className="relative !py-16 md:!py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="max-w-xl">
                <p className="text-primary text-xs font-bold uppercase tracking-[0.18em] mb-4">
                  For Local Businesses
                </p>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                  Reach the students near you.{" "}
                  <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                    Keep 100%.
                  </span>
                </h2>
                <p className="text-white/70 text-lg leading-relaxed mb-8">
                  Bizzy is the only campus platform that takes zero cut. List deals, sell tickets, fill your venue. Free forever.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    "0% platform fees on deals and tickets",
                    "No POS integration",
                    "Setup in under 5 minutes",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckIcon className="text-primary w-3.5 h-3.5" />
                      </div>
                      <span className="text-white/90 text-base">{point}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button href="/businesses" variant="primary" size="lg">
                    List Your Business
                  </Button>
                  <Button
                    href={CALENDLY_DEMO_URL}
                    variant="white"
                    size="lg"
                    external
                    className="!bg-white/10 !text-white hover:!bg-white/20 backdrop-blur-sm"
                  >
                    Book a Call
                  </Button>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.15} variant="fade-left">
              <div className="relative flex items-center justify-center min-h-[420px]">
                <div className="relative">
                  <div className="text-[260px] md:text-[340px] lg:text-[400px] font-black leading-none bg-gradient-to-br from-primary to-emerald-400 bg-clip-text text-transparent select-none">
                    0%
                  </div>
                  <p className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm md:text-base font-semibold uppercase tracking-[0.2em] whitespace-nowrap">
                    Platform fees
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* 6. PARTNERSHIP ----------------------------------------------------- */}
      <section className="bg-white">
        <SectionContainer className="!py-16 md:!py-24">
          <AnimatedSection>
            <div className="max-w-4xl mx-auto">
              <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-white via-primary-light/30 to-white px-8 py-12 md:px-14 md:py-16">
                <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">
                  <div className="flex flex-col items-center md:items-start">
                    <p className="text-primary-dark text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
                      Partnership
                    </p>
                    <span
                      className="text-4xl md:text-5xl font-extrabold text-ink tracking-tight leading-none"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      Chartwells
                    </span>
                  </div>

                  <div className="hidden md:block w-px h-20 bg-gray-200 self-center" />

                  <p className="text-ink text-lg md:text-xl leading-relaxed text-center md:text-left md:col-start-2 md:row-start-1">
                    We&apos;re working with{" "}
                    <span className="font-semibold">Chartwells</span> to help
                    local businesses reach students on and off campus.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* 7. FAQ ------------------------------------------------------------- */}
      <section className="bg-gray-50">
        <SectionContainer>
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-10 md:mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-3">
                Common questions.
              </h2>
              <p className="text-muted text-lg">
                Everything you need to know about using Bizzy.
              </p>
            </div>
          </AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <FAQ items={STUDENT_FAQ} />
          </div>
        </SectionContainer>
      </section>

      {/* 8. FINAL CTA ------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-emerald-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
        <SectionContainer className="relative text-center !py-20 md:!py-28">
          <AnimatedSection>
            <h2 className="text-4xl md:text-6xl font-bold text-ink leading-tight tracking-tight mb-5">
              Bring Bizzy to your campus.
            </h2>
            <p className="text-ink/75 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Whether you&apos;re a student or a local business, Bizzy is the campus app you&apos;ve been waiting for.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button href={APP_STORE_URL} variant="white" size="lg" external>
                Get the App
              </Button>
              <Button
                href="/businesses"
                variant="white"
                size="lg"
                className="!bg-white/25 !text-ink hover:!bg-white/40 backdrop-blur-sm"
              >
                List Your Business
              </Button>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
