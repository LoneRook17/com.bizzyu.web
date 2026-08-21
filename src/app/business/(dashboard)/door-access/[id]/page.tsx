"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, ChevronRight, Loader2, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  ACCESS_ACCENT,
  easternToday,
  fetchDoorAccessSeries,
  fmtNightDate,
  fmtQuantity,
  fmtWindow,
  formatDays,
  nightChips,
  nightHref,
  redemptionModeLabel,
  splitNights,
  usdPrice,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessNight,
  type DoorAccessProgram,
} from "@/lib/business/door-access"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/**
 * The Weekly Access SERIES page (F11 / D-F11.1).
 *
 * The program is the thing a host manages; a night is one row inside it. So
 * this page carries the program's terms and template tiers at the top, and the
 * schedule below — and a night is opened FROM here for its per-night
 * overrides.
 *
 * THE NIGHT LIST IS THE SCHEDULE, NOT THE STAMPED ROWS. Core's generator only
 * materialises about a week ahead, so a stamped-only list would show a Friday
 * program with four nights and imply the rest don't exist. Nights the
 * generator hasn't reached yet come back with `is_stamped: false`, are marked
 * "Not generated yet", and are still openable — overrides key off the date, so
 * pricing a holiday weeks out works before the night exists.
 */
export default function DoorAccessSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const programId = Number(id)
  const { user } = useAuth()

  const [program, setProgram] = useState<DoorAccessProgram | null>(null)
  const [nights, setNights] = useState<DoorAccessNight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lookahead, setLookahead] = useState(28)

  // Staff read the whole series; role gates the write surfaces (D-F9.3).
  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDoorAccessSeries(programId, lookahead)
      setProgram(data.program)
      setNights(data.nights)
    } catch {
      setError("Could not load this program.")
    } finally {
      setLoading(false)
    }
  }, [programId, lookahead])

  useEffect(() => {
    load()
  }, [load])

  const today = useMemo(() => easternToday(), [])
  const { upcoming, past } = useMemo(() => splitNights(nights, today), [nights, today])

  if (loading && !program) {
    return (
      <>
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-[220px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
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
          description={error ?? "This weekly access program isn't available."}
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
            {program.name || "Weekly access"}
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.06em]"
              style={{ backgroundColor: `${ACCESS_ACCENT}1A`, color: ACCESS_ACCENT }}
            >
              WEEKLY ACCESS
            </span>
            {!program.is_active && <Badge variant="neutral">Ended</Badge>}
          </span>
        }
        description={[program.venue_name, formatDays(program.days_of_week)]
          .filter(Boolean)
          .join(" · ")}
      />

      <ProgramTermsCard program={program} />

      <TemplateTiersCard program={program} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Nights</h2>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              {canEdit
                ? "Open a night to change its price, capacity or hours for that date only."
                : "Open a night to see what it sells."}
            </p>
          </div>
          <LookaheadPicker value={lookahead} onChange={setLookahead} busy={loading} />
        </div>

        {upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No nights scheduled"
            description="Nights come from the program's active days and date range. Check both if you expected one here."
          />
        ) : (
          <div className="flex flex-col gap-5">
            <NightGroup
              heading="Upcoming"
              nights={upcoming}
              programId={programId}
              emptyNote="No upcoming nights in this window."
            />
            {past.length > 0 && (
              <NightGroup heading="Past" nights={past} programId={programId} muted />
            )}
          </div>
        )}
      </div>
    </>
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

/** The program's terms — everything that applies to every night by default. */
function ProgramTermsCard({ program }: { program: DoorAccessProgram }) {
  const facts: Array<{ label: string; value: string }> = [
    { label: "Nights", value: formatDays(program.days_of_week) || "—" },
    { label: "Door hours", value: fmtWindow(program.start_time, program.end_time) || "—" },
    { label: "Venue", value: program.venue_name || "—" },
    { label: "Check-in", value: redemptionModeLabel(program.redemption_mode) },
    {
      label: "Runs",
      value: program.date_range_end
        ? `${fmtNightDate(program.date_range_start, { withYear: true })} – ${fmtNightDate(program.date_range_end, { withYear: true })}`
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

/**
 * The template tiers — what every night sells unless that night overrides it.
 * Framed as defaults on purpose: the per-night editor is where a single date
 * departs from this, and the two must not read as competing sources of truth.
 */
function TemplateTiersCard({ program }: { program: DoorAccessProgram }) {
  const tiers = program.template_tickets

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tiers</CardTitle>
        <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Defaults for every night
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

/** How far ahead the schedule runs. The server clamps this at 180 days. */
function LookaheadPicker({
  value,
  onChange,
  busy,
}: {
  value: number
  onChange: (days: number) => void
  busy: boolean
}) {
  const options = [
    { days: 28, label: "4 weeks" },
    { days: 84, label: "12 weeks" },
    { days: 180, label: "6 months" },
  ]
  return (
    <div className="flex items-center gap-1.5">
      {busy && <Loader2 className="size-3.5 animate-spin text-neutral-400" />}
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

function NightGroup({
  heading,
  nights,
  programId,
  muted,
  emptyNote,
}: {
  heading: string
  nights: DoorAccessNight[]
  programId: number
  muted?: boolean
  emptyNote?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {heading}
      </h3>
      {nights.length === 0 ? (
        emptyNote ? (
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{emptyNote}</p>
        ) : null
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {nights.map((night) => (
            <NightRow
              key={night.occurrence_date}
              night={night}
              programId={programId}
              muted={muted}
            />
          ))}
        </Card>
      )}
    </div>
  )
}

function NightRow({
  night,
  programId,
  muted,
}: {
  night: DoorAccessNight
  programId: number
  muted?: boolean
}) {
  const chips = nightChips(night)
  const priced = night.tiers.filter((t) => !t.is_disabled)
  const lowest = priced.length > 0 ? Math.min(...priced.map((t) => t.price_usd)) : null

  return (
    <Link
      href={nightHref(programId, night.occurrence_date)}
      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              muted
                ? "text-sm font-medium text-neutral-500 dark:text-neutral-400"
                : "text-sm font-semibold text-neutral-900 dark:text-neutral-100"
            }
          >
            {fmtNightDate(night.occurrence_date)}
          </span>
          {chips.map((chip) => (
            <Badge key={chip.label} variant={chip.variant} size="sm">
              {chip.label}
            </Badge>
          ))}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-neutral-500 dark:text-neutral-400">
          {[
            fmtWindow(night.start_time, night.end_time),
            lowest != null ? `From ${usdPrice(lowest)}` : "No tiers on sale",
            `${priced.length} of ${night.tiers.length} tiers on sale`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-6 sm:flex">
        <div className="text-right">
          <p className="text-sm font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
            {night.passes_sold.toLocaleString("en-US")}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">passes sold</p>
        </div>
      </div>

      <ChevronRight className="size-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
    </Link>
  )
}
