"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, BarChart3, CalendarOff, Check, CircleCheck, Copy, Link2, MessageSquare, Megaphone,
  Pencil, QrCode, ScanLine, Share2, Ticket, Users, Tag, ChevronRight,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { nativeShare } from "@/lib/share"
import type { EventDetail } from "@/lib/business/types"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { CancelEventModal } from "@/components/business/v2/events/CancelEventModal"
import { DoorCodeCard } from "@/components/business/v2/events/DoorCodeCard"
import { EventVenuePayoutBanner } from "@/components/business/v2/settings/VenuePayoutPaused"
import { EventSurgeSection } from "@/components/business/v2/events/EventSurgeSection"
import { eventStatusBadge, fmtDate } from "@/components/business/v2/events/eventStatus"

const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://bizzyu.com"

type Tile = {
  href: string
  icon: React.ElementType
  title: string
  subtitle: string
  show: boolean
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

// The canonical public checkout link — the AASA-claimed Universal Link shape
// shared with the app and promoter tracking links. Promoter links append
// ?ref for attribution; this one must stay bare or the operator's own shares
// would count as promoter-attributed sales.
function EventLinkRow({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const url = `${WEB_BASE_URL}/event/${eventId}/checkout`

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      flashCopied()
    } catch {
      window.prompt("Copy this link:", url)
    }
  }

  const share = async () => {
    const outcome = await nativeShare({ title: eventName, url })
    if (outcome === "copied") flashCopied()
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
        <Link2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Event link</p>
        <p className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400" title={url}>{url}</p>
      </div>
      <button
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#05EB54] hover:underline"
      >
        {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
      </button>
      {canShare && (
        <button
          onClick={share}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#05EB54] hover:underline"
        >
          <Share2 className="size-3.5" /> Share
        </button>
      )}
    </div>
  )
}

export default function V2ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCancel, setShowCancel] = useState(false)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    apiClient
      .get<EventDetail>(`/business/events/${id}`)
      .then(setEvent)
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
  // event's checkout page dead-ends (same rule as venue page links).
  const isLive = ["published", "approved", "active"].includes((event.status ?? "").toLowerCase())

  const tiles: Tile[] = [
    { href: `/business/events/${id}/edit`, icon: Pencil, title: "Edit event", subtitle: "Details, tickets, and flyer", show: canEdit },
    { href: `${base}/tickets`, icon: Ticket, title: "Manage tickets", subtitle: "Add, edit, or hide tiers", show: canEdit },
    { href: `${base}/team`, icon: Users, title: "Managers & co-hosts", subtitle: "Add a teammate with a Bizzy account", show: true },
    { href: `${base}/promoters`, icon: Megaphone, title: "Promoters", subtitle: "Stats and payouts", show: true },
    { href: `${base}/promo-codes`, icon: Tag, title: "Promo codes", subtitle: "Create discount codes", show: canEdit },
    { href: `${base}/announcements`, icon: MessageSquare, title: "Announcements", subtitle: "Notify ticket holders", show: true },
    { href: `${base}/analytics`, icon: BarChart3, title: "Event analytics", subtitle: "Revenue and check-ins", show: true },
    { href: `${base}/checkins`, icon: CircleCheck, title: "Check-in history", subtitle: "Attendee scan status", show: true },
    { href: `${base}/scanner`, icon: QrCode, title: "Scanner & QR codes", subtitle: "Check-in access", show: true },
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
        <Button variant="secondary" asChild>
          <Link href={`/business/events/${id}/manage/scanner`}><ScanLine /> Open scanner</Link>
        </Button>
      </div>

      {/* #9 venue-stripe (locked decision 2): if this event's venue is matched
          to a not-ready payout account, every sale here is blocked — that must
          be unmissable on the manage surface. */}
      <EventVenuePayoutBanner venueId={event.venue_id} />

      {isLive && <EventLinkRow eventId={id} eventName={event.name} />}

      {/* Door code — the PRIMARY way to put a staffer on the door tonight.
          Owners used to fall back to the (broken) email-invite path because the
          dashboard had no way to hand out a scan credential; this is that way.
          Email invite is demoted to the "Managers & co-hosts" tile below. */}
      <DoorCodeCard
        eventId={id}
        eventName={event.name}
        isLive={isLive}
        canManage={canEdit}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiles.filter((t) => t.show).map((t) => (
          <ManageTile key={t.href} href={t.href} icon={t.icon} title={t.title} subtitle={t.subtitle} />
        ))}
      </div>

      {/* Surge pricing, one card per priced tier (D10). Sits below the manage
          tiles because it is a live pricing control, not navigation — and above
          the cancellation/danger blocks, which must stay last. Self-hides for
          non owner/manager and for events with no priced tier. */}
      <EventSurgeSection tickets={event.tickets} role={user?.business_role} />

      {/* cancellation banners */}
      {cancellationStatus === "pending" && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="warning">Cancellation pending</Badge>
            <span className="text-sm text-amber-700 dark:text-amber-400">Awaiting admin review</span>
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
              {event.status !== "cancelled" && cancellationStatus === "none" && !isPastEvent && (
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
