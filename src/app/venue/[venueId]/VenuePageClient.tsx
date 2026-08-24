"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getApiBaseUrl } from "@/lib/api-url"
import { WEEKLY_ACCESS_TYPE_LABEL } from "@/lib/business/weekly-cover-label"
import { ACCESS, EVENT_FILL } from "@/lib/checkout/surfaces"
import {
  eventCalendarDate,
  eventFromPrice,
  fetchVenuePublicData,
  formatAccessTierLabel,
  isVenueWeeklyCoverNight,
  mergeVenueEvents,
  resolveNightTiers,
  resolveVenueEventImageUrl,
  venueNightCheckoutHref,
  type VenueData,
  type VenueEvent,
} from "@/lib/venuePublic"

const POLL_INTERVAL_MS = 25000

interface VenuePageClientProps {
  venueId: string
  initialData: VenueData | null
  checkoutBaseUrl: string
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseCalendarDay(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(eventCalendarDate(iso))
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function formatDayHeader(key: string, todayKey: string | null): string {
  if (todayKey && key === todayKey) return "Happening Tonight"
  const d = parseCalendarDay(key)
  if (!d) return key
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

function formatEventTime(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return "Time TBD"
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function hrefAbs(raw: string): string {
  return raw.startsWith("http") ? raw : `https://${raw}`
}

function instagramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null
  let s = raw.trim()
  if (!s) return null
  const urlMatch = /instagram\.com\/+([^/?#\s]+)/i.exec(s)
  if (urlMatch) {
    s = urlMatch[1] ?? ""
  } else {
    s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] ?? ""
  }
  s = s.replace(/^@+/, "").replace(/\s+/g, "").replace(/[^A-Za-z0-9._]/g, "")
  if (!s) return null
  return s.slice(0, 30)
}

function groupUpcoming(events: VenueEvent[], todayKey: string | null) {
  const today = todayKey
    ? parseCalendarDay(todayKey)
    : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const weekEnd = today ? new Date(today) : null
  if (weekEnd) weekEnd.setDate(weekEnd.getDate() + 7)

  const byDay = new Map<string, VenueEvent[]>()
  const later: VenueEvent[] = []

  for (const event of events) {
    const key = eventCalendarDate(event.start_date_time)
    const day = parseCalendarDay(event.start_date_time)
    if (!key || !day || !today) continue
    if (day < today) continue
    if (weekEnd && day < weekEnd) {
      const list = byDay.get(key) ?? []
      list.push(event)
      byDay.set(key, list)
    } else {
      later.push(event)
    }
  }

  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
  for (const [, rows] of days) {
    rows.sort((a, b) => a.start_date_time.localeCompare(b.start_date_time))
  }
  later.sort((a, b) => a.start_date_time.localeCompare(b.start_date_time))
  return { days, later }
}

function rowPriceLabel(event: VenueEvent): string {
  return eventFromPrice(event).replace(/^From /, "")
}

export default function VenuePageClient({
  venueId,
  initialData,
  checkoutBaseUrl,
}: VenuePageClientProps) {
  const [data, setData] = useState<VenueData | null>(initialData)
  const [todayKey, setTodayKey] = useState<string | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    setTodayKey(localDateKey(new Date()))
  }, [])

  useEffect(() => {
    const id = setInterval(async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const next = await fetchVenuePublicData(venueId, getApiBaseUrl(), checkoutBaseUrl)
        if (next) {
          setData((prev) =>
            prev ? { ...next, events: mergeVenueEvents(prev.events, next.events) } : next,
          )
        }
      } catch {
        // keep last-good data
      } finally {
        inFlight.current = false
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [venueId, checkoutBaseUrl])

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] font-[family-name:var(--font-fira)] text-gray-100">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Venue Not Found</h1>
          <p className="text-white/50">This venue doesn&apos;t exist or is no longer available.</p>
          <a href="https://bizzyu.com" className="mt-4 inline-block font-medium text-[#05EB54] hover:underline">
            Back to Bizzy
          </a>
        </div>
      </div>
    )
  }

  const { venue, business, events, deals } = data
  const heroImage = venue.venuePhotoUrl
  const instagram = instagramHandle(venue.instagram || business.instagram)
  const website = (venue.website || business.website)?.trim() || null
  const mapsUrl = venue.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`
    : null
  const { days, later } = groupUpcoming(events, todayKey)
  const about = venue.description?.trim() ?? ""

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] font-[family-name:var(--font-fira)] text-gray-100">
      <style>{`
        .bg-blur-flyer { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .bg-blur-flyer img { width: 100%; height: 100%; object-fit: cover; filter: blur(80px) saturate(1.5); opacity: 0.15; transform: scale(1.2); }
        .flyer-glow { box-shadow: 0 0 60px rgba(5, 235, 84, 0.2), 0 0 120px rgba(5, 235, 84, 0.1); }
      `}</style>

      {heroImage && (
        <div className="bg-blur-flyer" aria-hidden>
          <img src={heroImage} alt="" />
        </div>
      )}

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="https://bizzyu.com" className="flex items-center">
                <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-10 w-auto" />
              </a>
              <div className="flex items-center gap-2">
                <a
                  href={`bizzy://venue/${venue.id}`}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-black transition hover:opacity-90"
                  style={{ backgroundColor: EVENT_FILL }}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Open in Bizzy app
                </a>
                <a
                  href="https://apps.apple.com/app/id6683306360"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Get the App
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24">
                {heroImage ? (
                  <img src={heroImage} alt={venue.name} className="flyer-glow w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-[#1e1e2e] bg-[#141420]">
                    <svg className="h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-3">
              <div>
                <h2 className="mb-4 text-3xl font-extrabold leading-tight text-white lg:text-4xl">{venue.name}</h2>
                <div className="space-y-3">
                  {(venue.address || mapsUrl) && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1e1e2e] bg-[#141420]">
                        <svg className="h-5 w-5 text-[#05EB54]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{venue.name}</p>
                        {mapsUrl ? (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-[#33f77c]">
                            {venue.address || "Directions"}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400">{venue.address}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {(website || instagram) && (
                    <div className="flex flex-wrap gap-2">
                      {website && (
                        <a
                          href={hrefAbs(website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[#1e1e2e] bg-[#141420] px-3 py-1.5 text-sm font-medium text-gray-300 hover:border-[#05EB54]/50 hover:text-white"
                        >
                          Website
                        </a>
                      )}
                      {instagram && (
                        <a
                          href={`https://instagram.com/${instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[#1e1e2e] bg-[#141420] px-3 py-1.5 text-sm font-medium text-gray-300 hover:border-[#05EB54]/50 hover:text-white"
                        >
                          Instagram
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {about && (
                <div className="rounded-2xl border border-[#1e1e2e] bg-[#141420]/50 p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">About</h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">{about}</p>
                </div>
              )}

              {days.map(([key, rows]) => (
                <section key={key}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    {formatDayHeader(key, todayKey)}
                  </h3>
                  <div className="space-y-3">
                    {rows.map((event) => (
                      <UpcomingRow key={event.event_id} event={event} venue={venue} />
                    ))}
                  </div>
                </section>
              ))}

              {later.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Later</h3>
                  <div className="space-y-3">
                    {later.map((event) => (
                      <UpcomingRow key={event.event_id} event={event} venue={venue} />
                    ))}
                  </div>
                </section>
              )}

              {days.length === 0 && later.length === 0 && (
                <p className="text-sm text-gray-500">Nothing on the calendar yet. Open the Bizzy app to follow {venue.name}.</p>
              )}

              {deals.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Deals at {venue.name}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/deal/${deal.id}`}
                        className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#141420] transition hover:border-[#05EB54]/50"
                      >
                        {deal.deal_image_path && (
                          <img src={deal.deal_image_path} alt={deal.deal_title} className="h-36 w-full object-cover" />
                        )}
                        <div className="p-4">
                          <p className="font-bold text-white">{deal.deal_title}</p>
                          {deal.deal_type && (
                            <p className="mt-1 text-sm font-semibold text-[#33f77c]">{deal.deal_type}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>

        <footer className="mt-12 border-t border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-6 text-center">
            <p className="text-sm text-gray-600">
              Powered by <span className="font-semibold text-gray-400">Bizzy</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function nightRowTheme(cover: boolean) {
  return {
    fill: cover ? ACCESS : EVENT_FILL,
    card: cover
      ? "border-access/40 hover:border-access/50 hover:shadow-[0_0_20px_rgba(255,62,209,0.15)]"
      : "border-[#1e1e2e] hover:border-[#05EB54]/50 hover:shadow-[0_0_20px_rgba(5,235,84,0.15)]",
    chip: cover
      ? "border-access/40 hover:border-access/50"
      : "border-[#1e1e2e] hover:border-[#05EB54]/50",
    price: cover ? "text-access" : "text-[#33f77c]",
    icon: cover ? "text-access/40" : "text-[#05EB54]/40",
  }
}

function UpcomingRow({
  event,
  venue,
}: {
  event: VenueEvent
  venue: VenueData["venue"]
}) {
  const cover = isVenueWeeklyCoverNight(event)
  const theme = nightRowTheme(cover)
  const image = resolveVenueEventImageUrl(event, venue)
  const price = rowPriceLabel(event)
  // Same-origin event checkout as /checkout/673 — WC and named events share it.
  const href = venueNightCheckoutHref("", event.event_id)
  const tiers = resolveNightTiers(event)

  return (
    <div
      className={`rounded-2xl border bg-[#141420] p-5 transition-[border-color,box-shadow] duration-200 ${theme.card}`}
    >
      <a href={href} className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]">
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center ${theme.icon}`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {cover && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-access">
              {WEEKLY_ACCESS_TYPE_LABEL}
            </p>
          )}
          <h4 className="truncate text-lg font-bold text-white">{event.name}</h4>
          <p className="mt-0.5 text-sm text-gray-400">{formatEventTime(event.start_date_time)}</p>
        </div>
        <div className="shrink-0 text-right">
          {price && (
            <p className={`text-xl font-bold ${price === "Free" ? theme.price : "text-white"}`}>
              {price}
            </p>
          )}
          <p className="mt-1 text-xs font-semibold" style={{ color: theme.fill }}>
            Get Tickets
          </p>
        </div>
      </a>
      {tiers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tiers.map((tier) => {
            const label = formatAccessTierLabel(tier)
            if (!label) return null
            return (
              <a
                key={`${tier.ticket_id ?? tier.name}-${tier.price_usd}`}
                href={venueNightCheckoutHref("", event.event_id, tier.ticket_id)}
                className={`rounded-full border bg-[#0a0a0f] px-3 py-1.5 text-sm font-semibold text-white ${theme.chip}`}
              >
                {label}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
