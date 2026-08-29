"use client"

import { useState, type ReactNode } from "react"
import { Repeat } from "lucide-react"
import {
  HOST_DASH_SCHEDULES,
  HOST_DASH_SCHEDULES_HELPER,
  HOST_DASH_TONIGHT,
  HOST_DASH_UPCOMING,
  HOST_DASH_UPCOMING_HELPER,
  groupOccurrencesByDate,
  visibleHostUpcoming,
  type HostDashOccurrence,
  type HostDashSchedule,
  type HostDashSections,
} from "@/lib/business/host-dash-sections"
import {
  fmtRowDate,
  seriesHref,
  type ListedProgramRef,
} from "@/lib/business/events-list"
import { formatDays } from "@/lib/business/door-access"
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"
import { AccessEventGroupRow } from "@/components/business/v2/door-access/AccessEventGroupRow"
import { EventCard } from "@/components/business/v2/events/EventCard"
import { CancelEventModal } from "@/components/business/v2/events/CancelEventModal"
import { Button } from "@/components/business/v2/ui/button"
import { HostCardThumbnail, HostListCard } from "@/components/business/v2/host/HostListCard"
import { AccessNightCard } from "@/components/business/v2/host/AccessNightCard"

function OccurrenceCard({
  row,
  programs,
  wcSeriesIds,
  inactiveWcIds,
  onCancel,
}: {
  row: HostDashOccurrence
  programs: readonly ListedProgramRef[]
  wcSeriesIds: readonly number[]
  inactiveWcIds: readonly number[]
  onCancel: (eventId: number, name: string) => void
}) {
  if (row.kind === "event") {
    return (
      <EventCard
        event={row.event}
        programs={programs}
        wcSeriesIds={wcSeriesIds}
        inactiveWcSeriesIds={inactiveWcIds}
      />
    )
  }
  if (row.kind === "access") {
    return (
      <AccessNightCard
        program={row.program}
        night={row.night}
        programs={programs}
        wcSeriesIds={wcSeriesIds}
        inactiveWcIds={inactiveWcIds}
        onCancel={onCancel}
      />
    )
  }
  return (
    <AccessNightCard
      event={row.event}
      programId={row.programId}
      programs={programs}
      wcSeriesIds={wcSeriesIds}
      inactiveWcIds={inactiveWcIds}
      onCancel={onCancel}
    />
  )
}

function ScheduleRow({ row }: { row: HostDashSchedule }) {
  if (row.kind === "access") {
    return <AccessProgramRow program={row.program} />
  }
  if (row.kind === "access-fallback") {
    return <AccessEventGroupRow group={row.group} />
  }
  const next = row.series?.next_occurrence_date
  return (
    <HostListCard
      kind="event"
      href={seriesHref(row.seriesId)}
      typeLabel="SERIES"
      title={row.name}
      meta={next ? `Next night ${fmtRowDate(next)}` : "Recurring event"}
      secondary={row.series ? formatDays(row.series.days_of_week) : undefined}
      chips={[{ label: "Series", variant: "info" }]}
      thumbnail={
        <HostCardThumbnail
          kind="event"
          src={row.series?.flyer_image_url}
          alt={row.name}
          icon={Repeat}
        />
      }
    />
  )
}

function OccurrenceDateGroups({
  rows,
  programs,
  wcSeriesIds,
  inactiveWcIds,
  onCancel,
}: {
  rows: readonly HostDashOccurrence[]
  programs: readonly ListedProgramRef[]
  wcSeriesIds: readonly number[]
  inactiveWcIds: readonly number[]
  onCancel: (eventId: number, name: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {groupOccurrencesByDate(rows).map((group) => (
        <div key={group.date} className="flex flex-col gap-3">
          <h3 className="text-[13px] font-semibold text-neutral-600 dark:text-neutral-400">
            {group.label}
          </h3>
          {group.rows.map((row) => (
            <OccurrenceCard
              key={row.key}
              row={row}
              programs={programs}
              wcSeriesIds={wcSeriesIds}
              inactiveWcIds={inactiveWcIds}
              onCancel={onCancel}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function Section({
  title,
  helper,
  children,
}: {
  title: string
  helper?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {helper ? (
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{helper}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/**
 * Flutter Host tab IA on the business Events list: Tonight, expandable
 * Upcoming, then Schedules. Occurrence cards stay pink WC / green Event.
 */
export function HostDashList({
  sections,
  programs,
  wcSeriesIds,
  inactiveWcIds,
  onNightCancelled,
}: {
  sections: HostDashSections
  programs: readonly ListedProgramRef[]
  wcSeriesIds: readonly number[]
  inactiveWcIds: readonly number[]
  onNightCancelled?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [cancel, setCancel] = useState<{ eventId: number; name: string } | null>(null)
  const upcomingRows = visibleHostUpcoming(sections, expanded)

  return (
    <div className="flex flex-col gap-8">
      {sections.tonight.length > 0 && (
        <Section title={HOST_DASH_TONIGHT}>
          <OccurrenceDateGroups
            rows={sections.tonight}
            programs={programs}
            wcSeriesIds={wcSeriesIds}
            inactiveWcIds={inactiveWcIds}
            onCancel={(eventId, name) => setCancel({ eventId, name })}
          />
        </Section>
      )}

      {sections.upcoming.length > 0 && (
        <Section title={HOST_DASH_UPCOMING} helper={HOST_DASH_UPCOMING_HELPER}>
          <OccurrenceDateGroups
            rows={upcomingRows}
            programs={programs}
            wcSeriesIds={wcSeriesIds}
            inactiveWcIds={inactiveWcIds}
            onCancel={(eventId, name) => setCancel({ eventId, name })}
          />
          {sections.upcomingRestCount > 0 && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded
                ? "Show less"
                : `Show ${sections.upcomingRestCount} more in this window`}
            </Button>
          )}
        </Section>
      )}

      {sections.schedules.length > 0 && (
        <Section title={HOST_DASH_SCHEDULES} helper={HOST_DASH_SCHEDULES_HELPER}>
          <div className="flex flex-col gap-3">
            {sections.schedules.map((row) => (
              <ScheduleRow key={row.key} row={row} />
            ))}
          </div>
        </Section>
      )}

      {cancel != null && (
        <CancelEventModal
          open
          onOpenChange={(open) => {
            if (!open) setCancel(null)
          }}
          eventId={cancel.eventId}
          eventName={cancel.name}
          onCancelled={() => {
            setCancel(null)
            onNightCancelled?.()
          }}
        />
      )}
    </div>
  )
}
