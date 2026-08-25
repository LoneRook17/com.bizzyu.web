"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, Copy, Loader2, Pencil, Plus, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import {
  ACCESS_ACCENT,
  ACCESS_BUTTON_VARIANT,
  DEFAULT_NIGHT_PREVIEW_COUNT,
  DEFAULT_SERIES_LOOKAHEAD_DAYS,
  easternToday,
  loadDoorAccessSeriesForPath,
  fmtNightDate,
  fmtQuantity,
  fmtWindow,
  formatDays,
  NIGHTS_HELPER_EDIT,
  NIGHTS_HELPER_VIEW,
  nightDateBlock,
  nightHref,
  nightPreviewChip,
  nightPreviewPrice,
  programEditHref,
  programHref,
  parseProgramPathId,
  MISSING_PROGRAM_ID_DESCRIPTION,
  MISSING_PROGRAM_ID_TITLE,
  PROGRAM_LINK_DESCRIPTION,
  PROGRAM_LINK_LABEL,
  EDIT_PROGRAM_LABEL,
  redemptionModeLabel,
  resolveNightCardImageUrl,
  splitNights,
  usdPrice,
  visibleUpcomingNights,
  WEEKLY_ACCESS_SECTION_LABEL,
  WEEKLY_ACCESS_TYPE_LABEL,
  type DoorAccessNight,
  type DoorAccessProgram,
} from "@/lib/business/door-access"
import { isoWeekdayOfDate, weekdayFlyerByDayFromNights } from "@/lib/business/weekly-cover-nights"
import { venuePageUrl } from "@/lib/business/public-links"
import { createFromTemplateHref } from "@/lib/business/create-from-template"
import { PageHeader } from "@/components/business/v2/PageHeader"
import ShareLinkRow from "@/components/business/v2/ShareLinkRow"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import {
  PromoCodesPanel,
  PROGRAM_PROMO_COPY,
} from "@/components/business/v2/promo/PromoCodesPanel"

/**
 * The Weekly Access SERIES page (F11 / D-F11.1).
 *
 * This screen is for looking at the program and opening ONE night. Program-wide
 * edits (nights of week, door hours, default tiers, flyer) live on
 * /business/door-access/:id/edit, opened from Edit program in the header.
 * Night cards stay tap-to-open. They are not a series editor.
 *
 * Nights render as a short strip of preview cards (next 4 upcoming). Far-future
 * ungenerated nights stay behind More nights. A card opens the existing
 * per-night page for price, capacity, or hours on that date only. Each card
 * shows that night's Custom flyer when GET sent one; other nights keep the
 * weekday / program flyer.
 */
export default function DoorAccessSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const programId = parseProgramPathId(id)
  const router = useRouter()
  const { user } = useAuth()
  const { venues } = useVenue()

  const [program, setProgram] = useState<DoorAccessProgram | null>(null)
  const [nights, setNights] = useState<DoorAccessNight[]>([])
  const [loading, setLoading] = useState(programId != null)
  const [error, setError] = useState<string | null>(null)
  const [lookahead, setLookahead] = useState(DEFAULT_SERIES_LOOKAHEAD_DAYS)
  const [showMoreNights, setShowMoreNights] = useState(false)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  const load = useCallback(async () => {
    if (programId == null) {
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    let redirected = false
    try {
      const loaded = await loadDoorAccessSeriesForPath(programId, lookahead)
      if (loaded.redirectTo != null) {
        redirected = true
        router.replace(programHref(loaded.redirectTo))
        return
      }
      if (!loaded.ok || !loaded.series) {
        setError("Could not load this program.")
        return
      }
      setProgram(loaded.series.program)
      setNights(loaded.series.nights)
    } catch {
      setError("Could not load this program.")
    } finally {
      if (!redirected) setLoading(false)
    }
  }, [programId, lookahead, router])

  useEffect(() => {
    load()
  }, [load])

  const today = useMemo(() => easternToday(), [])
  const { upcoming } = useMemo(() => splitNights(nights, today), [nights, today])
  const visibleNights = useMemo(
    () => visibleUpcomingNights(upcoming, showMoreNights),
    [upcoming, showMoreNights]
  )
  const hiddenCount = Math.max(0, upcoming.length - visibleNights.length)
  const showMoreControl = upcoming.length > DEFAULT_NIGHT_PREVIEW_COUNT || showMoreNights || program?.is_active
  const weekdayFlyerByDay = useMemo(
    () => (program ? weekdayFlyerByDayFromNights({ program, nights, today }) : {}),
    [program, nights, today]
  )

  if (loading && !program) {
    return (
      <>
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-[220px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </>
    )
  }

  if (programId == null) {
    return (
      <>
        <BackLink />
        <EmptyState
          icon={Zap}
          title={MISSING_PROGRAM_ID_TITLE}
          description={MISSING_PROGRAM_ID_DESCRIPTION}
        />
      </>
    )
  }

  if (error || !program) {
    return (
      <>
        <BackLink />
        <EmptyState
          icon={Zap}
          title="Program not found"
          description={error ?? `This ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} program isn't available.`}
        />
      </>
    )
  }

  return (
    <>
      <BackLink />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {program.name || WEEKLY_ACCESS_SECTION_LABEL}
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.06em]"
              style={{ backgroundColor: `${ACCESS_ACCENT}1A`, color: ACCESS_ACCENT }}
            >
              {WEEKLY_ACCESS_TYPE_LABEL}
            </span>
            {!program.is_active && <Badge variant="neutral">Ended</Badge>}
          </span>
        }
        description={[program.venue_name, formatDays(program.days_of_week)]
          .filter(Boolean)
          .join(" · ")}
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary">
                <Link href={createFromTemplateHref({ program_id: programId })}>
                  <Copy className="size-4" /> Use as template
                </Link>
              </Button>
              <Button asChild variant={ACCESS_BUTTON_VARIANT}>
                <Link href={programEditHref(programId)}>
                  <Pencil className="size-4" /> {EDIT_PROGRAM_LABEL}
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {program.venue_id != null && (
        <ShareLinkRow
          url={venuePageUrl(program.venue_id)}
          title={program.name || WEEKLY_ACCESS_SECTION_LABEL}
          label={PROGRAM_LINK_LABEL}
          description={PROGRAM_LINK_DESCRIPTION}
        />
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Nights</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            {canEdit ? NIGHTS_HELPER_EDIT : NIGHTS_HELPER_VIEW}
          </p>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming nights"
            description="Nights come from the program's active days and date range. Check both if you expected one here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visibleNights.map((night) => {
              const weekday = isoWeekdayOfDate(night.occurrence_date)
              return (
                <NightPreviewCard
                  key={night.occurrence_date}
                  night={night}
                  programId={programId}
                  flyerUrl={resolveNightCardImageUrl(
                    night,
                    program,
                    venues,
                    weekday != null ? weekdayFlyerByDay[weekday] : undefined,
                  )}
                />
              )
            })}
          </div>
        )}

        {upcoming.length > 0 && showMoreControl && (
          <div className="flex flex-wrap items-center gap-2">
            {loading && <Loader2 className="size-3.5 animate-spin text-neutral-400" />}
            {!showMoreNights ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMoreNights(true)}
              >
                {hiddenCount > 0 ? `More nights (${hiddenCount})` : "More nights"}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowMoreNights(false)
                    setLookahead(DEFAULT_SERIES_LOOKAHEAD_DAYS)
                  }}
                >
                  Show fewer nights
                </Button>
                <LookaheadPicker value={lookahead} onChange={setLookahead} />
              </>
            )}
          </div>
        )}
      </div>

      <ProgramTermsCard program={program} />

      <TemplateTiersCard program={program} />

      <ProgramPromoCodes program={program} canManage={canEdit} />
    </>
  )
}

/**
 * Promo codes scoped to THIS program.
 *
 * The gap this fills: a per-night code already worked (a night is an events
 * row) and a venue-wide code already covered every night (checkout resolves it
 * live), but "this program only, not the venue's other events" had no
 * representation at all. It does now, via `promo_codes.recurring_series_id`,
 * and checkout resolves event, then series, then venue: narrowest first.
 *
 * The screen itself is the venue page's, verbatim: same PromoCodesPanel,
 * different scope prop. Only the copy changes, and it changes because the reach
 * genuinely differs (a host must be able to read the blast radius off the
 * screen). The panel keys off `program.id`, the canonical series id from the
 * payload, NOT the path id, which may be a night's event_id on a deep link.
 */
function ProgramPromoCodes({
  program,
  canManage,
}: {
  program: DoorAccessProgram
  canManage: boolean
}) {
  const programName = program.name || WEEKLY_ACCESS_SECTION_LABEL

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Promo codes</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          Work on every night of this program, and on nothing else at{" "}
          {program.venue_name || "this venue"}. For a code that covers the venue’s whole
          calendar, use Universal Promo Codes.
        </p>
      </div>

      <PromoCodesPanel
        basePath={`/business/door-access/${program.id}/promo-codes`}
        copy={PROGRAM_PROMO_COPY(programName)}
        canManage={canManage}
        createButtonLabel="Create code"
        headerAction={(openCreate) =>
          canManage ? (
            <div className="flex">
              <Button size="sm" variant={ACCESS_BUTTON_VARIANT} onClick={openCreate}>
                <Plus className="size-4" /> Create code
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/business/door-access"
      className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
    >
      <ArrowLeft className="size-4" />
      {WEEKLY_ACCESS_SECTION_LABEL}
    </Link>
  )
}

function NightPreviewCard({
  night,
  programId,
  flyerUrl,
}: {
  night: DoorAccessNight
  programId: number
  flyerUrl: string | null
}) {
  const chip = nightPreviewChip(night)
  const dateBlock = nightDateBlock(night.occurrence_date)
  const href = nightHref(programId, night.occurrence_date)
  const soldLabel = night.passes_sold === 1 ? "1 sold" : `${night.passes_sold.toLocaleString("en-US")} sold`

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="relative aspect-[3/4] bg-neutral-100 dark:bg-neutral-800">
        {flyerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flyerUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <DateBlock block={dateBlock} />
        )}
        {chip && (
          <Badge
            variant={chip.variant}
            size="sm"
            className="absolute top-2 right-2 shadow-sm"
          >
            {chip.label}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {fmtNightDate(night.occurrence_date)}
        </p>
        <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
          {fmtWindow(night.start_time, night.end_time) || "Hours not set"}
        </p>
        <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
          {nightPreviewPrice(night)}
        </p>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{soldLabel}</p>
      </div>
    </Link>
  )
}

function DateBlock({
  block,
}: {
  block: { weekday: string; month: string; day: number } | null
}) {
  return (
    <div
      className="flex size-full flex-col items-center justify-center gap-0.5"
      style={{ backgroundColor: `${ACCESS_ACCENT}14`, color: ACCESS_ACCENT }}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.08em]">{block?.weekday ?? ""}</span>
      <span className="text-3xl font-semibold tabular-nums leading-none">{block?.day ?? ""}</span>
      <span className="text-[13px] font-medium">{block?.month ?? ""}</span>
    </div>
  )
}

/** Read-only facts. The editor is Edit program in the header, not here. */
function ProgramTermsCard({ program }: { program: DoorAccessProgram }) {
  const facts: Array<{ label: string; value: string }> = [
    { label: "Nights", value: formatDays(program.days_of_week) || "Not set" },
    { label: "Door hours", value: fmtWindow(program.start_time, program.end_time) || "Not set" },
    { label: "Venue", value: program.venue_name || "Not set" },
    { label: "Check-in", value: redemptionModeLabel(program.redemption_mode) },
    {
      label: "Runs",
      value: program.date_range_end
        ? `${fmtNightDate(program.date_range_start, { withYear: true })} to ${fmtNightDate(program.date_range_end, { withYear: true })}`
        : `From ${fmtNightDate(program.date_range_start, { withYear: true })} · no end date`,
    },
    { label: "Age", value: program.is_21_plus ? "21+" : "All ages" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program terms</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {fact.label}
              </dt>
              <dd className="mt-0.5 text-sm text-neutral-900 dark:text-neutral-100">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {program.promotion_enabled && (
          <div className="mt-4">
            <Badge variant="info">Promoter program on</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Read-only defaults. Per-night price and capacity live on the night page. */
function TemplateTiersCard({ program }: { program: DoorAccessProgram }) {
  const tiers = program.template_tickets

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tiers</CardTitle>
        <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Weekday defaults. Custom nights keep their own setup.
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        {tiers.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This program has no tiers yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {tiers.map((tier) => (
              <div
                key={tier.tier_key}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {tier.name}
                  </p>
                  {tier.description && (
                    <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                      {tier.description}
                    </p>
                  )}
                </div>
                <div className="flex items-baseline gap-4 text-sm">
                  <span className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
                    {usdPrice(tier.price_usd)}
                  </span>
                  <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
                    {fmtQuantity(tier.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Hidden behind More nights. The default view is the next 4 cards. */
function LookaheadPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (days: number) => void
}) {
  const options = [
    { days: 28, label: "4 weeks" },
    { days: 84, label: "12 weeks" },
    { days: 180, label: "6 months" },
  ]
  return (
    <div className="flex items-center gap-1.5">
      {options.map((option) => (
        <Button
          key={option.days}
          size="sm"
          variant={value === option.days ? "secondary" : "ghost"}
          onClick={() => onChange(option.days)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
