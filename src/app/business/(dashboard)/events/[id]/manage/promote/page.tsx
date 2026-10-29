"use client"

import { Link2, Megaphone, MessageSquare, Tag } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import { manageBase } from "@/lib/business/manage-tabs"
import { useManageEvent } from "@/lib/business/manage-event-context"
import { ActionList, ActionRow } from "@/components/business/v2/ManageActionList"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"

/**
 * BETA shell: the Promo & tracking tab's landing — a tight action list over
 * the four pages that already exist (promo codes, promoters, tracking links,
 * announcements). Same visibility rules the old tiles carried.
 */
export default function V2PromoteHubPage() {
  const { id, event, seriesActive } = useManageEvent()
  const { user } = useAuth()
  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const base = manageBase(id)
  const accent = event && isWeeklyCoverProduct(event) ? "access" : "event"

  const rows = [
    { href: `${base}/promo-codes`, icon: Tag, title: "Promo codes", subtitle: "Create discount codes", show: canEdit && seriesActive },
    { href: `${base}/promoters`, icon: Megaphone, title: "Promoters", subtitle: "Referral links and what they earn", show: true },
    // Wave 2B — host tracking links. Owners/managers only: the services gate
    // is requireBusinessRole(owner, manager), so staff would land on a 403.
    { href: `${base}/tracking-links`, icon: Link2, title: "Tracking links", subtitle: "Flyer and bio links, with clicks and sales", show: canEdit },
    { href: `${base}/announcements`, icon: MessageSquare, title: "Announcements", subtitle: "Notify ticket holders", show: true },
  ]

  return (
    <>
      <ManageSubheader eventId={id} title="Promo & tracking" subtitle="Reach more people and reward the ones who bring them." />
      <ActionList>
        {rows.filter((r) => r.show).map((r) => (
          <ActionRow key={r.href} href={r.href} icon={r.icon} title={r.title} subtitle={r.subtitle} accent={accent} />
        ))}
      </ActionList>
    </>
  )
}
