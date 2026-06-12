"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getApiBaseUrl } from "@/lib/api-url"
import { openInApp } from "@/lib/open-in-app"

// How often the board silently re-fetches so newly-added events / tickets /
// line skips appear on the mounted screen without a manual reload.
const POLL_INTERVAL_MS = 25000

// Shape matches GET /ui/venues/venue/:venueId (com.bizzyu.services
// src/routes/venues.ts) — note the venue object is camelCase (venuePhotoUrl),
// not snake_case.
interface VenueData {
  venue: {
    id: number
    name: string
    address: string
    description: string | null
    venuePhotoUrl: string | null
    website: string | null
    instagram: string | null
  }
  business: {
    business_id: number
    name: string
    logo_image_url: string | null
    instagram: string | null
    website: string | null
  }
  events: Array<{
    event_id: number
    name: string
    start_date_time: string
    end_date_time: string
    venue_name: string
    flyer_image_url: string | null
    min_ticket_price: number | string | null
  }>
  deals: Array<{
    id: number
    deal_title: string
    description: string | null
    deal_image_path: string | null
    deal_category: string
    deal_type: string
  }>
  line_skips: Array<{
    id: number
    date: string
    start_time: string
    end_time: string
    price_cents: number
    capacity: number | null
    tickets_sold: number
    status: string
    line_skip_name: string
    line_skip_description: string | null
  }>
}

interface VenuePageClientProps {
  venueId: string
  initialData: VenueData | null
  highlightLineSkip?: string
  // Base for the Laravel event checkout (dev: http://3.80.143.224,
  // prod: https://bizzy-deals.com). Resolved server-side in page.tsx.
  checkoutBaseUrl: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

function formatEventTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free"
  return `$${(cents / 100).toFixed(2)}`
}

/** Big calendar-leaf date chip overlaid on event flyers. */
function DateChip({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr)
  const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  const day = d.getDate()
  return (
    <div className="absolute left-4 top-4 w-14 overflow-hidden rounded-xl bg-black/75 text-center shadow-lg ring-1 ring-white/15 backdrop-blur-sm">
      <p className="bg-[#05EB54] py-0.5 text-[10px] font-extrabold tracking-widest text-black">{mon}</p>
      <p className="py-1 text-xl font-extrabold leading-none text-white">{day}</p>
    </div>
  )
}

/** Section header with the brand accent bar + count badge. */
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#2ECB4E] to-[#05EB54]" />
      <h2 className="text-2xl font-extrabold tracking-tight text-white">{title}</h2>
      {typeof count === "number" && count > 0 && (
        <span className="rounded-full bg-[#05EB54]/15 px-2.5 py-0.5 text-sm font-bold text-[#05EB54]">{count}</span>
      )}
    </div>
  )
}

export default function VenuePageClient({
  venueId,
  initialData,
  highlightLineSkip,
  checkoutBaseUrl,
}: VenuePageClientProps) {
  const lineSkipRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<VenueData | null>(initialData)
  // Mobile-only affordances (open-in-app pill); the page doubles as an
  // in-bar sign board on big screens, which shouldn't get app nags.
  const [isMobileUA, setIsMobileUA] = useState(false)
  useEffect(() => {
    setIsMobileUA(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  // Scroll a shared line skip into view (deep link ?line_skip=<id>).
  useEffect(() => {
    if (highlightLineSkip && lineSkipRef.current) {
      lineSkipRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightLineSkip])

  // Live poll: silently swap in fresh data; keep last-good on error so the
  // sign never flashes an empty/error state.
  const inFlight = useRef(false)
  useEffect(() => {
    const id = setInterval(async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const r = await fetch(`${getApiBaseUrl()}/ui/venues/venue/${venueId}`, {
          cache: "no-store",
        })
        if (r.ok) setData(await r.json())
      } catch {
        // keep last-good data
      } finally {
        inFlight.current = false
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [venueId])

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white font-[family-name:var(--font-fira)]">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Venue Not Found</h1>
          <p className="text-gray-400">This venue doesn&apos;t exist or is no longer available.</p>
          <Link href="/" className="mt-4 inline-block font-medium text-[#05EB54] hover:underline">
            Back to Bizzy
          </Link>
        </div>
      </div>
    )
  }

  const { venue, business, events, deals, line_skips } = data
  // Venue photo only — the business logo is intentionally not used on this page.
  const heroImage = venue.venuePhotoUrl
  const resolvedInstagram = venue.instagram || business.instagram
  const resolvedWebsite = venue.website || business.website
  const mapsUrl = venue.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`
    : null

  const stats = [
    events.length > 0 && `${events.length} upcoming ${events.length === 1 ? "event" : "events"}`,
    line_skips.length > 0 && `${line_skips.length} line ${line_skips.length === 1 ? "skip" : "skips"}`,
    deals.length > 0 && `${deals.length} ${deals.length === 1 ? "deal" : "deals"}`,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-[family-name:var(--font-fira)]">
      {/* Page-scoped animations (globals.css is intentionally untouched) */}
      <style>{`
        @keyframes vpRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vpHeroZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes vpFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -25px); } }
        .vp-rise { animation: vpRise 0.6s cubic-bezier(0.21, 0.65, 0.36, 1) both; }
        .vp-hero-img { animation: vpHeroZoom 24s ease-in-out infinite alternate; }
        .vp-blob { animation: vpFloat 14s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .vp-rise, .vp-hero-img, .vp-blob { animation: none; }
        }
      `}</style>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-white">{venue.name}</p>
            {venue.address && <p className="truncate text-xs text-gray-400">{venue.address}</p>}
          </div>
          {events.length > 0 && (
            <a
              href="#events"
              className="hidden shrink-0 rounded-full bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-extrabold text-black shadow-lg shadow-[#05EB54]/25 transition hover:brightness-110 active:scale-[0.97] sm:inline-block"
            >
              Get tickets
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="relative w-full overflow-hidden">
        {heroImage ? (
          <div className="relative h-[320px] w-full sm:h-[400px] md:h-[460px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={venue.name} className="vp-hero-img h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/55 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative h-64 w-full overflow-hidden bg-[#0d0d14] sm:h-80">
            <div className="vp-blob absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#05EB54]/15 blur-3xl" />
            <div className="vp-blob absolute right-0 top-10 h-80 w-80 rounded-full bg-[#05EB54]/10 blur-3xl" style={{ animationDelay: "-7s" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 px-5 pb-8">
          <div className="vp-rise mx-auto max-w-5xl">
            <div className="min-w-0">
              {/* Venue name only — the parent business is often a legal name
                  (e.g. "XXX LLC") customers shouldn't see. */}
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                {venue.name}
              </h1>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-gray-200 ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
                >
                  <svg className="h-4 w-4 shrink-0 text-[#05EB54]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{venue.address}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-24">
        {/* About strip */}
        <div className="vp-rise mt-7 flex flex-col gap-5" style={{ animationDelay: "0.12s" }}>
          {venue.description && (
            <p className="max-w-3xl text-lg leading-relaxed text-gray-300">{venue.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            {stats.map((s) => (
              <span
                key={s}
                className="rounded-full border border-[#1e1e2e] bg-[#141420] px-3.5 py-1.5 text-sm font-semibold text-gray-300"
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#05EB54]" />
                {s}
              </span>
            ))}
            {resolvedInstagram && (
              <a
                href={`https://instagram.com/${resolvedInstagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#1e1e2e] bg-[#141420] px-3.5 py-1.5 text-sm font-semibold text-gray-200 transition hover:border-[#05EB54]/60 hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Instagram
              </a>
            )}
            {resolvedWebsite && (
              <a
                href={resolvedWebsite.startsWith("http") ? resolvedWebsite : `https://${resolvedWebsite}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#1e1e2e] bg-[#141420] px-3.5 py-1.5 text-sm font-semibold text-gray-200 transition hover:border-[#05EB54]/60 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                Website
              </a>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <section id="events" className="vp-rise mt-12 scroll-mt-20" style={{ animationDelay: "0.2s" }}>
          <SectionHeader title="Upcoming Events" count={events.length} />
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#1e1e2e] bg-[#141420]/60 px-6 py-14 text-center">
              <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-bold text-white">Nothing on the calendar yet</p>
              <p className="text-sm text-gray-400">Follow {venue.name} in the Bizzy app to hear about new events first.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {events.map((event) => {
                const price = event.min_ticket_price !== null ? Number(event.min_ticket_price) : null
                return (
                  // Event checkout lives on the Laravel app, not Vercel (no
                  // event page here yet) — external link, not a Next route.
                  <a
                    key={event.event_id}
                    href={`${checkoutBaseUrl}/checkout/${event.event_id}`}
                    className="group overflow-hidden rounded-3xl border border-[#1e1e2e] bg-[#141420] transition-all duration-300 hover:-translate-y-1 hover:border-[#05EB54]/60 hover:shadow-[0_24px_60px_-20px_rgba(5,235,84,0.35)]"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-[#0d0d14]">
                      {event.flyer_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={event.flyer_image_url}
                          alt={event.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-10 w-10 text-[#05EB54]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141420] via-transparent to-transparent" />
                      <DateChip dateStr={event.start_date_time} />
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-extrabold leading-snug text-white">{event.name}</h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#fbbf24]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatEventDate(event.start_date_time)} · {formatEventTime(event.start_date_time)}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        {price !== null ? (
                          <p className="text-2xl font-extrabold text-[#05EB54]">
                            {price === 0 ? "Free" : `From $${price.toFixed(2)}`}
                          </p>
                        ) : (
                          <span />
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#05EB54]/15 px-4 py-2 text-sm font-extrabold text-[#05EB54] transition group-hover:bg-[#05EB54] group-hover:text-black">
                          Get tickets
                          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </section>

        {/* Line Skips */}
        {line_skips.length > 0 && (
          <section className="vp-rise mt-12" style={{ animationDelay: "0.28s" }} ref={lineSkipRef}>
            <SectionHeader title="Skip the Line" count={line_skips.length} />
            <div className="grid gap-5 md:grid-cols-2">
              {line_skips.map((ls) => {
                const isHighlighted = highlightLineSkip === String(ls.id)
                const available = ls.capacity !== null ? Math.max(0, ls.capacity - ls.tickets_sold) : null
                const soldOut = ls.capacity !== null && ls.tickets_sold >= ls.capacity
                const pctSold = ls.capacity ? Math.min(100, Math.round((ls.tickets_sold / ls.capacity) * 100)) : 0

                return (
                  <Link
                    key={ls.id}
                    href={soldOut ? "#" : `/lineskip/${venue.id}`}
                    aria-disabled={soldOut}
                    className={`group block rounded-3xl border bg-[#141420] p-6 transition-all duration-300 ${
                      isHighlighted
                        ? "border-[#05EB54] ring-2 ring-[#05EB54]/40"
                        : "border-[#1e1e2e] hover:-translate-y-1 hover:border-[#05EB54]/60 hover:shadow-[0_24px_60px_-20px_rgba(5,235,84,0.35)]"
                    } ${soldOut ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fbbf24]/15 text-[#fbbf24]">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13 2L4.094 12.688c-.391.469-.063 1.187.547 1.187H10l-1 8.125 8.906-10.688c.391-.469.063-1.187-.547-1.187H14l-1-8.125z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-extrabold text-white">{ls.line_skip_name}</h3>
                        <p className="mt-0.5 text-sm font-semibold text-[#fbbf24]">
                          {formatDate(ls.date)} · {formatTime(ls.start_time)} &ndash; {formatTime(ls.end_time)}
                        </p>
                        {ls.line_skip_description && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-400">{ls.line_skip_description}</p>
                        )}
                      </div>
                    </div>

                    {ls.capacity !== null && !soldOut && (
                      <div className="mt-4">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2ECB4E] to-[#05EB54]"
                            style={{ width: `${pctSold}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs font-semibold text-gray-400">
                          {available} of {ls.capacity} left{pctSold >= 75 ? " — going fast" : ""}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-2xl font-extrabold text-[#05EB54]">{formatPrice(ls.price_cents)}</span>
                      {soldOut ? (
                        <span className="rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-gray-400">Sold out</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#05EB54]/15 px-4 py-2 text-sm font-extrabold text-[#05EB54] transition group-hover:bg-[#05EB54] group-hover:text-black">
                          Skip the line
                          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Deals */}
        {deals.length > 0 && (
          <section className="vp-rise mt-12" style={{ animationDelay: "0.36s" }}>
            <SectionHeader title="Deals" count={deals.length} />
            <div className="grid gap-5 md:grid-cols-2">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openInApp(`bizzy://deal/${deal.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") openInApp(`bizzy://deal/${deal.id}`) }}
                  className="flex cursor-pointer items-start gap-4 rounded-3xl border border-[#1e1e2e] bg-[#141420] p-6 transition-colors hover:border-[#05EB54]/40 active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#05EB54]/15 text-[#05EB54]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-extrabold text-white">{deal.deal_title}</h3>
                    {deal.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">{deal.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-[#05EB54]/15 px-3 py-1 text-xs font-bold text-[#05EB54]">{deal.deal_type}</span>
                      <span className="text-xs font-semibold text-gray-500">Tap to claim in the Bizzy app</span>
                    </div>
                  </div>
                  {deal.deal_image_path && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={deal.deal_image_path} alt={deal.deal_title} className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Open-in-app pill — mobile browsers only. Tries bizzy://venue/:id,
            falls back to the App Store when the app isn't installed. */}
        {isMobileUA && (
          <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-5">
            <button
              onClick={() => openInApp(`bizzy://venue/${venue.id}`)}
              className="flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-6 py-3.5 text-base font-extrabold text-black shadow-2xl shadow-[#05EB54]/40 ring-1 ring-black/10 transition active:scale-[0.97]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Open in the Bizzy app
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 border-t border-white/5 pt-8 text-center">
          <p className="text-sm text-gray-600">
            Powered by{" "}
            <a href="https://bizzyu.com" className="font-semibold text-gray-400 transition hover:text-[#05EB54]">
              Bizzy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
