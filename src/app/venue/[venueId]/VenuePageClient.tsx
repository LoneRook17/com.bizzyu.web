"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { getApiBaseUrl } from "@/lib/api-url"

// Base for the QR target — the venue's own public URL. Same pattern as the
// line-skip checkout client.
const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://bizzyu.com"

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
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
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
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatEventTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free"
  return `$${(cents / 100).toFixed(2)}`
}

// Uppercase section label, matching the Laravel checkout "kicker" style.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </h2>
  )
}

export default function VenuePageClient({
  venueId,
  initialData,
  highlightLineSkip,
}: VenuePageClientProps) {
  const lineSkipRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<VenueData | null>(initialData)

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
  const heroImage = venue.venuePhotoUrl || business.logo_image_url
  const resolvedInstagram = venue.instagram || business.instagram
  const resolvedWebsite = venue.website || business.website
  const venueUrl = `${WEB_BASE_URL}/venue/${venueId}`

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-[family-name:var(--font-fira)]">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          {business.logo_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={business.logo_image_url}
              alt={business.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight text-white">{venue.name}</p>
            {venue.address && (
              <p className="truncate text-xs text-gray-400">{venue.address}</p>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative w-full">
        {heroImage ? (
          <div className="relative h-64 w-full sm:h-80 md:h-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={venue.name}
              className="h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
          </div>
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-[#141420] to-[#0a0a0f] sm:h-56" />
        )}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-3xl font-extrabold text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
              {venue.name}
            </h1>
            {business.name !== venue.name && (
              <p className="mt-1 text-sm font-medium text-white/70">{business.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        {/* Description + social */}
        {venue.description && (
          <p className="mt-6 leading-relaxed text-gray-300">{venue.description}</p>
        )}
        {(resolvedInstagram || resolvedWebsite) && (
          <div className="mt-5 flex items-center gap-3">
            {resolvedInstagram && (
              <a
                href={`https://instagram.com/${resolvedInstagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#1e1e2e] bg-[#141420] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-[#05EB54]/50"
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[#1e1e2e] bg-[#141420] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-[#05EB54]/50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                Website
              </a>
            )}
          </div>
        )}

        {/* Line Skips */}
        {line_skips.length > 0 && (
          <section className="mt-10" ref={lineSkipRef}>
            <SectionLabel>Line Skips</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              {line_skips.map((ls) => {
                const isHighlighted = highlightLineSkip === String(ls.id)
                const available =
                  ls.capacity !== null ? Math.max(0, ls.capacity - ls.tickets_sold) : null
                const soldOut = ls.capacity !== null && ls.tickets_sold >= ls.capacity

                return (
                  <Link
                    key={ls.id}
                    href={soldOut ? "#" : `/lineskip/${business.business_id}`}
                    aria-disabled={soldOut}
                    className={`block rounded-2xl border bg-[#141420] p-5 transition-colors ${
                      isHighlighted
                        ? "border-[#05EB54] ring-2 ring-[#05EB54]/40"
                        : "border-[#1e1e2e] hover:border-[#05EB54]/50"
                    } ${soldOut ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <h3 className="text-lg font-bold text-white">{ls.line_skip_name}</h3>
                    <p className="mt-1 text-sm text-[#fbbf24]">
                      {formatDate(ls.date)} &middot; {formatTime(ls.start_time)} &ndash; {formatTime(ls.end_time)}
                    </p>
                    {ls.line_skip_description && (
                      <p className="mt-1 text-xs text-gray-400">{ls.line_skip_description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-2xl font-extrabold text-[#05EB54]">
                        {formatPrice(ls.price_cents)}
                      </span>
                      {soldOut ? (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-400">
                          Sold Out
                        </span>
                      ) : available !== null ? (
                        <span className="text-xs text-gray-400">{available} left</span>
                      ) : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section className="mt-10">
          <SectionLabel>Upcoming Events</SectionLabel>
          {events.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming events at this venue.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => {
                const price =
                  event.min_ticket_price !== null ? Number(event.min_ticket_price) : null
                return (
                  <Link
                    key={event.event_id}
                    href={`/checkout/${event.event_id}`}
                    className="group overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#141420] transition-colors hover:border-[#05EB54]/50"
                  >
                    {event.flyer_image_url && (
                      <div className="relative h-40 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={event.flyer_image_url}
                          alt={event.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white">{event.name}</h3>
                      <p className="mt-1 text-sm text-[#fbbf24]">
                        {formatEventDate(event.start_date_time)} &middot; {formatEventTime(event.start_date_time)}
                      </p>
                      {price !== null && (
                        <p className="mt-3 text-xl font-extrabold text-[#05EB54]">
                          {price === 0 ? "Free" : `From $${price.toFixed(2)}`}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Deals (secondary) */}
        {deals.length > 0 && (
          <section className="mt-10">
            <SectionLabel>Deals</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="rounded-2xl border border-[#1e1e2e] bg-[#141420] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-white">{deal.deal_title}</h3>
                      {deal.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-400">{deal.description}</p>
                      )}
                      <span className="mt-2 inline-block rounded-full bg-[#05EB54]/15 px-2.5 py-0.5 text-xs font-medium text-[#05EB54]">
                        {deal.deal_type}
                      </span>
                    </div>
                    {deal.deal_image_path && (
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={deal.deal_image_path}
                          alt={deal.deal_title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scan-to-view QR */}
        <section className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-[#1e1e2e] bg-[#141420] p-8 text-center">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={venueUrl} size={160} level="M" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Scan to view on your phone</p>
            <p className="mt-1 text-sm text-gray-400">
              Events, tickets &amp; line skips for {venue.name}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
