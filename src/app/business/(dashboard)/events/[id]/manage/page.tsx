"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, BarChart3, CalendarOff, CircleCheck, MessageSquare, Megaphone,
  Camera, ListChecks, Pencil, QrCode, Repeat, ScanLine, Ticket, Users, Tag, ChevronRight,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { eventCheckoutUrl, isPubliclyLinkable } from "@/lib/business/public-links"
import {
  ACCESS_ACCENT,
  isWeeklyCoverProduct,
  programEditHref,
  programIdFromOwnedEvent,
  weeklyCoverNightEditHref,
} from "@/lib/business/door-access"
import {
  seriesActiveFromRecurringResponse,
  weeklyCoverNightHasSales,
  weeklyCoverNightNeedsPendingCancel,
} from "@/lib/business/weekly-cover-visibility"
import type { EventDetail } from "@/lib/business/types"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import ShareLinkRow from "@/components/business/v2/ShareLinkRow"
import { CancelEventModal } from "@/components/business/v2/events/CancelEventModal"
import { DoorCodeCard } from "@/components/business/v2/events/DoorCodeCard"
import { EventVenuePayoutBanner } from "@/components/business/v2/settings/VenuePayoutPaused"
import { eventStatusBadge, fmtDate } from "@/components/business/v2/events/eventStatus"

type Tile = {
  href: string
  icon: React.ElementType
  title: string
  subtitle: string
  show: boolean
}

// 5.0 F11 / PRD 12.1 — the management page follows the app's control order:
//   Share Link + Door Code → At the Door → Event Setup → Insights → Promote
// Every destination below already existed; this is the app's sequence imposed
// on them, not new surfaces. Door Access programs (DASH-A) get the same order
// on their own series page.
function ManageSection({ title, blurb, tiles }: { title: string; blurb: string; tiles: Tile[] }) {
  const visible = tiles.filter((t) => t.show)
  if (visible.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{blurb}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((t) => (
          <ManageTile key={t.href} href={t.href} icon={t.icon} title={t.title} subtitle={t.subtitle} />
        ))}
      </div>
    </section>
  )
}

function ManageTile({ href, icon: Icon, title, subtitle }: Omit<Tile, "show">) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm transition-all hover:border-[#05EB54]/40 hover:shadow-md"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors group-hover:bg-green-50 dark:group-hover:bg-green-950/40 group-hover:text-[#05EB54] dark:group-hover:text-[#05EB54]">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 transition-colors group-hover:text-[#05EB54] dark:group-hover:text-[#05EB54]">{title}</span>
        <span className="mt-0.5 block text-[13px] text-neutral-500 dark:text-neutral-400">{subtitle}</span>
      </span>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
    </Link>
  )
}

export default function V2ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [seriesActive, setSeriesActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCancel, setShowCancel] = useState(false)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    apiClient
      .get<EventDetail>(`/business/events/${id}`)
      .then(async (row) => {
        setEvent(row)
        const fromStamp = programIdFromOwnedEvent(row)
        const fromFk = row.recurring_series_id != null ? Number(row.recurring_series_id) : NaN
        const seriesId = fromStamp ?? (Number.isFinite(fromFk) && fromFk > 0 ? fromFk : null)
        if (seriesId == null) {
          setSeriesActive(true)
          return
        }
        try {
          const data = await apiClient.get<unknown>(`/business/recurring-series/${seriesId}`)
          setSeriesActive(seriesActiveFromRecurringResponse(data) !== false)
        } catch {
          setSeriesActive(true)
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load event"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
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

  const base = `/business/events/${id}/manage`
  const isPastEvent = new Date(event.end_date_time) < new Date()
  const cancellationStatus = event.cancellation_status || "none"
  const badge = eventStatusBadge(event.status)
  // Only hand out the public link once the event is live — a draft/pending
  // event's checkout page dead-ends (same rule as venue page links). DASH2-D
  // moved this predicate into public-links so Door Access nights apply it too.
  const pendingCancel = weeklyCoverNightNeedsPendingCancel(event, seriesActive)
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

  // V5 REDEMPTION §5, updated for the instance-manage pass — the door surface
  // follows the event's KIND, but a door-access pass is no longer scanner-
  // refused: services utils/redemptionGuard accepts camera_tap AND native_scan
  // for Weekly Cover, so a WC night's manage page carries the same Scan tile
  // and door code an event's does. The camera stays the guest-facing default
  // (the reminder card below); the redemption list stays the WC-primary CTA.
  // product_kind is the stamp when services sends it; an older payload falls
  // back to access_kind. Never a raw access_kind test, never the name.
  const isDoorAccess = isWeeklyCoverProduct(event)

  // At the Door — everything you touch on the night itself.
  const atTheDoorTiles: Tile[] = [
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
      subtitle: isDoorAccess
        ? "Guests scan with any phone camera. Check names off here"
        : "Attendee scan status",
      show: true,
    },
  ]

  // WC FLAW 3 — the generic-edit fork. "Edit event" and "Manage Tickets" write
  // through PUT /business/events/:id and the event ticket PUTs. WC night
  // setup tiles stay on the WC path: the night-override editor (Custom for
  // this date; series save leaves it alone) and the program editor for the
  // weekday template. BINDING: that includes a night already stamped
  // customized — never a green named-Event editor. Only a WC night with no
  // resolvable program keeps the generic tiles (there is no series to protect).
  const wcProgramId = programIdFromOwnedEvent(event)
  const wcNightEdit = weeklyCoverNightEditHref(event)

  // Event Setup — the things you configure before the doors open. "Manage
  // Tickets" is the tickets page, which owns tiers, the group sellout toggle and
  // (5.0) stock alerts, per F11's "Manage Tickets absorbs …".
  const setupTiles: Tile[] =
    wcNightEdit != null && wcProgramId != null
      ? [
          { href: wcNightEdit, icon: Pencil, title: "Edit night", subtitle: "Cover prices, door hours, or close this night only", show: canEdit && seriesActive },
          { href: programEditHref(wcProgramId), icon: Repeat, title: "Edit program", subtitle: "Weekday setup for future nights. Custom nights stay as they are", show: canEdit && seriesActive },
          { href: `${base}/team`, icon: Users, title: "Managers & co-hosts", subtitle: "Add a teammate with a Bizzy account", show: true },
        ]
      : [
          { href: `/business/events/${id}/edit`, icon: Pencil, title: "Edit event", subtitle: "Details, date, location, and artwork", show: canEdit },
          { href: `${base}/tickets`, icon: Ticket, title: "Manage Tickets", subtitle: "Tiers, availability, sellout, and stock alerts", show: canEdit },
          { href: `${base}/team`, icon: Users, title: "Managers & co-hosts", subtitle: "Add a teammate with a Bizzy account", show: true },
        ]

  const insightsTiles: Tile[] = [
    { href: `${base}/analytics`, icon: BarChart3, title: "Event analytics", subtitle: "Revenue and check-ins", show: true },
  ]

  // Promo codes leads the section, matching the app's manage screen — the two
  // surfaces are the same control panel and should list it in the same place.
  // (The app had it buried inside Manage sales until 2026-08-23; the web never
  // did, so only the ordering needed to change here.)
  const promoteTiles: Tile[] = [
    { href: `${base}/promo-codes`, icon: Tag, title: "Promo codes", subtitle: "Create discount codes", show: canEdit && seriesActive },
    { href: `${base}/promoters`, icon: Megaphone, title: "Promoters", subtitle: "Referral links and what they earn", show: true },
    { href: `${base}/announcements`, icon: MessageSquare, title: "Announcements", subtitle: "Notify ticket holders", show: true },
  ]

  return (
    <>
      <Link
        href={`/business/events/${id}`}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> Back to event
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{event.name}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">{fmtDate(event.start_date_time)} · {event.venue_name}</p>
        </div>
        {/* The header CTA is the loudest affordance on the page. A WC night's
            door runs off the redemption list first (guests scan with a phone
            camera), so it stays the primary; the scanner is one tile below. */}
        <Button variant="secondary" asChild>
          {isDoorAccess ? (
            <Link href={`/business/events/${id}/manage/checkins`}><ListChecks /> Open redemption list</Link>
          ) : (
            <Link href={`/business/events/${id}/manage/scanner`}><ScanLine /> Open scanner</Link>
          )}
        </Button>
      </div>

      {/* #9 venue-stripe (locked decision 2): if this event's venue is matched
          to a not-ready payout account, every sale here is blocked — that must
          be unmissable on the manage surface. */}
      <EventVenuePayoutBanner venueId={event.venue_id} />

      {/* 1 — Share Link + Door Code. First, because handing out the link and
          putting a staffer on the door are what a host does most. */}
      {isLive && <ShareLinkRow url={eventCheckoutUrl(id)} title={event.name} label="Event link" />}

      {/* Door code — the PRIMARY way to put a staffer on the door tonight.
          Owners used to fall back to the (broken) email-invite path because the
          dashboard had no way to hand out a scan credential; this is that way.
          Email invite is demoted to the "Managers & co-hosts" tile below. */}
      {/* A door code is a SCANNER credential: staff scan with no Bizzy account.
          Since redemptionGuard accepts native_scan for Weekly Cover, WC nights
          get the same card events always had (instance-manage pass). */}
      <DoorCodeCard
        eventId={id}
        eventName={event.name}
        isLive={isLive}
        canManage={canEdit}
      />

      {/* §5 — the camera reminder, the app's counterpart copy. A door-access
          host's staff need to know the phone camera IS the scanner; without this
          the page reads as though check-in tooling is simply missing. */}
      {isDoorAccess && (
        <Card className="flex items-start gap-3 p-4">
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
              No scanner and no app setup at the door. Open the redemption list and
              check names off as people arrive.
            </p>
          </div>
        </Card>
      )}

      {/* 2 — At the Door */}
      <ManageSection
        title="At the door"
        blurb="Tonight's tools. Check guests in and see who has arrived."
        tiles={atTheDoorTiles}
      />

      {/* 3 — Event Setup */}
      <ManageSection
        title="Event setup"
        blurb="Details, what you're selling, and who can help run it."
        tiles={setupTiles}
      />

      {/* 4 — Insights */}
      <ManageSection
        title="Insights"
        blurb="How the event is performing."
        tiles={insightsTiles}
      />

      {/* 5 — Promote */}
      <ManageSection
        title="Promote"
        blurb="Reach more people and reward the ones who bring them."
        tiles={promoteTiles}
      />

      {/* cancellation banners */}
      {(cancellationStatus === "pending" || pendingCancel) && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="warning">Cancellation pending</Badge>
            <span className="text-sm text-amber-700 dark:text-amber-400">
              {cancellationStatus === "pending"
                ? "Awaiting admin review"
                : "This series was cancelled. This night stays until admin refunds complete."}
            </span>
          </div>
          {event.cancellation_reason && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Reason: {event.cancellation_reason}</p>}
        </div>
      )}
      {cancellationStatus === "denied" && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4">
          <Badge variant="danger">Cancellation denied</Badge>
          {event.cancellation_denial_reason && <p className="mt-2 text-xs text-red-600 dark:text-red-400">Reason: {event.cancellation_denial_reason}</p>}
        </div>
      )}

      {/* danger zone */}
      {canEdit && (
        <Card className={cn("border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/30")}>
          <div className="p-5">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
            <div className="mt-3">
              {event.status !== "cancelled" && cancellationStatus === "none" && !pendingCancel && !isPastEvent && (
                <Button variant="secondary" className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => setShowCancel(true)}>
                  Cancel event
                </Button>
              )}
              {isPastEvent && event.status !== "cancelled" && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Cannot cancel. Event has already ended.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <CancelEventModal
        open={showCancel}
        onOpenChange={setShowCancel}
        eventId={Number(id)}
        eventName={event.name}
        onCancelled={() => router.push("/business/events")}
      />
    </>
  )
}
