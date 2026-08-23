"use client"

import { Zap } from "lucide-react"
import { programHref, WEEKLY_ACCESS_SECTION_LABEL } from "@/lib/business/door-access"
import {
  fmtRowDate,
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
 * program. This row exists so a stamped night still opens a rematched
 * listed program id, or /business/door-access/{recurring_series_id} when
 * that list is empty. Never hrefs an unlisted series id when the list has
 * programs that do not cover these nights.
 */
export function AccessEventGroupRow({ group }: { group: DoorAccessEventGroup }) {
  const first = group.events[0]
  const nights = group.events.length
  const meta = [
    first?.venue_name,
    first ? fmtRowDate(first.start_date_time) : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <HostListCard
      kind="access"
      href={programHref(group.programId)}
      title={group.name}
      meta={meta || WEEKLY_ACCESS_SECTION_LABEL}
      secondary={`${nights} ${nights === 1 ? "night" : "nights"} on this page`}
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
