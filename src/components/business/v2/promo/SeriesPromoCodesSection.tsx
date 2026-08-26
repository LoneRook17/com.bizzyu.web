"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Plus, Ticket } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { VenueSeriesPromoGroup } from "@/lib/business/types"
import {
  SERIES_SECTION_DESCRIPTION,
  SERIES_SECTION_EMPTY_DESCRIPTION,
  SERIES_SECTION_EMPTY_TITLE,
  SERIES_SECTION_TITLE,
  isMissingSeriesPromoEndpoint,
  parseVenueSeriesPromoResponse,
  seriesKindChip,
  seriesPromoBasePath,
  seriesPromoListPath,
  seriesPromoManageHref,
} from "@/lib/business/venue-series-promo"
import { PromoCodesPanel, SERIES_PROMO_COPY } from "@/components/business/v2/promo/PromoCodesPanel"
import { Button } from "@/components/business/v2/ui/button"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/**
 * P5 Series codes: a second block under Universal on /business/promo-codes.
 * Fetches GET /business/venues/:venueId/promo-codes/series. Does not touch
 * the venue-wide list. Missing sibling → empty, not an error wall.
 */
export function SeriesPromoCodesSection({
  venueId,
  canManage,
}: {
  venueId: number
  canManage: boolean
}) {
  const [series, setSeries] = useState<VenueSeriesPromoGroup[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSeries = useCallback(() => {
    setLoading(true)
    apiClient
      .get<unknown>(seriesPromoListPath(venueId))
      .then((data) => setSeries(parseVenueSeriesPromoResponse(data)))
      .catch((err) => {
        if (err instanceof ApiError && isMissingSeriesPromoEndpoint(err.status)) {
          setSeries([])
          return
        }
        setSeries([])
      })
      .finally(() => setLoading(false))
  }, [venueId])

  useEffect(() => {
    fetchSeries()
  }, [fetchSeries])

  return (
    <section className="flex flex-col gap-4 border-t border-neutral-200 pt-8 dark:border-neutral-800">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {SERIES_SECTION_TITLE}
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">{SERIES_SECTION_DESCRIPTION}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : series.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={SERIES_SECTION_EMPTY_TITLE}
          description={SERIES_SECTION_EMPTY_DESCRIPTION}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {series.map((group) => {
            const chip = seriesKindChip(group.product_kind)
            return (
              <div key={group.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {group.name}
                    </h3>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ color: chip.ink, backgroundColor: `${chip.ink}1a` }}
                    >
                      {chip.label}
                    </span>
                  </div>
                  <Link
                    href={seriesPromoManageHref(group.product_kind, group.id)}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-[#05EB54] hover:underline"
                  >
                    Manage <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
                <p className="-mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                  Applies to every night of this{" "}
                  {group.product_kind === "weekly_cover" ? "Weekly Cover" : "named recurring event"}, not the whole
                  venue.
                </p>
                <PromoCodesPanel
                  basePath={seriesPromoBasePath(group.id)}
                  copy={SERIES_PROMO_COPY(group.name)}
                  canManage={canManage}
                  providedCodes={group.promo_codes}
                  headerAction={(openCreate) =>
                    canManage ? (
                      <div className="flex justify-end">
                        <Button size="sm" onClick={openCreate}>
                          <Plus /> Create code
                        </Button>
                      </div>
                    ) : null
                  }
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
