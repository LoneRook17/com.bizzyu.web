"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Loader2, Plus, X } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import { EVENT_TABS } from "@/lib/business/constants"
import type { EventListItem, BusinessProfile } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Button } from "@/components/business/v2/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/business/v2/ui/tabs"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { EventCard } from "@/components/business/v2/events/EventCard"
import { Pagination } from "@/components/business/v2/events/Pagination"
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"
import {
  fetchDoorAccessProgramsSafe,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"

export default function V2EventsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { venues, isAllVenues, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()

  const [tab, setTab] = useState("upcoming")
  const [events, setEvents] = useState<EventListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // F9 COMBINED LIST: green EVENT rows + magenta WEEKLY ACCESS rows in one
  // list. Programs are "ongoing by nature" (D-F9.2) — they have no single date
  // to sort on, so they PIN ABOVE the dated rows rather than being given a
  // fake one, and they are never paginated with the events below them.
  const [programs, setPrograms] = useState<DoorAccessProgramSummary[]>([])

  const [showVenueModal, setShowVenueModal] = useState(false)
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [stripeBannerDismissed, setStripeBannerDismissed] = useState(false)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  const limit = 20
  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  const handleConnectStripe = async () => {
    setStripeConnecting(true)
    setStripeError(null)
    try {
      const data = await apiClient.post<{ url: string; stripe_connect_id: string }>(
        "/business/profile/stripe-onboard?platform=web"
      )
      window.location.href = data.url
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Failed to start Stripe onboarding")
      setStripeConnecting(false)
    }
  }

  const handleCreate = () => {
    if (isAllVenues && venues.length > 1) {
      setShowVenueModal(true)
    } else {
      if (isAllVenues && venues.length === 1) setSelectedVenue(venues[0].id)
      router.push("/business/events/new")
    }
  }

  useEffect(() => {
    if (canCreate) {
      apiClient
        .get<BusinessProfile>("/business/profile")
        .then((p) => setStripeOnboarded(p.stripe_connect_onboarded))
        .catch(() => {})
    }
  }, [canCreate])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ events: EventListItem[]; total: number }>(
        `/business/events?tab=${tab}&page=${page}&limit=${limit}${venueParam}`
      )
      setEvents(data.events)
      setTotal(data.total)
    } catch {
      setEvents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [tab, page, venueParam])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Access programs load ONCE and independently of the tab/page, because they
  // are not part of the paginated event query. fetchDoorAccessProgramsSafe
  // degrades to [] on any failure — this list worked before access rows
  // existed and must keep working if that endpoint is down or the build
  // predates it.
  useEffect(() => {
    let cancelled = false
    fetchDoorAccessProgramsSafe().then((rows) => {
      if (!cancelled) setPrograms(rows)
    })
    return () => { cancelled = true }
  }, [])

  // Only on the tab that means "what's on". "Past"/"Drafts"/"Recurring" are
  // queries about dated events; an ongoing program is not an answer to any of
  // them, and the Weekly Access section is where the full list lives.
  const visiblePrograms = tab === "upcoming" ? programs.filter((p) => p.is_active) : []
  const isEmpty = events.length === 0 && visiblePrograms.length === 0

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Events"
        description="Create, manage, and track your events."
        actions={
          canCreate ? (
            <Button onClick={handleCreate}><Plus /> Create event</Button>
          ) : undefined
        }
      />

      {/* Stripe Connect prompt */}
      {canCreate && !stripeOnboarded && !stripeBannerDismissed && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3.5">
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Stripe Connect not linked</p>
            <p className="mt-0.5 text-[13px] text-amber-700 dark:text-amber-400">
              To sell paid tickets, finish Stripe Connect onboarding. Free events work without it.
            </p>
            {stripeError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{stripeError}</p>}
            <Button size="sm" className="mt-2.5" disabled={stripeConnecting} onClick={handleConnectStripe}>
              {stripeConnecting ? <><Loader2 className="size-3.5 animate-spin" /> Connecting…</> : "Connect Stripe →"}
            </Button>
          </div>
          <button
            onClick={() => setStripeBannerDismissed(true)}
            className="shrink-0 rounded-lg p-1 text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/40"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          {EVENT_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[124px] rounded-xl" />)}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description={tab === "upcoming" ? "Create your first event to start selling tickets." : `No ${tab} events found.`}
          action={
            canCreate && tab === "upcoming" ? (
              <Button onClick={handleCreate}><Plus /> Create event</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visiblePrograms.map((program) => (
            <AccessProgramRow key={`program-${program.id}`} program={program} />
          ))}
          {events.map((event) => <EventCard key={event.event_id} event={event} />)}
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

      {/* Venue picker (all-venues create flow) */}
      <Dialog open={showVenueModal} onOpenChange={setShowVenueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Which venue?</DialogTitle>
            <DialogDescription>Pick the venue this event belongs to.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            {venues.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVenue(v.id)
                  setShowVenueModal(false)
                  router.push("/business/events/new")
                }}
                className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:border-[#05EB54]/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <CalendarDays className="size-4 text-neutral-400 dark:text-neutral-500" />
                <span className="min-w-0">
                  <span className="block truncate">{v.name}</span>
                  {v.address && <span className="block truncate text-xs font-normal text-neutral-500 dark:text-neutral-400">{v.address}</span>}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        Need a hand? Visit <Link href="/business/help" className="font-medium text-[#05EB54] hover:underline">Help &amp; tutorials</Link>.
      </p>
    </>
  )
}
