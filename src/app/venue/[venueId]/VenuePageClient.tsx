"use client"

import { useEffect, useRef, useState } from "react"
import { getApiBaseUrl } from "@/lib/api-url"
import { WEEKLY_ACCESS_TYPE_LABEL } from "@/lib/business/weekly-cover-label"
import { ACCESS, EVENT_FILL } from "@/lib/checkout/surfaces"
import {
  eventCalendarDate,
  eventFromPrice,
  fetchVenuePublicData,
  isVenueWeeklyCoverNight,
  mergeVenueEvents,
  resolveVenueEventImageUrl,
  venueNightCheckoutHref,
  type VenueData,
  type VenueEvent,
} from "@/lib/venuePublic"

// BLADE PORT (Luke 2026-08-30). This page is the pixel-close port of core's
// deleted resources/views/public/venue.blade.php (core d8f4e3b3, removed by
// the HOST LOCK in #69 — Laravel GET /venue/{id} 302s HERE now, so this is
// the one venue page and it wears the blade's look):
//   - #0a0a0f, SF/Inter, antialiased
//   - fixed full-bleed blurred wash (venue photo, else first night image)
//   - square 1:1 hero, 12px radius, name overlaid bottom-left (italic
//     uppercase extra-bold, text-shadow); initials fallback
//   - Directions / Website / Instagram glass action buttons
//   - nights grouped per calendar date; tonight's group headed
//     "Happening Tonight" in green with a green row glow
//   - WC rows pink (chip + price via the shared ACCESS token), named events
//     green — never a business logo, never a door-scan note
// HOST LOCK stays: every night row links to LARAVEL checkout via
// venueNightCheckoutHref(checkoutBaseUrl, …), never same-origin /checkout.

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

/** Blade: Carbon `l, M j` — "Saturday, Aug 30". */
function formatDayHeader(key: string): string {
  const d = parseCalendarDay(key)
  if (!d) return key
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

/** Blade: strtolower(g:ia) — "9:00pm", joined " - " with the end time. */
function formatClockLower(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ""
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .toLowerCase()
}

function nightTimeLine(event: VenueEvent): string {
  const start = formatClockLower(event.start_date_time)
  if (!start) return ""
  const end = formatClockLower(event.end_date_time)
  return end ? `${start} - ${end}` : start
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

/** Blade: first letters of the first two words; "V" when nothing survives. */
function venueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").join("")
  return initials || "V"
}

/** Blade: every calendar date is its own section, in order. */
function groupByDay(events: VenueEvent[], todayKey: string | null) {
  const today = todayKey ? parseCalendarDay(todayKey) : null
  const byDay = new Map<string, VenueEvent[]>()
  for (const event of events) {
    const key = eventCalendarDate(event.start_date_time)
    const day = parseCalendarDay(event.start_date_time)
    if (!key || !day) continue
    if (today && day < today) continue
    const list = byDay.get(key) ?? []
    list.push(event)
    byDay.set(key, list)
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
  for (const [, rows] of days) {
    rows.sort((a, b) => a.start_date_time.localeCompare(b.start_date_time))
  }
  return days
}

/**
 * Blade price: "Free" or "$5", coloured by the night's accent. No "Sold out":
 * the blade derived it from availability, which the public payload
 * deliberately does not carry (count-disclosure guard) — a night with no
 * priceable tier just shows no price.
 */
function rowPriceLabel(event: VenueEvent): string {
  return eventFromPrice(event).replace(/^From /, "")
}

/** WC pink vs event green — the two shared accent tokens, nothing else. */
function nightRowTheme(cover: boolean) {
  return {
    fill: cover ? ACCESS : EVENT_FILL,
    price: cover ? "text-access" : "text-[#05EB54]",
  }
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-gray-100 antialiased">
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

  const { venue, business, events } = data
  const logo = venue.venuePhotoUrl?.trim() || null
  const wash =
    logo ?? (events[0] ? resolveVenueEventImageUrl(events[0], venue) : null)
  const instagram = instagramHandle(venue.instagram || business.instagram)
  // Blade: an Instagram chip ALWAYS renders — profile when known, else a
  // name search on Instagram itself.
  const instagramUrl = instagram
    ? `https://instagram.com/${instagram}`
    : `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(venue.name.trim())}`
  const website = (venue.website || business.website)?.trim() || null
  const mapQuery = [venue.name?.trim(), venue.address?.trim()].filter(Boolean).join(", ")
  const mapsUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null
  const days = groupByDay(events, todayKey)

  return (
    <div
      className="relative min-h-screen bg-[#0a0a0f] text-gray-100 antialiased"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, ui-sans-serif, sans-serif',
      }}
    >
      <style>{`
        .landing-title { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, ui-sans-serif, sans-serif; }
        .bg-blur-flyer { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; background: #0a0a0f; }
        .bg-blur-flyer img { width: 100%; height: 100%; object-fit: cover; filter: blur(64px); opacity: 0.45; transform: scale(1.55); }
        .bg-blur-flyer-veil { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(10,10,15,0.82)); }
        .venue-hero { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; border-radius: 12px; background: #111; }
        .venue-hero img { width: 100%; height: 100%; object-fit: cover; }
        .venue-hero-fade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.4) 72%, rgba(0,0,0,0.8) 100%); }
        .venue-hero-name { position: absolute; left: 14px; right: 14px; bottom: 14px; margin: 0; color: #fff; font-size: 26px; font-weight: 800; font-style: italic; line-height: 1.1; letter-spacing: -0.03em; text-transform: uppercase; text-shadow: 0 1px 10px rgba(0,0,0,0.6); }
        .venue-hero-initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 56px; font-weight: 800; color: rgba(255,255,255,0.35); }
        .action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 48px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.14); color: #fff; font-size: 13px; font-weight: 800; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
        .action-btn:hover { background: rgba(255,255,255,0.2); }
        .night-row { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 14px; border: 1px solid #2A2A33; background: #18181F; }
        .night-row.tonight { border-color: rgba(5, 235, 84, 0.55); box-shadow: 0 0 22px rgba(5, 235, 84, 0.45), 0 0 40px rgba(5, 235, 84, 0.18); }
        .night-thumb { width: 64px; height: 64px; border-radius: 10px; overflow: hidden; background: #111; flex-shrink: 0; }
        .night-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .day-tonight { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; color: #05EB54; line-height: 1.1; }
        @media (min-width: 1024px) {
          .venue-shell { display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 1fr); align-items: start; gap: 3.5rem; max-width: 72rem; }
          .venue-identity { position: sticky; top: 6rem; }
          .venue-hero-name { font-size: 36px; }
          .venue-nights { margin-top: 0; }
          .day-tonight { font-size: 26px; }
        }
      `}</style>

      {wash && (
        <div className="bg-blur-flyer" aria-hidden>
          <img src={wash} alt="" />
          <div className="bg-blur-flyer-veil" />
        </div>
      )}

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="https://bizzyu.com" className="flex items-center">
                <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-10 w-auto" />
              </a>
              {/* Luke (2026-08-30): two chips only — logo left, open-in-app
                  right. The deep link's App Store fallback covers phones
                  without the app. */}
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
            </div>
          </div>
        </header>

        <main className="venue-shell mx-auto w-full max-w-[430px] px-4 pb-16 pt-6 lg:max-w-6xl lg:px-8 lg:pt-10">
          <div className="venue-identity">
            <div className="venue-hero">
              {logo ? (
                <img src={logo} alt={venue.name} />
              ) : (
                <div className="venue-hero-initials">{venueInitials(venue.name)}</div>
              )}
              <div className="venue-hero-fade" />
              <h1 className="landing-title venue-hero-name">{venue.name}</h1>
            </div>

            <div className="mt-3 flex gap-2.5">
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="action-btn">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Directions
                </a>
              )}
              {website && (
                <a href={hrefAbs(website)} target="_blank" rel="noopener noreferrer" className="action-btn">
                  Website
                </a>
              )}
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="action-btn">
                Instagram
              </a>
            </div>
          </div>

          <div className="venue-nights mt-8 space-y-6">
            {days.map(([key, rows]) => {
              const isTonight = todayKey !== null && key === todayKey
              return (
                <section key={key}>
                  <p
                    className={
                      isTonight
                        ? "day-tonight mb-2.5"
                        : "mb-2.5 text-[14px] font-bold uppercase tracking-[1.2px] text-white/50"
                    }
                  >
                    {isTonight ? "Happening Tonight" : formatDayHeader(key)}
                  </p>
                  <div className="space-y-2">
                    {rows.map((event) => (
                      <UpcomingRow
                        key={event.event_id}
                        event={event}
                        venue={venue}
                        checkoutBaseUrl={checkoutBaseUrl}
                        tonight={isTonight}
                      />
                    ))}
                  </div>
                </section>
              )
            })}

            {days.length === 0 && (
              <p className="text-[13px] text-white/50">Nothing upcoming at this venue right now.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function UpcomingRow({
  event,
  venue,
  checkoutBaseUrl,
  tonight,
}: {
  event: VenueEvent
  venue: VenueData["venue"]
  checkoutBaseUrl: string
  tonight: boolean
}) {
  const cover = isVenueWeeklyCoverNight(event)
  const theme = nightRowTheme(cover)
  const image = resolveVenueEventImageUrl(event, venue)
  const price = rowPriceLabel(event)
  const timeLine = nightTimeLine(event)
  // Laravel GET /checkout/{eventId} — WC and named events share it. Relative
  // /checkout on this Next app would stay on Vercel (and now only 302s anyway).
  const href = venueNightCheckoutHref(checkoutBaseUrl, event.event_id)

  return (
    <a href={href} className={`night-row${tonight ? " tonight" : ""}`}>
      <div className="night-thumb">
        {image && <img src={image} alt="" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        {cover && (
          <p
            className="mb-1 inline-block rounded-lg px-2 py-[3px] text-[11px] font-extrabold uppercase tracking-[0.6px] text-access"
            style={{ background: "rgba(255, 62, 209, 0.16)" }}
          >
            {WEEKLY_ACCESS_TYPE_LABEL}
          </p>
        )}
        <p className="truncate text-[15px] font-bold leading-[1.2] text-white">{event.name}</p>
        {timeLine && <p className="mt-0.5 truncate text-[12px] text-white/55">{timeLine}</p>}
      </div>
      {price && (
        <p className={`shrink-0 text-[16px] font-extrabold ${theme.price}`}>{price}</p>
      )}
    </a>
  )
}
