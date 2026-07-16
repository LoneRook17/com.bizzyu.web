import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import FAQ from "@/components/ui/FAQ";
import Button from "@/components/ui/Button";
import SavingsCalculator from "@/components/events/SavingsCalculator";
import StickyDemoCTA from "@/components/events/StickyDemoCTA";
import VenueCarousel from "@/components/events/VenueCarousel";
import LiveEvents from "@/components/events/LiveEvents";
import AutoLoopVideo from "@/components/ui/AutoLoopVideo";
import BizzyMark from "@/components/ui/BizzyMark";
import { EVENTS_FAQ, CALENDLY_DEMO_URL } from "@/lib/constants";
import { fetchVenues, venuesWithPhotos } from "@/lib/venues";

export const metadata: Metadata = {
  title: "Fill Your Bar. Keep Every Dollar. | Bizzy for College Venues",
  description:
    "Bizzy gives college bars an unfair advantage: 0% platform fees, an auto-paid promoter army, SMS blasts to past attendees, and geofenced push to every nearby student. Book a 15-min demo.",
  alternates: {
    canonical: "https://bizzyu.com/events",
  },
  openGraph: {
    title: "Fill Your Bar. Keep Every Dollar. | Bizzy for College Venues",
    description:
      "0% platform fees. Auto-paid promoter program. SMS blasts. Geofenced push. Built for college bars.",
  },
};

const VENUE_CAPABILITIES = [
  {
    title: "Tap to Pay at the door",
    desc: "Collect cover with the iPhone in your hand. Stripe processes it. No cash to count, no fakes to argue about.",
  },
  {
    title: "Tickets, cover, and line skip",
    desc: "One checkout for every door product. Keep 100% of what you sell.",
  },
  {
    title: "Scoped door staff access",
    desc: "Staff scan, check in, and run cover from their own phone. They never see payouts or customer data.",
  },
  {
    title: "Live night dashboard",
    desc: "Headcount, revenue, line skips, promoter performance. On your phone, updating live as the night runs.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "1",
    title: "Book a 15-min call",
    desc: "We learn how your venue currently handles ticketing, cover, line skip, and door staff.",
  },
  {
    num: "2",
    title: "We set you up",
    desc: "We build your profile, events, ticket tiers, promo codes, staff access, and Stripe payout flow.",
  },
  {
    num: "3",
    title: "Run your first night",
    desc: "Sell tickets, collect cover, scan guests, manage entry, and track performance live.",
  },
  {
    num: "4",
    title: "Fill every night after",
    desc: "Promoter army, SMS blasts, geofenced push, and the talent we bring to top college bars keep your venue full week after week.",
  },
];

const USE_CASES = [
  "Weekly cover nights",
  "Line skip",
  "DJ nights",
  "Artist appearances",
  "Greek life events",
  "Bar crawls",
  "Theme nights",
  "VIP packages",
  "Free RSVP events",
  "Promoter-driven events",
  "Tailgate weekends",
  "Rivalry weekends",
  "Spring break events",
  "Graduation week events",
];

const FOUNDING_PERKS = [
  "0% venue platform fees",
  "Hands-on setup and staff onboarding",
  "Featured placement in the Bizzy app",
  "Priority access to talent and influencer events",
  "Promoter program white-glove setup",
  "Direct Stripe payout support",
  "Early access to new nightlife features",
  "Priority support during launch events",
];

const TALENT_MARQUEE = [
  "DJ TAKEOVERS",
  "TIKTOK CREATORS",
  "INFLUENCER NIGHTS",
  "BAR CRAWLS",
  "RECORDING ARTISTS",
  "THEME TAKEOVERS",
  "GREEK LIFE EVENTS",
  "TOUR STOPS",
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 flex-shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DemoButton({
  variant = "primary",
  size = "lg",
  className = "",
  children = "Book a 15-Min Call",
}: {
  variant?: "primary" | "outline" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Button
      href={CALENDLY_DEMO_URL}
      external
      variant={variant}
      size={size}
      className={className}
    >
      {children}
    </Button>
  );
}

/* ─── Phone mockup helpers for the "Fill the bar" section ─── */

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-[280px] md:w-[300px] aspect-[9/19.5] rounded-[42px] bg-black p-[10px] shadow-2xl ${className}`}
    >
      <div className="absolute left-1/2 top-2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-10" />
      <div className="relative w-full h-full rounded-[34px] overflow-hidden bg-gradient-to-b from-gray-900 to-black">
        {children}
      </div>
    </div>
  );
}

function SMSMockup() {
  return (
    <PhoneFrame className="rotate-[-3deg]">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-100 to-zinc-200">
        {/* Status bar */}
        <div className="flex justify-between items-center px-6 pt-4 pb-1 text-[11px] font-semibold text-black">
          <span>9:47</span>
          <div className="flex gap-1 items-center">
            <span>•••</span>
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>
        {/* Messages header */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-zinc-300/60 bg-zinc-100/80 backdrop-blur">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-black leading-tight">Bizzy</p>
            <p className="text-[10px] text-zinc-500 leading-tight">via McShane&apos;s</p>
          </div>
        </div>
        {/* Message bubble */}
        <div className="px-3 py-4 space-y-2">
          <p className="text-[9px] text-center text-zinc-500 uppercase tracking-wider">Now</p>
          <div className="max-w-[85%] bg-zinc-200 rounded-2xl rounded-bl-md px-3.5 py-2.5">
            <p className="text-[12px] text-black leading-snug">
              🍻 DJ Lava TONIGHT @ McShane&apos;s. Line forming. Grab a line skip $15:
              <br />
              <span className="text-blue-600 underline">bzy.app/m/r5d8</span>
            </p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function PushMockup() {
  return (
    <PhoneFrame className="rotate-[3deg]">
      {/* Lock screen */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-indigo-900 to-black">
        {/* Time */}
        <div className="text-center pt-14 pb-2">
          <p className="text-white text-[14px] font-medium">Friday, May 18</p>
          <p className="text-white text-[68px] font-light leading-none tracking-tight">10:47</p>
        </div>
        {/* Push notification */}
        <div className="absolute left-2.5 right-2.5 top-[200px]">
          <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-3 border border-white/10">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <p className="text-[11px] font-semibold text-white">BIZZY</p>
                  <p className="text-[10px] text-white/60">now</p>
                </div>
                <p className="text-[12px] font-semibold text-white leading-tight mb-0.5">
                  🎉 DJ on at 11 @ McShane&apos;s
                </p>
                <p className="text-[11px] text-white/80 leading-snug">
                  Line forming. Grab a line skip →
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function PromoterMockup() {
  return (
    <PhoneFrame className="rotate-[-2deg]">
      <div className="absolute inset-0 bg-zinc-50">
        {/* Status bar */}
        <div className="flex justify-between items-center px-6 pt-4 pb-1 text-[11px] font-semibold text-black">
          <span>9:47</span>
          <div className="flex gap-1">
            <span>📶 🔋</span>
          </div>
        </div>
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">Promoter Dashboard</p>
          <p className="text-[15px] font-bold text-black">Alex Chen</p>
        </div>
        {/* Earnings card */}
        <div className="mx-3 mt-3 bg-gradient-to-br from-ink to-zinc-800 rounded-2xl p-4 text-white">
          <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Earnings, this month</p>
          <p className="text-[32px] font-bold leading-none">$1,247</p>
          <p className="text-[11px] text-primary mt-2 font-semibold">+$284 pending payout →</p>
        </div>
        {/* Event row */}
        <div className="mx-3 mt-3 bg-white rounded-xl p-3 border border-zinc-200">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-black truncate">DJ Lava Night</p>
              <p className="text-[10px] text-zinc-500">McShane&apos;s • Fri</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-black leading-none">$120</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">12 tix · 10%</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-100">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Your link</p>
            <p className="text-[10px] text-primary font-mono truncate">bzy.app/m/alex</p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export default async function EventsPage() {
  // Every venue Bizzy runs, with its next event, straight from the app's own
  // public endpoint. A marketing page must never 500 because an API blipped,
  // so failure degrades to no carousel and no events section.
  let venues: Awaited<ReturnType<typeof fetchVenues>> = [];
  try {
    venues = await fetchVenues();
  } catch (err) {
    console.warn("[events] venue fetch failed", err);
  }

  return (
    <>
      {/* ─── 1. Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(5,235,84,0.18),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(168,85,247,0.12),transparent_50%)] pointer-events-none" />

        <SectionContainer className="relative !py-16 md:!py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur border border-white/10 rounded-full text-xs font-semibold mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-white">Built for college bars</span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6 text-white">
                  Fill Your Bar.
                  <br />
                  {/* The sticker moves to "Every Dollar": that is the promise
                      now, and it says the same thing as 100% in words a room
                      full of cash understands. */}
                  <span className="font-display-italic font-normal text-white">
                    Keep <span className="marker-sticker"><span>Every Dollar</span></span>.
                  </span>
                </h1>

                {/* "0% platform fees" is a claim an owner has to take on
                    faith. Naming the three things they actually sell, and the
                    two places they sell them, is checkable, and it mirrors the
                    headline: the first sentence is "Keep Every Dollar", the
                    second is "Fill Your Bar". */}
                <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl leading-relaxed">
                  Whatever you charge for a presale ticket, a line skip, or cover at the door is
                  exactly what you keep. Online or in your hand, Bizzy takes nothing. Then an
                  auto-paid promoter army and SMS blasts fill the room.
                </p>

                <div className="flex flex-wrap gap-3">
                  <DemoButton size="lg">Book a 15-Min Call</DemoButton>
                  <Button
                    href="#fill-the-bar"
                    variant="white"
                    size="lg"
                    className="!bg-white/10 !text-white hover:!bg-white/20 backdrop-blur-sm"
                  >
                    See how it works
                  </Button>
                </div>

                {/* Two columns, not three with a gap: "25K+ students
                    reachable" is gone. The two that remain are facts about
                    your own pricing, which is what a venue is weighing. */}
                <div className="mt-12 grid grid-cols-2 gap-6 max-w-xs">
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-primary leading-none">0%</p>
                    <p className="text-xs text-white/60 mt-1.5">Platform fees</p>
                  </div>
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-white leading-none">100%</p>
                    <p className="text-xs text-white/60 mt-1.5">Of ticket sales</p>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Hero visual: stacked SMS + push mockups */}
            <div className="lg:col-span-5">
              <AnimatedSection delay={0.15} variant="fade-left">
                {/* Mobile: single centered phone. Desktop: stacked SMS + push. */}
                <div className="md:hidden flex justify-center">
                  <div className="scale-90 origin-top">
                    <SMSMockup />
                  </div>
                </div>
                <div className="hidden md:block relative h-[600px]">
                  <div className="absolute right-0 top-0">
                    <SMSMockup />
                  </div>
                  <div className="absolute left-0 bottom-0 scale-90 z-10">
                    <PushMockup />
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* ─── 2. Savings calculator ───────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100">
        <SectionContainer className="!py-16 md:!py-20">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.18em] mb-3">The 0% Pitch</p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-4">
                See what you keep with Bizzy.
              </h2>
              <p className="text-muted text-lg">
                Plug in your monthly ticket + cover volume and your current platform fee. The difference is what stays with your venue.
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div className="max-w-4xl mx-auto">
              <SavingsCalculator />
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── 2.5 The venues themselves ───────────────────────
          Was a generic strip of every approved business logo, which on a
          nightlife page included every café and burrito shop. This is the
          actual bars, with photos of the actual rooms. */}
      <VenueCarousel venues={venuesWithPhotos(venues)} />

      {/* ─── 2.6 Real events, running right now ────────────── */}
      <LiveEvents venues={venues} />

      {/* ─── 3. FILL THE BAR (Promoter + SMS + Push) ────────── */}
      <section id="fill-the-bar" className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(5,235,84,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.1),transparent_60%)] pointer-events-none" />

        <SectionContainer className="relative !py-16 md:!py-32">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center mb-16 md:mb-24">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">The unfair advantage</p>
              <h2 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-5 text-white">
                Pull the crowd.
                <br />
                <span className="font-display-italic font-normal text-white">
                  Before doors even open.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-white/70 leading-relaxed">
                Two weapons no other ticketing platform gives you. Both included. No add-ons.
              </p>
            </div>
          </AnimatedSection>

          {/* ─ Block 1: Promoter Program ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center mb-16 md:mb-32">
            <AnimatedSection className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/15 border border-primary/30 rounded-full text-primary text-[11px] font-bold uppercase tracking-widest mb-5">
                <span className="text-base">①</span> Promoter Program
              </div>
              <h3 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight mb-5 text-white">
                Anyone can promote.
                <br />
                <span className="font-display-italic font-normal text-white">
                  <BizzyMark /> pays them out.
                </span>
              </h3>
              <p className="text-lg text-white/70 leading-relaxed mb-8">
                Set the commission per event. 5%, 10%, 20%. Anyone who wants to earn grabs a personal referral link with their name on it. No approval needed. Every ticket sold through that link auto-pays the promoter.{" "}
                <span className="text-white font-semibold">No spreadsheets. No Venmos. No arguments.</span>
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { k: "You set", v: "Commission % per event (you cap it)" },
                  { k: "Promoter shares", v: "Personalized link: bzy.app/m/alex" },
                  { k: "Bizzy tracks", v: "Every click, sale, and dollar" },
                  { k: "Bizzy pays out", v: "Automatically, within days" },
                ].map((row) => (
                  <div key={row.k} className="grid grid-cols-[120px_1fr] gap-4 items-baseline border-b border-white/5 pb-3">
                    <p className="text-primary text-xs font-bold uppercase tracking-wider">{row.k}</p>
                    <p className="text-white/90 text-sm md:text-base">{row.v}</p>
                  </div>
                ))}
              </div>

              <DemoButton>See it on a call</DemoButton>
            </AnimatedSection>

            <AnimatedSection delay={0.2} variant="fade-left" className="lg:col-span-5">
              <div className="relative flex justify-center">
                <div className="absolute -inset-10 bg-primary/10 rounded-full blur-3xl" />
                <div className="relative">
                  <PromoterMockup />
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* ─ Block 2: SMS Blast ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center mb-16 md:mb-32">
            <AnimatedSection variant="fade-right" className="lg:col-span-5 lg:order-1 order-2">
              <div className="relative flex justify-center">
                <div className="absolute -inset-10 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="relative">
                  <SMSMockup />
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection className="lg:col-span-7 lg:order-2 order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/15 border border-primary/30 rounded-full text-primary text-[11px] font-bold uppercase tracking-widest mb-5">
                <span className="text-base">②</span> SMS Blast
              </div>
              <h3 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight mb-5 text-white">
                Thursday at 4pm.
                <br />
                <span className="text-white/40 font-medium">
                  Your DJ night isn&apos;t selling.{" "}
                </span>
                <span className="font-display-italic font-normal">
                  Hit <span className="marker-sticker"><span>Blast</span></span>.
                </span>
              </h3>
              <p className="text-lg text-white/70 leading-relaxed mb-8">
                Every student who&apos;s attended a past event at your bar gets a text in 60 seconds. Personalized to your venue. One-tap to grab a line skip or ticket.{" "}
                <span className="text-white font-semibold">Included. Unlimited.</span>
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
                  <p className="text-2xl md:text-3xl font-bold text-primary leading-none mb-1.5">60s</p>
                  <p className="text-xs text-white/60">Compose to delivered</p>
                </div>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
                  <p className="text-2xl md:text-3xl font-bold text-primary leading-none mb-1.5">$0</p>
                  <p className="text-xs text-white/60">Per send, per month</p>
                </div>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
                  <p className="text-2xl md:text-3xl font-bold text-primary leading-none mb-1.5">1-tap</p>
                  <p className="text-xs text-white/60">Buy from the text</p>
                </div>
              </div>

              <DemoButton>Get on the list</DemoButton>
            </AnimatedSection>
          </div>
        </SectionContainer>
      </section>

      {/* ─── 4. Bizzy brings the names ──────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(5,235,84,0.08),transparent_55%)] pointer-events-none" />

        <SectionContainer className="relative !py-20 md:!py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">
                Talent Network
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                We bring the names.
                <br />
                <span className="font-display-italic font-normal text-white/45">
                  You host the night.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-white/60 leading-relaxed mb-8 max-w-xl">
                Over <span className="text-white font-bold">100 major influencer events</span> brought to top college bars nationwide. DJs with real followings. Creators with real reach. We bring the talent. Your bar gets the night.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "DJs with charting tracks and tour history",
                  "TikTok + Instagram creators with college-aged audiences",
                  "Influencer-driven theme nights and bar takeovers",
                  "Always scouting for new partner venues",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="text-primary w-3 h-3" />
                    </div>
                    <span className="text-white/85 text-base">{line}</span>
                  </div>
                ))}
              </div>

              <DemoButton>Bring a name to your bar</DemoButton>
            </AnimatedSection>

            {/* Was a "100+ major influencer events" numeral. A packed room is
                the better argument, and it is one we can actually show. */}
            <AnimatedSection delay={0.15} variant="fade-left">
              <div className="relative flex items-center justify-center min-h-[380px]">
                <div className="absolute -inset-12 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-transparent rounded-full blur-3xl" />
                <div className="relative">
                  <AutoLoopVideo
                    src="/videos/bizzy-event-night.mp4"
                    poster="/images/bizzy-event-poster.jpg"
                    label="A packed themed night at a Bizzy venue: neon lights, a full crowd, phones out."
                    className="w-[260px] sm:w-[300px] lg:w-[340px] max-h-[min(66vh,620px)] object-cover rounded-[2.5rem] ring-1 ring-white/15 shadow-2xl shadow-black/50"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>
        </SectionContainer>

        {/* Talent category ticker */}
        <div className="border-y border-white/10 bg-white/[0.03] py-6 md:py-8 overflow-hidden">
          <div
            className="flex animate-marquee gap-10 md:gap-14 whitespace-nowrap"
            style={{ animationDuration: "40s" }}
          >
            {[...Array(4)].flatMap((_, repeat) =>
              TALENT_MARQUEE.flatMap((label, i) => [
                <span
                  key={`${repeat}-${i}-label`}
                  className="text-xl md:text-3xl font-bold text-white/30 tracking-tight"
                >
                  {label}
                </span>,
                <span
                  key={`${repeat}-${i}-star`}
                  className="text-xl md:text-3xl text-primary/40"
                  aria-hidden
                >
                  ★
                </span>,
              ])
            )}
          </div>
        </div>
      </section>

      {/* ─── 5a. Self-Serve Dashboard ──────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(5,235,84,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.1),transparent_60%)] pointer-events-none" />

        <SectionContainer className="relative !py-20 md:!py-28">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">Self-Serve Dashboard</p>
              <h2 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-5 text-white">
                Every venue. Every shift.
                <br />
                <span className="font-display-italic font-normal text-white">
                  One dashboard.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-white/70 leading-relaxed">
                Manage all your venues in one place. Delegate to promoters, managers, and door staff with tools built in. You can post events within a day.
              </p>
            </div>
          </AnimatedSection>

          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "All your venues, one login",
                desc: "Manage every bar in your group from a single dashboard. Switch between them instantly. No spreadsheets, no separate logins.",
              },
              {
                title: "Delegate with scoped access",
                desc: "Add promoters, managers, and door staff with role-based permissions. They see what they need to do their job, nothing they don't.",
              },
              {
                title: "Post events within a day",
                desc: "Publish a new event in minutes. Set ticket tiers, line skip, cover, and promoter commission terms. Go live the same day.",
              },
            ].map((cap, i) => (
              <AnimatedSection key={cap.title} delay={i * 0.06}>
                <div className="h-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7 hover:-translate-y-1 hover:border-primary/40 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                    <CheckIcon className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2 leading-snug">{cap.title}</h3>
                  <p className="text-white/70 text-sm md:text-base leading-relaxed">{cap.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* ─── 5. Run your whole night ────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(5,235,84,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.1),transparent_60%)] pointer-events-none" />

        <SectionContainer className="relative !py-20 md:!py-28">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">Door + back office</p>
              <h2 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-5 text-white">
                Run your whole night
                <br />
                <span className="font-display-italic font-normal text-white">
                  from one phone.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-white/70 leading-relaxed">
                Tap to Pay, ticket scanning, scoped staff access, live revenue tracking. Everything you need to actually operate, in one app.
              </p>
            </div>
          </AnimatedSection>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
            {VENUE_CAPABILITIES.map((cap, i) => (
              <AnimatedSection key={cap.title} delay={i * 0.06}>
                <div className="h-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7 hover:-translate-y-1 hover:border-primary/40 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                    <CheckIcon className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 leading-snug">{cap.title}</h3>
                  <p className="text-white/70 text-base leading-relaxed">{cap.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* ─── 6. How it works ────────────────────────────────── */}
      <section className="bg-gray-50" id="how-it-works">
        <SectionContainer className="!py-20 md:!py-28">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.18em] mb-3">Onboarding</p>
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-4">
                One call. You&apos;re live.
              </h2>
              <p className="text-lg text-muted">
                Onboarding is hands-on. We get you live without the headache.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-12">
            {HOW_IT_WORKS.map((step, i) => (
              <AnimatedSection key={step.num} delay={i * 0.08}>
                <div className="relative bg-white rounded-2xl p-7 border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-emerald-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-4 shadow-lg shadow-primary/25">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2 leading-tight">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.3}>
            <div className="text-center">
              <DemoButton>Book your setup call</DemoButton>
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── 7. Use cases ───────────────────────────────────── */}
      <SectionContainer className="!py-16 md:!py-20">
        <AnimatedSection>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.18em] mb-3">Every kind of night</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink leading-tight tracking-tight">
              Cover, tickets, line skip, or RSVP.
            </h2>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
            {USE_CASES.map((u) => (
              <span
                key={u}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink hover:border-primary/40 hover:text-primary transition-colors"
              >
                {u}
              </span>
            ))}
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* ─── 9. Founding Venue Program ───────────────────────── */}
      <SectionContainer className="!py-20 md:!py-28">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink via-zinc-900 to-ink p-10 md:p-16 text-white">
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/40 rounded-full text-primary text-[11px] font-bold uppercase tracking-widest mb-6">
                Founding Venue Program
              </div>

              <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight mb-5 max-w-2xl text-white">
                Be the first Bizzy bar
                <br />
                <span className="font-display-italic font-normal text-white">
                  in <span className="marker-sticker"><span>your market</span></span>.
                </span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-2xl">
                We&apos;re onboarding select college bars ahead of fall. Founding venues get 0% platform fees, hands-on launch support, featured placement, and white-glove promoter program setup.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 max-w-3xl">
                {FOUNDING_PERKS.map((perk) => (
                  <div key={perk} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="text-primary w-3.5 h-3.5" />
                    </div>
                    <span className="text-white/90">{perk}</span>
                  </div>
                ))}
              </div>

              <DemoButton>Apply for founding access</DemoButton>
            </div>
          </div>
        </AnimatedSection>
      </SectionContainer>

      {/* ─── 10. FAQ ───────────────────────────────────────────── */}
      <section className="bg-gray-50" id="faq">
        <SectionContainer className="!py-20 md:!py-24">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-3">
                Common questions.
              </h2>
              <p className="text-muted text-lg">Everything bar owners ask before they book a call.</p>
            </div>
          </AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <FAQ items={EVENTS_FAQ} />
          </div>
        </SectionContainer>
      </section>

      {/* ─── 11. Final CTA ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-emerald-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_50%)] pointer-events-none" />
        <SectionContainer className="relative text-center !py-20 md:!py-28">
          <AnimatedSection>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
              Ready to fill your bar?
            </h2>
            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              15 minutes. We&apos;ll show you the promoter program, the SMS blast composer, and exactly how much you&apos;d keep with 0% fees.
            </p>
            <DemoButton variant="white" size="lg">Book a 15-Min Call</DemoButton>
            <p className="mt-6 text-white/80 text-sm">
              Free setup. Direct Stripe payouts. Built for college bars.
            </p>
          </AnimatedSection>
        </SectionContainer>
      </section>

      <StickyDemoCTA />
    </>
  );
}
