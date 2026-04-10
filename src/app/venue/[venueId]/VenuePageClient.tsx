"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { APP_STORE_URL } from "@/lib/constants"

interface VenueData {
  venue: {
    venue_id: number
    name: string
    address: string
    description: string | null
    venue_photo_url: string | null
    business_id: number
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
    min_ticket_price: number | null
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
    instance_id: number
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

export default function VenuePageClient({
  venueId,
  initialData,
  highlightLineSkip,
}: VenuePageClientProps) {
  const lineSkipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (highlightLineSkip && lineSkipRef.current) {
      lineSkipRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightLineSkip])

  if (!initialData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-ink">Venue Not Found</h1>
          <p className="text-muted">This venue doesn&apos;t exist or is no longer available.</p>
          <Link href="/" className="mt-4 inline-block text-primary font-medium hover:underline">
            Back to Bizzy
          </Link>
        </div>
      </div>
    )
  }

  const { venue, business, events, deals, line_skips } = initialData
  const heroImage = venue.venue_photo_url || business.logo_image_url

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative w-full bg-ink">
        {heroImage ? (
          <div className="relative h-56 w-full sm:h-72 md:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={venue.name}
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-40 w-full bg-gradient-to-br from-ink to-gray-800 sm:h-56" />
        )}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-black text-white sm:text-4xl">{venue.name}</h1>
            {business.name !== venue.name && (
              <p className="mt-1 text-sm font-medium text-white/70">{business.name}</p>
            )}
            {venue.address && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {venue.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {venue.description && (
        <div className="mx-auto max-w-3xl px-6 pt-6">
          <p className="text-sm text-muted leading-relaxed">{venue.description}</p>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 pb-16">
        {/* Line Skips Section */}
        {line_skips.length > 0 && (
          <section className="mt-8" ref={lineSkipRef}>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                Line Skips
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {line_skips.map((ls) => {
                const isHighlighted = highlightLineSkip === String(ls.instance_id)
                const available = ls.capacity !== null
                  ? Math.max(0, ls.capacity - ls.tickets_sold)
                  : null
                const soldOut = ls.capacity !== null && ls.tickets_sold >= ls.capacity

                return (
                  <div
                    key={ls.instance_id}
                    className={`rounded-2xl border p-4 transition-shadow hover:shadow-md ${
                      isHighlighted
                        ? "border-primary bg-primary-light ring-2 ring-primary"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <h3 className="text-base font-bold text-ink">{ls.line_skip_name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(ls.date)} &middot; {formatTime(ls.start_time)} &ndash; {formatTime(ls.end_time)}
                    </p>
                    {ls.line_skip_description && (
                      <p className="mt-1 text-xs text-muted">{ls.line_skip_description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-ink">
                        {formatPrice(ls.price_cents)}
                      </span>
                      {available !== null && !soldOut && (
                        <span className="text-xs text-muted">{available} left</span>
                      )}
                    </div>
                    {soldOut ? (
                      <div className="mt-3 rounded-xl bg-gray-100 py-2.5 text-center text-sm font-semibold text-muted">
                        Sold Out
                      </div>
                    ) : (
                      <Link
                        href={`/lineskip/${business.business_id}`}
                        className="mt-3 block rounded-xl bg-ink py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                      >
                        Buy Line Skip
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-ink">Upcoming Events</h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted">No upcoming events at this venue.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {events.map((event) => (
                <div
                  key={event.event_id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
                >
                  {event.flyer_image_url && (
                    <div className="relative h-36 w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.flyer_image_url}
                        alt={event.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-base font-bold text-ink">{event.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {formatEventDate(event.start_date_time)} &middot; {formatEventTime(event.start_date_time)}
                    </p>
                    {event.min_ticket_price !== null && (
                      <p className="mt-1 text-sm font-medium text-ink">
                        {event.min_ticket_price === 0 ? "Free" : `From $${event.min_ticket_price.toFixed(2)}`}
                      </p>
                    )}
                    <Link
                      href={`/checkout/${event.event_id}`}
                      className="mt-3 block rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-ink transition-opacity hover:opacity-90"
                    >
                      Get Tickets
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Deals Section */}
        {deals.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-ink">Deals</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-ink">{deal.deal_title}</h3>
                      {deal.description && (
                        <p className="mt-1 text-sm text-muted line-clamp-2">{deal.description}</p>
                      )}
                      <span className="mt-2 inline-block rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-green-700">
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
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2">
                    <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium text-muted">Claim in the Bizzy app</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Download CTA */}
        <section className="mt-12 rounded-2xl bg-ink p-6 text-center">
          <h2 className="text-xl font-bold text-white">Get the Bizzy App</h2>
          <p className="mt-2 text-sm text-white/70">
            Claim deals, buy tickets, and skip the line — all in one app.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Download on the App Store
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
