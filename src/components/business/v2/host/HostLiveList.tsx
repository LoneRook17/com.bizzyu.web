"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import {
  HOST_LIVE_SCHEDULES_LABEL,
  HOST_LIVE_TONIGHT_LABEL,
  HOST_LIVE_UPCOMING_LABEL,
  type HostDateGroup,
  type HostLiveList as HostLiveListModel,
  type HostLiveNight,
} from "@/lib/business/host-live-list"
import type { ListedProgramRef } from "@/lib/business/events-list"
import { EventCard } from "@/components/business/v2/events/EventCard"
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"
import { AccessEventGroupRow } from "@/components/business/v2/door-access/AccessEventGroupRow"
import { Button } from "@/components/business/v2/ui/button"
import { HostDateSeparator } from "./HostDateSeparator"
import { ScheduleSeriesRow } from "./ScheduleSeriesRow"
import { WeeklyCoverNightCard } from "./WeeklyCoverNightCard"

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{children}</h2>
  )
}

function DateGroup({
  group,
  renderNight,
}: {
  group: HostDateGroup
  renderNight: (night: HostLiveNight) => ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <HostDateSeparator label={group.label} />
      {group.nights.map((night) => (
        <div key={night.key}>{renderNight(night)}</div>
      ))}
    </div>
  )
}

export function HostLiveList({
  list,
  programs = [],
  wcSeriesIds = [],
  inactiveWcIds = [],
  onNightCancelled,
}: {
  list: HostLiveListModel
  programs?: readonly ListedProgramRef[]
  wcSeriesIds?: readonly number[]
  inactiveWcIds?: readonly number[]
  onNightCancelled?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const inactive = new Set(inactiveWcIds)

  const renderNight = (row: HostLiveNight) => {
    if (row.kind === "access") {
      return (
        <WeeklyCoverNightCard
          program={row.program}
          night={row.night}
          seriesActive={!inactive.has(row.program.id)}
          onCancelled={onNightCancelled}
        />
      )
    }
    return (
      <EventCard
        event={row.event}
        programs={programs}
        wcSeriesIds={wcSeriesIds}
        inactiveWcSeriesIds={inactiveWcIds}
      />
    )
  }

  const hasUpcoming = list.upcomingPreview.length > 0 || list.upcomingRest.length > 0
  const restCount = list.upcomingRest.reduce((n, group) => n + group.nights.length, 0)

  return (
    <div className="flex flex-col gap-8">
      {list.tonight && (
        <section className="flex flex-col gap-3">
          <SectionHeading>{HOST_LIVE_TONIGHT_LABEL}</SectionHeading>
          <DateGroup group={list.tonight} renderNight={renderNight} />
        </section>
      )}

      {hasUpcoming && (
        <section className="flex flex-col gap-3">
          <SectionHeading>{HOST_LIVE_UPCOMING_LABEL}</SectionHeading>
          {list.upcomingPreview.map((group) => (
            <DateGroup key={group.date} group={group} renderNight={renderNight} />
          ))}
          {expanded &&
            list.upcomingRest.map((group) => (
              <DateGroup key={group.date} group={group} renderNight={renderNight} />
            ))}
          {list.upcomingRest.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              <ChevronDown className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
              {expanded
                ? "Show less"
                : `Show the rest of the window (${restCount} ${restCount === 1 ? "night" : "nights"})`}
            </Button>
          )}
        </section>
      )}

      {list.schedules.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>{HOST_LIVE_SCHEDULES_LABEL}</SectionHeading>
          {list.schedules.map((row) => {
            if (row.kind === "wc-program") {
              return <AccessProgramRow key={row.key} program={row.program} />
            }
            if (row.kind === "wc-fallback") {
              return <AccessEventGroupRow key={row.key} group={row.group} />
            }
            return <ScheduleSeriesRow key={row.key} series={row.series} />
          })}
        </section>
      )}
    </div>
  )
}
