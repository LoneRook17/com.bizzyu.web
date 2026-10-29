"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BarChart3, CalendarOff, Camera, CircleCheck, ListChecks, Loader2, Pencil, QrCode, Rocket, ScanLine,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { eventCheckoutUrl, isPubliclyLinkable } from "@/lib/business/public-links"
import { ACCESS_ACCENT, isWeeklyCoverProduct } from "@/lib/business/door-access"
import { weeklyCoverNightHasSales, weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { shouldTreatDraftAsLive } from "@/lib/business/live-after-approve"
import { manageBase } from "@/lib/business/manage-tabs"
import { useManageEvent } from "@/lib/business/manage-event-context"
import { browserStorage, removeShellDraftId } from "@/lib/business/shell-drafts"
import { usd } from "@/lib/v2/utils"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { MetricStrip } from "@/components/business/v2/MetricStrip"
import { ActionList, ActionRow } from "@/components/business/v2/ManageActionList"
import ShareLinkRow from "@/components/business/v2/ShareLinkRow"
import { eventStatusBadge } from "@/components/business/v2/events/eventStatus"

/**
 * BETA biz-dash shell, slice 1: Manage lands on OVERVIEW.
 *
 * Key stats · the next useful action · publish status · a short Insights
 * summary with the link out · the share link · tonight's door tools. The
 * equal-tile mall is gone; the rest of the old hub lives in the tabs above
 * (lib/business/manage-tabs.ts maps every old tile to its tab). Nothing was
 * rebuilt — every link below already existed.
 *
 * Door Code stays removed (BETA, Luke PRD 2026-10-29, change 4).
 */
export default function V2ManageOverviewPage() {
  const { id, event, seriesActive, loading, error, refresh } = useManageEvent()
  const { user, isPending, business } = useAuth()
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState("")

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  if (loading && !event) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 rounded-[10px]" />
        <Skeleton className="h-24 rounded-[10px]" />
        <Skeleton className="h-40 rounded-[10px]" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={error || "Event not found"}
        action={<Button asChild variant="secondary"><Link href="/business/events">Back to events</Link></Button>}
      />
    )
  }

  const base = manageBase(id)
  const badge = eventStatusBadge(event.status)
  const pendingCancel = weeklyCoverNightNeedsPendingCancel(event, seriesActive)
  // Only hand out the public link once the event is live — a draft/pending
  // event's checkout page dead-ends (same rule as venue page links).
  const isLive = isPubliclyLinkable(event.status) && seriesActive && !pendingCancel
  const endedUnsold = !seriesActive && !weeklyCoverNightHasSales(event) && !pendingCancel

  if (endedUnsold) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="This series has ended"
        description="Cover and Skip the Line are no longer on sale for this night."
        action={<Button asChild variant="secondary"><Link href="/business/events">Back to events</Link></Button>}
      />
    )
  }

  // V5 REDEMPTION §5 — the door surface follows the event's KIND. A WC night
  // runs on the redemption list first (guests scan with a phone camera); an
  // event runs on the Bizzy scanner. product_kind is the stamp when services
  // sends it; an older payload falls back to access_kind. Never the name.
  const isDoorAccess = isWeeklyCoverProduct(event)
  const accent = isDoorAccess ? "access" : "event"
  const isPast = new Date(event.end_date_time) < new Date()
  const isDraft = event.status === "draft"
  const canPublish = isDraft && canEdit && !isDoorAccess
  const sold = event.sales?.total_attendees ?? event.ticket_sales_count ?? 0
  const checkedIn = Number(event.checked_in_count ?? 0)
  const rate = event.sales?.checkin_rate ?? event.checkin_rate ?? 0

  const handlePublish = async () => {
    setPublishing(true)
    setPublishError("")
    try {
      await apiClient.post(`/business/events/${id}/publish`)
      removeShellDraftId(browserStorage(), business?.business_id, Number(id))
      await refresh()
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : "Failed to publish event")
    } finally {
      setPublishing(false)
    }
  }

  // At the door — everything you touch on the night itself. Same two
  // destinations the old hub listed last; they also live on the Guests tab.
  const atTheDoorRows = [
    {
      href: `${base}/scanner`,
      icon: QrCode,
      title: "Scan",
      subtitle: "Scanner access and QR codes",
      show: true,
    },
    {
      href: `${base}/checkins`,
      icon: CircleCheck,
      title: isDoorAccess ? "Redemption list" : "Check-in history",
      // View-only, like the app: it SHOWS who has checked in. There is no
      // check-names-off feature and the copy must not promise one.
      subtitle: isDoorAccess ? "Everyone who's checked in tonight" : "Attendee scan status",
      show: true,
    },
  ]

  // The publish-status line and the ONE green CTA on this page. A draft's
  // next action is publishing; a live event's is the door; a past event's is
  // the recap. Everything else on Overview is secondary or a link.
  const statusCopy = isDraft
    ? isPending
      ? "Draft. It goes live once Bizzy approves your business."
      : "Draft. Guests cannot see it until you publish."
    : event.status === "pending_review"
      ? "Under review. It goes live once the content check clears."
      : event.status === "cancelled"
        ? "Cancelled."
        : isPast
          ? "This event has ended."
          : isDoorAccess
            ? "On sale. Guests scan with any phone camera at the door."
            : "Live. Guests can buy, and the link below is ready to share."

  return (
    <>
      {/* Key stats. Revenue is owner/manager only (the server omits it for staff). */}
      <MetricStrip
        metrics={[
          { label: "Sold", value: sold.toLocaleString("en-US") },
          ...(canEdit ? [{ label: "Revenue", value: usd(event.sales?.total_revenue ?? event.total_revenue) }] : []),
          { label: "Checked in", value: checkedIn.toLocaleString("en-US") },
          { label: "Check-in rate", value: `${Number(rate).toFixed(0)}%` },
        ]}
      />

      {/* Publish status + next action */}
      <section className="flex flex-col gap-3 rounded-[10px] border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isDoorAccess && badge.variant === "success" ? "access" : badge.variant}>{badge.label}</Badge>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{statusCopy}</p>
        </div>
        {event.status === "pending_review" && event.moderation_reason && (
          <p className="text-[13px] text-amber-700 dark:text-amber-400">{event.moderation_reason}</p>
        )}
        {publishError && <p className="text-xs text-red-600 dark:text-red-400">{publishError}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {canPublish ? (
            <>
              <Button onClick={handlePublish} disabled={publishing || !shouldTreatDraftAsLive(isPending)}>
                {publishing ? <Loader2 className="animate-spin" /> : <Rocket />} Publish event
              </Button>
              <Button variant="secondary" asChild>
                <Link href={`/business/events/${id}/edit`}><Pencil /> Edit details</Link>
              </Button>
            </>
          ) : isPast ? (
            <Button asChild>
              <Link href={`${base}/analytics`}><BarChart3 /> See how it went</Link>
            </Button>
          ) : isDoorAccess ? (
            <Button asChild>
              <Link href={`${base}/checkins`}><ListChecks /> Open redemption list</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href={`${base}/scanner`}><ScanLine /> Open scanner</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Share Link. Live only — handing out the link is what a host does most. */}
      {isLive && <ShareLinkRow url={eventCheckoutUrl(id)} title={event.name} label="Event link" accent={accent} />}

      {/* §5 — the camera reminder, the app's counterpart copy. A door-access
          host's staff need to know the phone camera IS the scanner; without this
          the page reads as though check-in tooling is simply missing. */}
      {isDoorAccess && (
        <div className="flex items-start gap-3 rounded-[10px] border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${ACCESS_ACCENT}1A`, color: ACCESS_ACCENT }}
          >
            <Camera className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Guests scan with any phone camera
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              No scanner and no app setup at the door. Open the redemption list to
              see who&apos;s checked in.
            </p>
          </div>
        </div>
      )}

      {/* Insights — the summary is the strip above; this is the way in. */}
      <ActionList label="Insights" description="How the event is performing.">
        <ActionRow
          href={`${base}/analytics`}
          icon={BarChart3}
          title="Event analytics"
          subtitle="Revenue, ticket access, and check-in rates"
          accent={accent}
        />
      </ActionList>

      {/* At the door — tonight's tools. */}
      <ActionList label="At the door" description="Check guests in and see who has arrived.">
        {atTheDoorRows.filter((r) => r.show).map((r) => (
          <ActionRow key={r.href} href={r.href} icon={r.icon} title={r.title} subtitle={r.subtitle} accent={accent} />
        ))}
      </ActionList>

      {/* cancellation state, surfaced here too since Overview is where a host
          looks first; the full banners and the cancel action are on Settings */}
      {(event.cancellation_status === "pending" || pendingCancel) && (
        <p className="text-[13px] text-amber-700 dark:text-amber-400">
          Cancellation pending. See Settings for details.
        </p>
      )}
    </>
  )
}
