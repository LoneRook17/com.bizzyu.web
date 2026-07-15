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

export default function Home() {
  return (
    <>
      <JsonLd data={faqJsonLd} />

        {/* 1. HERO: the promise, and a real redemption playing beside it ------
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

                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-ink leading-[1.04] tracking-tight mb-6">
                    Your college town in{" "}
                    <span className="marker-underline marker-draw whitespace-nowrap">one app</span>.
                  </h1>

                  {/* The headline now carries "one app", so the sub says WHAT is
                      in it and WHERE, rather than repeating the phrase. */}
                  <p className="text-lg md:text-xl text-muted mb-8 max-w-xl leading-relaxed">
                    Student-only deals, campus events, tickets, and line skips at the spots right
                    around you.
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
                    <div className="absolute -inset-8 bg-gradient-to-tr from-primary/25 via-emerald-300/15 to-transparent rounded-[3rem] blur-3xl pointer-events-none" />
                    <div className="relative">
                      {/* Nothing floats over it: the footage is the argument.
                          A 9:16 clip is 1.78x its width tall, so width alone
                          drove the hero to 1010px against a 900px fold. The
                          height cap is what actually makes it fit; object-cover
                          trims a little off the top and bottom rather than
                          letterboxing, and the action sits centre-frame. */}
                      <AutoLoopVideo
                        src="/videos/bizzy-slice.mp4"
                        poster="/images/bizzy-slice-poster.jpg"
                        label="A student shows a deal on their phone at the counter of a local pizzeria near campus, and walks away with a slice."
                        className="w-[260px] sm:w-[320px] lg:w-[380px] max-h-[min(62vh,600px)] object-cover rounded-[2.5rem] ring-1 ring-black/5 shadow-2xl shadow-black/20"
                      />
                    </div>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </SectionContainer>
        </section>

      {/* 2. DEALS: how a redemption actually works ---------------------------
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


      {/* 3. EVENTS: how a night actually works -------------------------------
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


      {/* 4. PROOF: where the deals actually are ---------------------------- */}
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

      {/* 5. THE OTHER SIDE: for businesses --------------------------------- */}
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
                {/* The label used to be absolutely positioned inside the
                    numeral's own box, so on a 400px leading-none glyph it
                    landed on top of the "0%" instead of under it. It sits in
                    normal flow now and the numeral is capped so the pair reads
                    as one lockup. */}
                <div className="flex flex-col items-center">
                  <div className="text-[200px] md:text-[260px] lg:text-[300px] font-black leading-[0.85] bg-gradient-to-br from-primary to-emerald-400 bg-clip-text text-transparent select-none">
                    0%
                  </div>
                  <p className="mt-5 text-white/60 text-sm md:text-base font-semibold uppercase tracking-[0.25em] whitespace-nowrap">
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

                {/* Three tracks, one per child. This was two tracks with three
                    children: the rule auto-placed into r1c2 and the paragraph
                    was explicitly sent to r1c2 as well, so they occupied the
                    same cell and overlapped, which is what put a stray vertical
                    line through the copy. Nothing here is manually placed now. */}
                <div className="relative grid grid-cols-1 md:grid-cols-[auto_1px_1fr] gap-6 md:gap-12 items-center">
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

                  <div className="hidden md:block w-px h-20 bg-gray-200" aria-hidden />

                  <p className="text-ink text-lg md:text-xl leading-relaxed text-center md:text-left">
                    We&apos;re working with <span className="font-semibold">Chartwells</span> to help
                    university dining services connect with local students.
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
