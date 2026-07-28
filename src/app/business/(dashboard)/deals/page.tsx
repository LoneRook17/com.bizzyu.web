"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronRight, Clock, ImageIcon, Pencil, Plus, RotateCcw, Tag } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { DEAL_TABS } from "@/lib/business/constants"
import { canCreateDeal } from "@/lib/business/analytics-access"
import { cn } from "@/lib/v2/utils"
import type { DealListItem } from "@/lib/business/types"
import {
  fetchDealStats,
  indexStatsByDeal,
  rangeForDays,
  DEFAULT_RANGE_DAYS,
  type DealStatRow,
} from "@/lib/business/deal-stats"
import { DealStatColumn } from "@/components/business/dashboard/DealStatColumn"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Tabs, TabsList, TabsTrigger } from "@/components/business/v2/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"

interface DealCounts {
  live: number
  expired: number
  deactivated: number
}

const TAB_EMPTY: Record<string, { title: string; description: string }> = {
  live: { title: "No live deals", description: "Create your first deal to get started." },
  expired: { title: "No expired deals", description: "Deals that have passed their expiration date will appear here." },
  deactivated: { title: "No deactivated deals", description: "Deals you deactivate will appear here." },
}

function timeRemaining(expDate: string): string {
  if (!expDate || expDate === "2099-12-31") return ""
  const diff = new Date(expDate).getTime() - Date.now()
  if (diff <= 0) return "Expired"
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 0) return `${days}d left`
  const hours = Math.floor(diff / (1000 * 60 * 60))
  return `${hours}h left`
}

function fmtDate(s: string): string {
  if (!s) return ""
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function DealRow({
  deal,
  tab,
  showVenue,
  onReactivate,
  stat,
  statsLoading,
  statsUnavailable,
}: {
  deal: DealListItem
  tab: string
  showVenue: boolean
  onReactivate?: (id: number) => void
  stat?: DealStatRow
  statsLoading: boolean
  statsUnavailable: boolean
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* image */}
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
        {deal.deal_image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.deal_image_path} alt={deal.deal_title} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-300 dark:text-neutral-600">
            <ImageIcon className="size-6" />
          </div>
        )}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/business/deals/${deal.id}`}
          className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-[#05EB54] dark:hover:text-[#05EB54]"
        >
          {deal.deal_title}
        </Link>
        {showVenue && deal.venue_name && (
          <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{deal.venue_name}</p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          <span>{deal.deal_category}</span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span>{deal.deal_type}</span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span>{deal.claim_count ?? 0} claims</span>
          {deal.supply_limit ? <span>{deal.claim_count ?? 0}/{deal.supply_limit} used</span> : null}
          {tab === "expired" && deal.expired_date ? (
            <span>Expired {fmtDate(deal.expired_date)}</span>
          ) : tab === "live" && timeRemaining(deal.expired_date) ? (
            <span>{timeRemaining(deal.expired_date)}</span>
          ) : null}
        </div>
      </div>

      {/* impressions / views / claims columns (DI-B3w) */}
      <div className="hidden shrink-0 items-start gap-5 lg:flex">
        <DealStatColumn
          label="Impr."
          value={stat?.impressions}
          unique={stat?.unique_impressions}
          loading={statsLoading}
          unavailable={statsUnavailable}
        />
        <DealStatColumn
          label="Views"
          value={stat?.views}
          unique={stat?.unique_views}
          loading={statsLoading}
          unavailable={statsUnavailable}
        />
        <DealStatColumn
          label="Claims"
          // Claims predate 4.2.6 tracking — fall back to the list's own count so
          // this column is populated even when impression tracking isn't live.
          value={stat?.claims ?? deal.claim_count ?? 0}
          loading={statsLoading && stat === undefined && deal.claim_count === undefined}
          unavailable={false}
        />
      </div>

      {/* status + actions */}
      <div className="flex shrink-0 items-center gap-2">
        {deal.moderation_status === "pending_review" ? (
          <Badge variant="warning">In review</Badge>
        ) : tab === "expired" ? (
          <Badge variant="neutral">Expired</Badge>
        ) : tab === "deactivated" ? (
          <Badge variant="neutral">Deactivated</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}

        {tab === "deactivated" && onReactivate ? (
          <Button variant="secondary" size="sm" onClick={() => onReactivate(deal.id)}>
            <RotateCcw className="size-3.5" /> Reactivate
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/business/deals/${deal.id}/edit`} aria-label="Edit deal">
              <Pencil className="size-4" />
            </Link>
          </Button>
        )}
        <Link href={`/business/deals/${deal.id}`} aria-label="View deal">
          <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
        </Link>
      </div>
    </div>
  )
}

function DealsContent() {
  const { user, isPending } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { venues, isAllVenues, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()
  const [showVenueModal, setShowVenueModal] = useState(false)
  // ?tab= deep link (e.g. DealForm sends trial users to their saved draft)
  const [tab, setTab] = useState(() => {
    const t = searchParams.get("tab")
    return DEAL_TABS.some((d) => d.value === t) ? (t as string) : "live"
  })
  const [deals, setDeals] = useState<DealListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<DealCounts>({ live: 0, expired: 0, deactivated: 0 })
  const [reactivateNotice, setReactivateNotice] = useState("")
  // Engagement stats join by deal_id, fetched SEPARATELY from the deals list so
  // rows render immediately and never jank while stats load. null map =
  // endpoint not deployed yet (404) → columns quietly show "—".
  const [statsByDeal, setStatsByDeal] = useState<Map<number, DealStatRow>>(new Map())
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsUnavailable, setStatsUnavailable] = useState(false)

  // Stale notices don't follow you across tabs
  useEffect(() => setReactivateNotice(""), [tab])

  // Owner/manager only — mirrors the event-create gate (events/page.tsx) and
  // backstops the services authz fix (TF-DEAL-AUTHZ-F1): don't show a "Create
  // deal" button that staff would only get a 403 from. The server is the real block.
  const canCreate = canCreateDeal(user?.business_role)
  const canManage = user?.business_role === "owner" || user?.business_role === "manager"

  const handleCreate = () => {
    if (isAllVenues && venues.length > 1) {
      setShowVenueModal(true)
    } else {
      if (isAllVenues && venues.length === 1) setSelectedVenue(venues[0].id)
      router.push("/business/deals/new")
    }
  }

  const fetchCounts = useCallback(async () => {
    try {
      const data = await apiClient.get<DealCounts>(`/business/deals/counts?_=1${venueParam}`)
      setCounts(data)
    } catch {
      // counts are supplementary
    }
  }, [venueParam])

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ deals: DealListItem[]; total: number }>(
        `/business/deals?tab=${tab}&page=1&limit=50${venueParam}`
      )
      setDeals(data.deals)
    } catch {
      setDeals([])
    } finally {
      setLoading(false)
    }
  }, [tab, venueParam])

  useEffect(() => {
    fetchDeals()
    fetchCounts()
  }, [fetchDeals, fetchCounts])

  // Stats are range-based per-deal aggregates (tab- AND venue-independent): one
  // fetch covers every tab, and rows join by deal_id so the visible venue's
  // deals pick their own rows out of the map. Flipping tabs reuses it (no jank).
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    const { from, to } = rangeForDays(DEFAULT_RANGE_DAYS, new Date())
    try {
      const resp = await fetchDealStats(from, to)
      if (resp === null) {
        setStatsUnavailable(true)
        setStatsByDeal(new Map())
      } else {
        setStatsUnavailable(false)
        setStatsByDeal(indexStatsByDeal(resp))
      }
    } catch {
      // A real failure shouldn't break the deals list — degrade to "—".
      setStatsUnavailable(true)
      setStatsByDeal(new Map())
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleReactivate = async (dealId: number) => {
    // Publishing is approval-gated server-side (403) - explain instead of
    // firing a request that silently fails.
    if (isPending) {
      setReactivateNotice(
        "This deal is saved and ready. Once your business is approved, come back and hit Reactivate to take it live."
      )
      return
    }
    try {
      await apiClient.patch(`/business/deals/${dealId}/toggle`)
      setReactivateNotice("")
      fetchDeals()
      fetchCounts()
    } catch (err) {
      setReactivateNotice(
        err instanceof ApiError ? err.message : "Couldn't reactivate this deal. Please try again."
      )
    }
  }

  const empty = TAB_EMPTY[tab] || TAB_EMPTY.live

  return (
    <>
      <PageHeader
        title="Deals"
        description="Create and manage your Bizzy-exclusive student deals."
        actions={
          canCreate ? (
            <Button onClick={handleCreate}>
              <Plus /> Create deal
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {DEAL_TABS.map((t) => {
            const count = counts[t.value as keyof DealCounts] ?? 0
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold leading-none",
                      tab === t.value ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
                    )}
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {reactivateNotice && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3.5">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-300">{reactivateNotice}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={empty.title}
          description={empty.description}
          action={
            canCreate && tab === "live" ? (
              <Button onClick={handleCreate} size="sm">
                <Plus /> Create deal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden p-0">
          {deals.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              tab={tab}
              showVenue={isAllVenues}
              onReactivate={canManage ? handleReactivate : undefined}
              stat={statsByDeal.get(deal.id)}
              statsLoading={statsLoading}
              statsUnavailable={statsUnavailable}
            />
          ))}
        </Card>
      )}

      <Dialog open={showVenueModal} onOpenChange={setShowVenueModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose a venue</DialogTitle>
            <DialogDescription>Which venue is this deal for?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {venues.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVenue(v.id)
                  setShowVenueModal(false)
                  router.push("/business/deals/new")
                }}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-left text-sm font-medium text-neutral-800 dark:text-neutral-200 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                {v.name}
                <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function DealsPage() {
  return (
    <Suspense fallback={<PageHeader title="Deals" description="Loading…" />}>
      <DealsContent />
    </Suspense>
  )
}
