"use client"

import { Fragment, use } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ExternalLink, Share2 } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import { activeManageTab, manageSubNav, manageTabs } from "@/lib/business/manage-tabs"
import { ManageEventProvider, useManageEvent } from "@/lib/business/manage-event-context"
import { cn } from "@/lib/v2/utils"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EventVenuePayoutBanner } from "@/components/business/v2/settings/VenuePayoutPaused"
import { eventStatusBadge } from "@/components/business/v2/events/eventStatus"
import { WeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { Button } from "@/components/business/v2/ui/button"
import { showToast } from "@/components/business/dashboard/Toast"
import { eventCheckoutUrl, isPubliclyLinkable } from "@/lib/business/public-links"
import { fmtRowWhen } from "@/lib/business/events-list"
import { weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { nativeShare } from "@/lib/share"

/** "Fri, Oct 30 · 7:00 PM to Sat, Oct 31 · 1:00 AM" (one day: the end is just a clock). */
function eventWindow(start: string, end?: string | null): string {
  const from = fmtRowWhen(start)
  if (!end) return from
  const to = fmtRowWhen(end)
  const [fromDay] = from.split(" · ")
  const [toDay, toClock] = to.split(" · ")
  return fromDay === toDay && toClock ? `${from} to ${toClock}` : `${from} to ${to}`
}

/**
 * BETA biz-dash shell, slice 1 (locked 2026-10-29): per-event Manage is an
 * Overview plus top tabs — Overview · Tickets · Guests/Check-in · Promo &
 * tracking · Settings. This layout owns the event header and the tabs; every
 * page under /manage renders beneath it. Tabs are links; the active one
 * follows the route (lib/business/manage-tabs.ts is the map).
 *
 * A Weekly Cover night renders the whole subtree pink (WeeklyCoverAccent),
 * exactly as the old hub did — the accent provider flips the shared controls
 * and the tab underline follows.
 */
function ManageChrome({ children }: { children: React.ReactNode }) {
  const { id, event, seriesActive, loading } = useManageEvent()
  const pathname = usePathname()
  const { user } = useAuth()
  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  const isDoorAccess = event ? isWeeklyCoverProduct(event) : false
  const tabs = manageTabs(id)
  const active = activeManageTab(pathname, id)
  const subNav = manageSubNav(active, id, { isDoorAccess, canEdit, seriesActive })
  const path = pathname.replace(/\/+$/, "")
  const badge = event ? eventStatusBadge(event.status) : null

  const AccentScope = isDoorAccess ? WeeklyCoverAccent : Fragment
  // Active tab: the quiet filled segment the rest of the dashboard uses; a
  // Weekly Cover night inks it pink.
  const activeTab = isDoorAccess
    ? "bg-access/12 text-access-deep dark:bg-access/15 dark:text-access"
    : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800/70 dark:text-neutral-100"
  // View / Share only once guests can actually open the page (same rule the
  // Overview share link follows). Both secondary: each tab owns its green.
  const pendingCancel = event ? weeklyCoverNightNeedsPendingCancel(event, seriesActive) : false
  const guestUrl = event && isPubliclyLinkable(event.status) && seriesActive && !pendingCancel ? eventCheckoutUrl(id) : null
  const share = async () => {
    if (!guestUrl || !event) return
    const outcome = await nativeShare({ title: event.name, url: guestUrl })
    if (outcome === "copied") showToast("Event link copied")
  }

  return (
    <AccentScope>
      <div className="flex flex-col gap-3">
        {loading && !event ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : event ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                {/* Round 3 (Luke, 2026-08-29): a WC night's manage IS its page —
                    backing into the event detail half-page resurrects a surface
                    WC shouldn't have. WC goes back to the Events list; events
                    keep their detail. */}
                <Link
                  href={isDoorAccess ? "/business/events" : `/business/events/${id}`}
                  aria-label={isDoorAccess ? "Back to events" : "Back to event"}
                  title={isDoorAccess ? "Back to events" : "Back to event"}
                  className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                  <ArrowLeft className="size-4" />
                </Link>
                <h1 className="truncate text-[26px] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-[28px] dark:text-neutral-100">{event.name}</h1>
                {badge && (
                  <Badge className="shrink-0" variant={isDoorAccess && badge.variant === "success" ? "access" : badge.variant}>{badge.label}</Badge>
                )}
              </div>
              <p className="mt-1 text-[14px] text-neutral-600 sm:pl-[1.875rem] dark:text-neutral-400">
                {eventWindow(event.start_date_time, event.end_date_time)}
                {event.venue_name ? ` · ${event.venue_name}` : ""}
              </p>
            </div>
            {guestUrl && (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Button variant="secondary" asChild className="flex-1 sm:flex-none">
                  <a href={guestUrl} target="_blank" rel="noopener noreferrer"><ExternalLink /> View event</a>
                </Button>
                <Button variant="secondary" onClick={share} className="flex-1 sm:flex-none">
                  <Share2 /> Share event
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/business/events"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="size-3.5" /> Back to events
          </Link>
        )}

        {/* #9 venue-stripe (locked decision 2): if this event's venue is matched
            to a not-ready payout account, every sale here is blocked — that must
            be unmissable on the manage surface, on every tab. */}
        {event && <EventVenuePayoutBanner venueId={event.venue_id} />}

        <nav aria-label="Manage sections" className="-mx-4 overflow-x-auto border-b border-neutral-200 px-4 pb-3 sm:mx-0 sm:px-0 dark:border-neutral-800">
          <ul className="flex min-w-max items-center gap-1">
            {tabs.map((tab) => {
              const isActive = tab.key === active
              return (
                <li key={tab.key}>
                  <Link
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/40",
                      isActive
                        ? activeTab
                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {subNav.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {subNav.map((link) => {
              const isActive = path === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[13px] transition-colors",
                    isActive
                      ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100",
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {children}
    </AccentScope>
  )
}

export default function ManageEventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <ManageEventProvider id={id}>
      <ManageChrome>{children}</ManageChrome>
    </ManageEventProvider>
  )
}
