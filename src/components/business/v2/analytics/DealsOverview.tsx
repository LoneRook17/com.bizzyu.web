"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { DealsOverview, DealOverviewItem, DealAnalytics } from "@/lib/business/types"
import { apiClient } from "@/lib/business/api-client"
import { dealPanelModel } from "@/lib/business/deals-overview-panel"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Tag } from "lucide-react"
import { DealFunnel } from "@/components/business/dashboard/DealFunnel"
import { StatTile, StatGrid, Section, VenueGroupLabel, RowStat } from "./shared"

function DealDetail({ data }: { data: DealAnalytics }) {
  const maxClaims = Math.max(...data.claims_by_period.map((p) => p.count), 1)
  const claimsSorted = [...data.claims_by_period].reverse()
  const { used, total } = data.supply_usage

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Total claims</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{data.total_claims}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Supply usage</p>
          {total ? (
            <>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {used} / {total}
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-[#05EB54]"
                  style={{ width: `${Math.min((used / total) * 100, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{used}</p>
              <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Unlimited supply</p>
            </>
          )}
        </Card>
      </div>

      {claimsSorted.length > 0 && (
        <Card className="p-5">
          <h4 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Claims over time (last 30 days)</h4>
          <div className="space-y-1.5">
            {claimsSorted.map((period) => {
              const pct = (period.count / maxClaims) * 100
              const dateLabel = new Date(period.period + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
              return (
                <div key={period.period} className="flex items-center gap-2">
                  <span className="w-14 flex-shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{dateLabel}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-50 dark:bg-neutral-800/50">
                    <div
                      className="h-full rounded bg-[#05EB54]/70"
                      style={{ width: `${Math.max(pct, period.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-neutral-600 dark:text-neutral-400">{period.count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function DealCard({
  deal,
  isExpanded,
  onToggle,
}: {
  deal: DealOverviewItem
  isExpanded: boolean
  onToggle: () => void
}) {
  const [detail, setDetail] = useState<DealAnalytics | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handleToggle = () => {
    if (!isExpanded && !detail) {
      setDetailLoading(true)
      apiClient
        .get<DealAnalytics>(`/business/insights/deals/${deal.deal_id}`)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false))
    }
    onToggle()
  }

  const supplyLabel = deal.supply_limit
    ? `${deal.supply_used} / ${deal.supply_limit} claimed`
    : `${deal.supply_used} claimed`

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={handleToggle} className="w-full p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
        <div className="flex items-center gap-4">
          {deal.deal_image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.deal_image_path} alt="" className="size-12 flex-shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 object-cover" />
          ) : (
            <div className="size-12 flex-shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 flex-shrink-0 rounded-full", deal.is_active ? "bg-green-500" : "bg-neutral-400")} />
              <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{deal.deal_title}</p>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{supplyLabel}</p>
          </div>

          <div className="hidden flex-shrink-0 items-center gap-6 sm:flex">
            <RowStat label="Claims" value={deal.total_claims} />
            <RowStat label="This week" value={deal.claims_this_week} />
          </div>
          <div className="flex flex-shrink-0 items-center gap-3 sm:hidden">
            <RowStat label="Claims" value={deal.total_claims} />
          </div>

          <ChevronDown className={cn("size-4 flex-shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform", isExpanded && "rotate-180")} />
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/50 p-4">
          {/* Engagement funnel — impressions -> views -> claims. Self-fetches its
              own DI-B3s stats and zero-fills when unavailable, so it renders
              independently of the claims-detail load below (never gated by it). */}
          <DealFunnel dealId={dealPanelModel({ dealId: deal.deal_id, detailLoading, detail }).funnelDealId} />

          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : detail ? (
            <DealDetail data={detail} />
          ) : (
            <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">Unable to load detail.</p>
          )}
        </div>
      )}
    </Card>
  )
}

function groupByVenue(deals: DealOverviewItem[]): { venue: string; items: DealOverviewItem[] }[] {
  const map = new Map<string, DealOverviewItem[]>()
  for (const d of deals) {
    const key = d.venue_name || "Unknown venue"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return Array.from(map.entries()).map(([venue, items]) => ({ venue, items }))
}

function DealList({
  deals,
  isAllVenues,
  expandedId,
  onToggle,
}: {
  deals: DealOverviewItem[]
  isAllVenues: boolean
  expandedId: number | null
  onToggle: (id: number) => void
}) {
  if (deals.length === 0) return null

  if (isAllVenues) {
    return (
      <>
        {groupByVenue(deals).map((g) => (
          <div key={g.venue} className="mb-4">
            <VenueGroupLabel venue={g.venue} count={g.items.length} />
            <div className="ml-5 space-y-2">
              {g.items.map((deal) => (
                <DealCard key={deal.deal_id} deal={deal} isExpanded={expandedId === deal.deal_id} onToggle={() => onToggle(deal.deal_id)} />
              ))}
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <DealCard key={deal.deal_id} deal={deal} isExpanded={expandedId === deal.deal_id} onToggle={() => onToggle(deal.deal_id)} />
      ))}
    </div>
  )
}

export default function DealsOverviewView({
  data,
  isAllVenues = false,
}: {
  data: DealsOverview
  isAllVenues?: boolean
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const active = data.deals.filter((d) => d.is_active)
  const inactive = data.deals.filter((d) => !d.is_active)
  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id)

  return (
    <div>
      <StatGrid>
        <StatTile label="Active deals" value={data.total_active_deals} />
        <StatTile label="Total claims" value={data.total_claims.toLocaleString()} />
        <StatTile label="Claims this week" value={data.claims_this_week.toLocaleString()} />
        <StatTile label="Avg claims / deal" value={data.average_claims_per_deal} />
      </StatGrid>

      {data.deals.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Tag} title="No deals yet" description="Create a deal to see analytics here." />
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <Section title="Active deals" count={active.length} defaultOpen>
              <DealList deals={active} isAllVenues={isAllVenues} expandedId={expandedId} onToggle={toggleExpand} />
            </Section>
          )}
          {inactive.length > 0 && (
            <Section title="Expired / inactive" count={inactive.length} defaultOpen={false}>
              <DealList deals={inactive} isAllVenues={isAllVenues} expandedId={expandedId} onToggle={toggleExpand} />
            </Section>
          )}
        </>
      )}
    </div>
  )
}
