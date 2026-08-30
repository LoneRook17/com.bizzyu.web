"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, ChevronDown, Plus, Ticket } from "lucide-react"
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
 *
 * Minimal by default (Aug 2026): each series is ONE collapsed row (name +
 * kind chip + code count + Manage), expanding on demand to the full
 * PromoCodesPanel — the SeriesGroupRow disclosure idiom, so ten programs no
 * longer render ten full tables. Programs with zero codes are hidden behind a
 * "Show N programs without codes" toggle instead of each mounting an empty
 * panel.
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
  const [showEmptyGroups, setShowEmptyGroups] = useState(false)

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

  const withCodes = series.filter((g) => g.promo_codes.length > 0)
  const withoutCodes = series.filter((g) => g.promo_codes.length === 0)
  // Preserve the server's order when the empty groups are toggled in.
  const visible = showEmptyGroups ? series : withCodes

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
        <div className="flex flex-col gap-3">
          {visible.length === 0 && (
            <EmptyState
              icon={Ticket}
              title={SERIES_SECTION_EMPTY_TITLE}
              description={SERIES_SECTION_EMPTY_DESCRIPTION}
            />
          )}
          {visible.map((group) => (
            <SeriesPromoGroupRow key={group.id} group={group} canManage={canManage} />
          ))}
          {withoutCodes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEmptyGroups((v) => !v)}
              aria-expanded={showEmptyGroups}
              className="self-start text-[13px] font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              {showEmptyGroups
                ? "Hide programs without codes"
                : `Show ${withoutCodes.length} ${withoutCodes.length === 1 ? "program" : "programs"} without codes`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * ONE series as one collapsed row — the SeriesGroupRow disclosure idiom
 * (useState + aria-expanded + rotating ChevronDown, expanded children under
 * border-l-2 pl-4 so they still read as this row's contents). The full
 * PromoCodesPanel mounts only on expand.
 */
function SeriesPromoGroupRow({
  group,
  canManage,
}: {
  group: VenueSeriesPromoGroup
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const chip = seriesKindChip(group.product_kind)
  const codeCount = group.promo_codes.length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
        >
          <ChevronDown
            className={`size-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
          <span className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {group.name}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: chip.ink, backgroundColor: `${chip.ink}1a` }}
          >
            {chip.label}
          </span>
          <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {codeCount} {codeCount === 1 ? "code" : "codes"}
          </span>
        </button>
        <Link
          href={seriesPromoManageHref(group.product_kind, group.id)}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[#05EB54] hover:underline"
        >
          Manage <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {open && (
        // Indented so the expanded panel reads as THIS row's contents, not as
        // the section having grown a new top-level block.
        <div className="flex flex-col gap-3 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            Applies to every night of this{" "}
            {group.product_kind === "weekly_cover" ? "Weekly Cover" : "named recurring event"}, not the whole
            venue.
          </p>
          <PromoCodesPanel
            basePath={seriesPromoBasePath(group.product_kind, group.id)}
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
      )}
    </div>
  )
}
