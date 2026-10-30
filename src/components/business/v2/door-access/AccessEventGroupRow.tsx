"use client"

import { Zap } from "lucide-react"
import { programHref, WEEKLY_ACCESS_SECTION_LABEL } from "@/lib/business/door-access"
import {
  fmtRowWhen,
  money,
  type DoorAccessEventGroup,
} from "@/lib/business/events-list"
import {
  HostCardThumbnail,
  HostListCard,
} from "@/components/business/v2/host/HostListCard"

/**
 * Fallback Weekly Cover row from GET /business/events nights.
 *
 * AccessProgramRow is preferred when GET /business/door-access returned the
 * program. This row exists so a stamped night still opens
 * /business/door-access/{recurring_series_id} when that list omits the
 * series. Never hrefs a night event_id.
 */
export function AccessEventGroupRow({ group }: { group: DoorAccessEventGroup }) {
  const first = group.events[0]
  const nights = group.events.length
  const meta = first?.venue_name ?? ""
  // Sums over the nights this page loaded, labelled as such (title attr).
  const sold = group.events.reduce((n, e) => n + Number(e.ticket_sales_count ?? 0), 0)
  const revenue = group.events.reduce((n, e) => n + Number(e.total_revenue ?? 0), 0)
  const shown = `${nights} ${nights === 1 ? "night" : "nights"} shown`

  return (
    <HostListCard
      kind="access"
      href={programHref(group.programId)}
      title={group.name}
      when={first ? fmtRowWhen(first.start_date_time) : undefined}
      meta={meta || WEEKLY_ACCESS_SECTION_LABEL}
      secondary={`${nights} ${nights === 1 ? "night" : "nights"} on this page`}
      sold={{ label: `sold · ${shown}`, value: sold.toLocaleString("en-US") }}
      revenue={{ label: `revenue · ${shown}`, value: money(revenue) }}
      thumbnail={
        <HostCardThumbnail
          kind="access"
          src={first?.flyer_image_url}
          alt={group.name}
          icon={Zap}
        />
      }
    />
  )
}
