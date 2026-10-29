"use client"

import { Fragment, use } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import { activeManageTab, manageSubNav, manageTabs } from "@/lib/business/manage-tabs"
import { ManageEventProvider, useManageEvent } from "@/lib/business/manage-event-context"
import { cn } from "@/lib/v2/utils"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EventVenuePayoutBanner } from "@/components/business/v2/settings/VenuePayoutPaused"
import { eventStatusBadge, fmtDate } from "@/components/business/v2/events/eventStatus"
import { WeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"

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
  const activeTab = isDoorAccess
    ? "border-access text-access"
    : "border-[#0A8038] text-[#0A8038] dark:border-[#05EB54] dark:text-[#05EB54]"

  return (
    <AccentScope>
      <div className="flex flex-col gap-3">
        {/* Round 3 (Luke, 2026-08-29): a WC night's manage IS its page — backing
            into the event detail half-page resurrects a surface WC shouldn't
            have. WC goes back to the Events list; events keep their detail. */}
        <Link
          href={isDoorAccess ? "/business/events" : `/business/events/${id}`}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="size-3.5" /> {isDoorAccess ? "Back to events" : "Back to event"}
        </Link>

        {loading && !event ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : event ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{event.name}</h1>
              {badge && (
                <Badge variant={isDoorAccess && badge.variant === "success" ? "access" : badge.variant}>{badge.label}</Badge>
              )}
            </div>
            <p className="mt-0.5 text-[15px] text-neutral-600 dark:text-neutral-400">
              {fmtDate(event.start_date_time)} · {event.venue_name}
            </p>
          </div>
        ) : null}

        {/* #9 venue-stripe (locked decision 2): if this event's venue is matched
            to a not-ready payout account, every sale here is blocked — that must
            be unmissable on the manage surface, on every tab. */}
        {event && <EventVenuePayoutBanner venueId={event.venue_id} />}

        <nav aria-label="Manage sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max items-center gap-1 border-b border-neutral-200 dark:border-neutral-800">
            {tabs.map((tab) => {
              const isActive = tab.key === active
              return (
                <li key={tab.key}>
                  <Link
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "-mb-px inline-flex items-center whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? activeTab
                        : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
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
