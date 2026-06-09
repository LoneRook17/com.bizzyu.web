"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, ImageIcon, Pencil, Plus, RotateCcw, Tag } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import { DEAL_TABS } from "@/lib/business/constants"
import { cn } from "@/lib/v2/utils"
import type { DealListItem } from "@/lib/business/types"
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
}: {
  deal: DealListItem
  tab: string
  showVenue: boolean
  onReactivate?: (id: number) => void
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* image */}
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {deal.deal_image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.deal_image_path} alt={deal.deal_title} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-300">
            <ImageIcon className="size-6" />
          </div>
        )}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/business/v2/deals/${deal.id}`}
          className="block truncate text-sm font-semibold text-neutral-900 hover:text-[#079455]"
        >
          {deal.deal_title}
        </Link>
        {showVenue && deal.venue_name && (
          <p className="truncate text-xs text-neutral-400">{deal.venue_name}</p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500">
          <span>{deal.deal_category}</span>
          <span className="text-neutral-300">·</span>
          <span>{deal.deal_type}</span>
          <span className="text-neutral-300">·</span>
          <span>{deal.claim_count ?? 0} claims</span>
          {deal.supply_limit ? <span>{deal.claim_count ?? 0}/{deal.supply_limit} used</span> : null}
          {tab === "expired" && deal.expired_date ? (
            <span>Expired {fmtDate(deal.expired_date)}</span>
          ) : tab === "live" && timeRemaining(deal.expired_date) ? (
            <span>{timeRemaining(deal.expired_date)}</span>
          ) : null}
        </div>
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
            <Link href={`/business/v2/deals/${deal.id}/edit`} aria-label="Edit deal">
              <Pencil className="size-4" />
            </Link>
          </Button>
        )}
        <Link href={`/business/v2/deals/${deal.id}`} aria-label="View deal">
          <ChevronRight className="size-4 text-neutral-300" />
        </Link>
      </div>
    </div>
  )
}

export default function DealsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { venues, isAllVenues, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [tab, setTab] = useState("live")
  const [deals, setDeals] = useState<DealListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<DealCounts>({ live: 0, expired: 0, deactivated: 0 })

  const canCreate =
    user?.business_role === "owner" || user?.business_role === "manager" || user?.business_role === "staff"
  const canManage = user?.business_role === "owner" || user?.business_role === "manager"

  const handleCreate = () => {
    if (isAllVenues && venues.length > 1) {
      setShowVenueModal(true)
    } else {
      if (isAllVenues && venues.length === 1) setSelectedVenue(venues[0].id)
      router.push("/business/v2/deals/new")
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

  const handleReactivate = async (dealId: number) => {
    try {
      await apiClient.patch(`/business/deals/${dealId}/toggle`)
      fetchDeals()
      fetchCounts()
    } catch {
      // ignore
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
                      tab === t.value ? "bg-green-50 text-green-700" : "bg-neutral-200 text-neutral-500"
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
        <Card className="divide-y divide-neutral-100 overflow-hidden p-0">
          {deals.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              tab={tab}
              showVenue={isAllVenues}
              onReactivate={canManage ? handleReactivate : undefined}
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
                  router.push("/business/v2/deals/new")
                }}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                {v.name}
                <ChevronRight className="size-4 text-neutral-300" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
