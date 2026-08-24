"use client"

import { useMemo, useState } from "react"
import { WEEKLY_ACCESS_SECTION_LABEL, WEEKLY_ACCESS_TYPE_LABEL } from "@/lib/business/weekly-cover-label"
import { ACCESS, ACCESS_CTA, ACCESS_LIGHT, GLASS, GLASS_SOFT } from "@/lib/checkout/surfaces"
import {
  eventCalendarDate,
  eventFromPrice,
  resolveNightTiers,
  type VenueData,
  type VenueEvent,
} from "@/lib/venuePublic"

function formatDate(dateStr: string) {
  const key = eventCalendarDate(dateStr)
  const d = new Date(`${key}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return "Time TBD"
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isTonight(dateStr: string, todayKey: string) {
  return eventCalendarDate(dateStr) === todayKey
}

function NightCard({
  night,
  tonight,
  isSelected,
  selectedTicketId,
  onSelect,
  onSelectTier,
}: {
  night: VenueEvent
  tonight: boolean
  isSelected: boolean
  selectedTicketId?: number | null
  onSelect: () => void
  onSelectTier: (ticketId?: number) => void
}) {
  const tiers = resolveNightTiers(night)
  const price = eventFromPrice(night).replace(/^From /, "") || ""

  return (
    <div className={tonight ? "" : "space-y-1.5"}>
      {!tonight && (
        <p className="px-0.5 text-xs font-extrabold tracking-tight text-white/50">
          {formatDate(night.start_date_time)}
        </p>
      )}
      <div
        className={`${GLASS} overflow-hidden transition-all duration-300 ${
          tonight ? "ls-tonight" : ""
        } ${isSelected ? "" : "cursor-pointer hover:-translate-y-0.5"}`}
        style={
          isSelected
            ? { borderColor: `${ACCESS}99`, boxShadow: `0 0 0 1px ${ACCESS}55, 0 24px 60px -20px ${ACCESS}40` }
            : tonight
              ? { borderColor: `${ACCESS}88`, boxShadow: `0 0 0 1px ${ACCESS}44, 0 22px 48px -12px ${ACCESS}70` }
              : undefined
        }
        onClick={onSelect}
      >
        <div className={tonight ? "px-4 py-3" : "px-3.5 py-2.5"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className={`font-extrabold leading-none text-white ${tonight ? "text-lg" : "text-[15px]"}`}>
                  {night.name}
                </h3>
                <span
                  className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.5px]"
                  style={{ backgroundColor: `${ACCESS}1f`, color: ACCESS }}
                >
                  {WEEKLY_ACCESS_TYPE_LABEL}
                </span>
              </div>
              <p className={`mt-1.5 leading-snug text-white/50 ${tonight ? "text-sm" : "text-xs"}`}>
                {formatTime(night.start_date_time)}
              </p>
            </div>
            <p className={`shrink-0 font-extrabold leading-none ${tonight ? "text-xl" : "text-lg"}`}>
              {price}
            </p>
          </div>
          {isSelected && tiers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tiers.map((tier) => {
                const active = selectedTicketId != null && selectedTicketId === tier.ticket_id
                return (
                  <button
                    key={`${tier.name}-${tier.ticket_id ?? tier.price_usd}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectTier(tier.ticket_id)
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-extrabold"
                    style={
                      active
                        ? { background: ACCESS_CTA, color: "#000" }
                        : { backgroundColor: `${ACCESS}1f`, color: ACCESS }
                    }
                  >
                    {tier.name} ${tier.price_usd}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WeeklyCoverCheckoutClient({
  seedId,
  initialNights,
  initialVenue,
}: {
  seedId: number
  initialNights: VenueEvent[]
  initialVenue: VenueData | null
}) {
  const nights = initialNights
  const venue = initialVenue?.venue
  const business = initialVenue?.business
  const todayKey = localDateKey()
  const [selectedId, setSelectedId] = useState(seedId)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)

  const selected = useMemo(
    () => nights.find((night) => night.event_id === selectedId) ?? nights[0] ?? null,
    [nights, selectedId],
  )

  const tonightNights = nights.filter((night) => isTonight(night.start_date_time, todayKey))
  const laterNights = nights.filter((night) => !isTonight(night.start_date_time, todayKey))
  const displayName = venue?.name || selected?.venue_name || "Venue"
  const displayAddress = venue?.address || ""
  const heroImage = selected?.flyer_image_url || venue?.venuePhotoUrl || business?.logo_image_url || null
  const mapsUrl = displayAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(`${displayName}, ${displayAddress}`)}`
    : null
  const checkoutHref = selected
    ? selectedTicketId
      ? `/checkout/${selected.event_id}?ticket_id=${selectedTicketId}`
      : `/checkout/${selected.event_id}`
    : "#"

  if (!selected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 font-[family-name:var(--font-fira)]">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Weekly Cover not found</h2>
          <a href="/" className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] font-[family-name:var(--font-fira)] text-white">
      <style>{`
        @keyframes lsRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lsHeroZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes lsFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -25px); } }
        @keyframes lsTonightPulse { 0%, 100% { box-shadow: 0 0 0 0 ${ACCESS}66; } 50% { box-shadow: 0 0 0 6px ${ACCESS}00; } }
        .ls-rise { animation: lsRise 0.6s cubic-bezier(0.21, 0.65, 0.36, 1) both; }
        .ls-hero-img { animation: lsHeroZoom 24s ease-in-out infinite alternate; }
        .ls-blob { animation: lsFloat 14s ease-in-out infinite; }
        .ls-tonight-pulse { animation: lsTonightPulse 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ls-rise, .ls-hero-img, .ls-blob, .ls-tonight-pulse { animation: none; }
        }
      `}</style>

      {heroImage && (
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <img src={heroImage} alt="" className="h-full w-full scale-[1.55] object-cover opacity-55 blur-[64px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-[#0a0a0f]/85" />
        </div>
      )}

      <div className="relative z-10">
        <header className="sticky top-0 z-40 bg-[#0a0a0f]/45 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
            <a href="https://bizzyu.com" className="flex shrink-0 items-center">
              <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-10 w-auto" />
            </a>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-tight text-white">{displayName}</p>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Directions"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
                </svg>
              </a>
            )}
            <a
              href="#nights"
              className="hidden shrink-0 rounded-full px-4 py-2 text-sm font-extrabold text-black shadow-lg transition hover:brightness-110 active:scale-[0.97] sm:inline-block"
              style={{ background: `${ACCESS_CTA}`, boxShadow: `0 8px 24px -8px ${ACCESS}80` }}
            >
              {WEEKLY_ACCESS_SECTION_LABEL}
            </a>
          </div>
        </header>

        <div className="ls-rise mx-auto max-w-3xl px-4 pt-2">
          <div className="overflow-hidden rounded-[18px]">
            <div className="relative h-[280px] w-full sm:h-[360px]">
              {heroImage ? (
                <img src={heroImage} alt={displayName} className="ls-hero-img h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 overflow-hidden bg-[#0d0d14]">
                  <div className="ls-blob absolute -left-20 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: `${ACCESS}26` }} />
                  <div className="ls-blob absolute right-0 top-10 h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: `${ACCESS}1a`, animationDelay: "-7s" }} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                  {displayName}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className={`mx-auto max-w-3xl px-5 ${selected ? "pb-44 sm:pb-24" : "pb-24"}`}>
          <div className="ls-rise mt-6" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {WEEKLY_ACCESS_SECTION_LABEL}
            </h2>
            <span
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.6px]"
              style={{ backgroundColor: `${ACCESS}1f`, color: ACCESS }}
            >
              {WEEKLY_ACCESS_TYPE_LABEL}
            </span>
            <p className="mt-2 text-sm text-white/50">
              Cover at the door. Pick a night from this weekly series.
            </p>
          </div>

          <section id="nights" className="ls-rise mt-10 scroll-mt-20" style={{ animationDelay: "0.18s" }}>
            {nights.length === 0 ? (
              <div className={`flex flex-col items-center gap-2 px-6 py-14 text-center ${GLASS_SOFT}`}>
                <p className="font-bold text-white">Nothing in the next 7 days</p>
                <p className="text-sm text-white/50">Check back soon, nights are added throughout the week.</p>
              </div>
            ) : (
              <>
                {tonightNights.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="h-6 w-1.5 rounded-full" style={{ background: `linear-gradient(180deg, ${ACCESS_LIGHT}, ${ACCESS})` }} />
                      <h2 className="text-2xl font-extrabold tracking-tight text-white">Happening Tonight</h2>
                    </div>
                    <div className="space-y-4">
                      {tonightNights.map((night) => (
                        <NightCard
                          key={night.event_id}
                          night={night}
                          tonight
                          isSelected={selected.event_id === night.event_id}
                          selectedTicketId={selectedTicketId}
                          onSelect={() => setSelectedId(night.event_id)}
                          onSelectTier={(id) => setSelectedTicketId(id ?? null)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {laterNights.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="h-6 w-1.5 rounded-full bg-white/30" />
                      <h2 className="text-xl font-extrabold tracking-tight text-white">
                        {tonightNights.length > 0 ? "Coming up" : "Pick your night"}
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {laterNights.map((night) => (
                        <NightCard
                          key={night.event_id}
                          night={night}
                          tonight={false}
                          isSelected={selected.event_id === night.event_id}
                          selectedTicketId={selectedTicketId}
                          onSelect={() => setSelectedId(night.event_id)}
                          onSelectTier={(id) => setSelectedTicketId(id ?? null)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <div className="ls-rise mt-8 hidden sm:block">
            <a
              href={checkoutHref}
              className="flex w-full items-center justify-center rounded-2xl py-4 text-lg font-extrabold text-black transition hover:brightness-110 active:scale-[0.98]"
              style={{ background: `${ACCESS_CTA}`, boxShadow: `0 16px 40px -12px ${ACCESS}80` }}
            >
              Get {WEEKLY_ACCESS_SECTION_LABEL}
            </a>
          </div>

          <div className={`mt-16 p-6 text-center ${GLASS}`}>
            <h2 className="mb-2 text-xl font-extrabold text-white">Get Weekly Cover in the app</h2>
            <p className="mb-5 text-sm text-gray-400">
              Manage your passes and check in from the Bizzy app.
            </p>
            {venue?.id && (
              <a
                href={`bizzy://venue/${venue.id}`}
                className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-extrabold text-black transition hover:brightness-110 active:scale-[0.98]"
                style={{ background: `${ACCESS_CTA}`, boxShadow: `0 16px 40px -12px ${ACCESS}80` }}
              >
                Open in the Bizzy app
              </a>
            )}
            <a
              href="https://apps.apple.com/app/id6683306360"
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-2xl border border-white/15 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Get the App
            </a>
          </div>

          <div className="mt-16 border-t border-white/5 pt-8 text-center">
            <p className="text-sm text-gray-600">
              Powered by{" "}
              <a href="https://bizzyu.com" className="font-semibold text-gray-400 transition hover:text-white">
                Bizzy
              </a>
              {" · "}
              <a href="/terms" className="hover:text-gray-400">Terms</a>
              {" · "}
              <a href="/privacy" className="hover:text-gray-400">Privacy</a>
            </p>
          </div>
        </div>

        {selected && (
          <div
            className="ls-rise fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a0f]/90 backdrop-blur-xl sm:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto max-w-3xl px-5 py-3">
              <a
                href={checkoutHref}
                className="block w-full rounded-2xl py-3.5 text-center text-base font-extrabold text-black transition hover:brightness-110 active:scale-[0.99]"
                style={{ background: `${ACCESS_CTA}`, boxShadow: `0 12px 32px -10px ${ACCESS}80` }}
              >
                Get {WEEKLY_ACCESS_SECTION_LABEL}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
