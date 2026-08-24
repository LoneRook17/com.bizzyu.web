"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { getApiBaseUrl } from "@/lib/api-url"
import {
  eventCalendarDate,
  eventFromPrice,
  fetchVenuePublicData,
  mergeVenueEvents,
  resolveVenueEventImageUrl,
  type VenueData,
  type VenueEvent,
} from "@/lib/venuePublic"

const POLL_INTERVAL_MS = 25000

const EVENT_GREEN = "#05EB54"
const ACCESS_PINK = "#FF3ED1"
const PAGE_BG = "#0a0a0f"

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
  if (todayKey && key === todayKey) return "Tonight"
  const d = parseCalendarDay(key)
  if (!d) return key
  return d.toLocaleDateString("en-US", { weekday: "long" })
}

function formatEventTime(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return "Time TBD"
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function hrefAbs(raw: string): string {
  return raw.startsWith("http") ? raw : `https://${raw}`
}

function groupUpcoming(events: VenueEvent[], todayKey: string | null) {
  const today = todayKey ? parseCalendarDay(todayKey) : new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  )
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

export default function VenuePageClient({
  venueId,
  initialData,
  checkoutBaseUrl,
}: VenuePageClientProps) {
  const [data, setData] = useState<VenueData | null>(initialData)
  const [isMobileUA, setIsMobileUA] = useState(false)
  const [todayKey, setTodayKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    setIsMobileUA(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white" style={pageFont}>
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
  const instagram = venue.instagram || business.instagram
  const website = venue.website || business.website
  const mapsUrl = venue.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`
    : null

  const { days, later } = groupUpcoming(events, todayKey)

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.share) {
        await navigator.share({ title: venue.name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // user cancelled share
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white" style={pageFont}>
      {heroImage && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[72vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt=""
            aria-hidden
            className="h-full w-full scale-150 object-cover opacity-70 blur-3xl"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 48%, #0a0a0f 100%)",
            }}
          />
        </div>
      )}

      <header className="relative z-20 flex items-center justify-between px-4 pb-2 pt-4">
        <a
          href="https://bizzyu.com"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/80 backdrop-blur-sm"
          aria-label="Bizzy home"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <button
          type="button"
          onClick={share}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/80 backdrop-blur-sm"
          aria-label="Share venue"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
      </header>
      {copied && (
        <p className="relative z-20 px-4 text-right text-xs text-white/50">Link copied</p>
      )}

      <div className="relative z-10 mx-auto max-w-lg px-4 pb-28">
        <div className="relative mt-2 aspect-square overflow-hidden rounded-xl bg-black/30">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={venue.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/30">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <h1
            className="absolute bottom-3.5 left-3.5 right-3.5 text-[26px] font-extrabold italic leading-[1.1] text-white"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.6)" }}
          >
            {venue.name.toUpperCase()}
          </h1>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
          <ActionLink
            href={mapsUrl}
            label="Directions"
            disabled={!mapsUrl}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            }
          />
          <ActionLink
            href={website ? hrefAbs(website) : null}
            label="Website"
            disabled={!website}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            }
          />
          <ActionLink
            href={instagram ? `https://instagram.com/${instagram.replace(/^@/, "")}` : null}
            label="Instagram"
            disabled={!instagram}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8a5 5 0 015-5h8a5 5 0 015 5v8a5 5 0 01-5 5H8a5 5 0 01-5-5V8zm13.5-1.5h.01M12 9a3 3 0 100 6 3 3 0 000-6z" />
            }
          />
        </div>

        {venue.description?.trim() && (
          <p className="mt-5 text-[15px] leading-relaxed text-white/55">{venue.description.trim()}</p>
        )}

        {days.map(([key, rows]) => (
          <section key={key} className="mt-7">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-[1.2px] text-white/45">
              {formatDayHeader(key, todayKey)}
            </p>
            <div className="space-y-2">
              {rows.map((event) => (
                <UpcomingRow
                  key={event.event_id}
                  event={event}
                  venue={venue}
                  checkoutBaseUrl={checkoutBaseUrl}
                  tonight={todayKey != null && eventCalendarDate(event.start_date_time) === todayKey}
                />
              ))}
            </div>
          </section>
        ))}

        {later.length > 0 && (
          <section className="mt-7">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-[1.2px] text-white/45">Later</p>
            <div className="space-y-2">
              {later.map((event) => (
                <UpcomingRow
                  key={event.event_id}
                  event={event}
                  venue={venue}
                  checkoutBaseUrl={checkoutBaseUrl}
                  tonight={false}
                />
              ))}
            </div>
          </section>
        )}

        {days.length === 0 && later.length === 0 && (
          <p className="mt-10 text-center text-sm text-white/40">
            Nothing on the calendar yet. Open the Bizzy app to follow {venue.name}.
          </p>
        )}

        {deals.length > 0 && (
          <section className="mt-8">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-[1.2px] text-white/45">
              Deals at {venue.name.toUpperCase()}
            </p>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deal/${deal.id}`}
                  className="w-[164px] shrink-0"
                >
                  <div className="overflow-hidden rounded-xl bg-[#141420] ring-1 ring-white/10">
                    <div className="relative aspect-[0.82] bg-black/40">
                      {deal.deal_image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={deal.deal_image_path}
                          alt={deal.deal_title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#05EB54]/50">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="line-clamp-2 text-[13px] font-extrabold leading-snug text-white">
                        {deal.deal_title}
                      </p>
                      {deal.deal_type && (
                        <p className="mt-1 text-[11px] font-bold text-[#05EB54]">{deal.deal_type}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-14 text-center text-sm text-white/25">
          Powered by{" "}
          <a href="https://bizzyu.com" className="font-semibold text-white/40 hover:text-[#05EB54]">
            Bizzy
          </a>
        </p>
      </div>

      {isMobileUA && (
        <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-5">
          <a
            href={`bizzy://venue/${venue.id}`}
            className="flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-6 py-3.5 text-base font-extrabold text-black shadow-2xl shadow-[#05EB54]/40 ring-1 ring-black/10 active:scale-[0.97]"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Open in the Bizzy app
          </a>
        </div>
      )}
    </div>
  )
}

const pageFont = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  backgroundColor: PAGE_BG,
} as const

function ActionLink({
  href,
  label,
  disabled,
  icon,
}: {
  href: string | null
  label: string
  disabled?: boolean
  icon: ReactNode
}) {
  const className =
    "flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-[12px] font-semibold text-white/80"
  const body = (
    <>
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        {icon}
      </svg>
      {label}
    </>
  )
  if (disabled || !href) {
    return <span className={`${className} cursor-default opacity-35`}>{body}</span>
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${className} hover:border-white/25 hover:bg-white/[0.07]`}>
      {body}
    </a>
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
  const door = event.access_kind === "door_access"
  const accent = door ? ACCESS_PINK : EVENT_GREEN
  const image = resolveVenueEventImageUrl(event, venue)
  const price = eventFromPrice(event)
  const href = `${checkoutBaseUrl.replace(/\/$/, "")}/checkout/${event.event_id}`

  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2 pr-3 ring-1 ring-white/8"
      style={tonight ? { boxShadow: `0 0 0 1px ${accent}99` } : undefined}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/40">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: `${accent}22` }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-extrabold text-white">{event.name}</p>
          {door && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-wide text-black"
              style={{ backgroundColor: ACCESS_PINK }}
            >
              WEEKLY COVER
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] font-medium text-white/45">
          {formatEventTime(event.start_date_time)}
        </p>
      </div>
      {price && (
        <p className="shrink-0 text-[15px] font-extrabold" style={{ color: accent }}>
          {price}
        </p>
      )}
    </a>
  )
}
