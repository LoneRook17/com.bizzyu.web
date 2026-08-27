"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, MapPin } from "lucide-react"
import { ANALYTICS_LIST_FULL_CLASS, ANALYTICS_LIST_PREVIEW_CLASS } from "@/lib/business/analytics-list"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/** Metric tile that mirrors the Home page stat tiles. */
export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{value}</p>
    </Card>
  )
}

/** Grid of metric tiles. */
export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 4 | 5 }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4", cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
      {children}
    </div>
  )
}

/** Collapsible section header with a count badge, reskinned to v2.
 *  Open lists are a ~4-row preview (scroll inside), not an unbounded ledger. */
export function Section({
  title,
  count,
  defaultOpen = true,
  fullPage = false,
  accent = "event",
  children,
}: {
  title: string
  count: number
  defaultOpen?: boolean
  fullPage?: boolean
  accent?: "event" | "weekly_cover"
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const hover = accent === "weekly_cover" ? "group-hover:text-access" : "group-hover:text-[#05EB54]"
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2 outline-none"
      >
        {open ? (
          <ChevronDown className="size-4 text-neutral-400 dark:text-neutral-500" />
        ) : (
          <ChevronRight className="size-4 text-neutral-400 dark:text-neutral-500" />
        )}
        <h3 className={cn("text-sm font-semibold text-neutral-900 dark:text-neutral-100", hover)}>{title}</h3>
        <span className="inline-flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          {count}
        </span>
      </button>
      {open && (
        <div className={cn("mt-3", fullPage ? ANALYTICS_LIST_FULL_CLASS : ANALYTICS_LIST_PREVIEW_CLASS)}>
          {children}
        </div>
      )}
    </div>
  )
}

/** Venue group label used in the All-Venues rollup. */
export function VenueGroupLabel({ venue, count }: { venue: string; count: number }) {
  return (
    <div className="mb-2 ml-1 flex items-center gap-2">
      <MapPin className="size-3.5 text-neutral-400 dark:text-neutral-500" />
      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{venue}</span>
      <span className="text-xs text-neutral-400 dark:text-neutral-500">({count})</span>
    </div>
  )
}

/** Small right-aligned stat used inside list rows. */
export function RowStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-right">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  )
}

/** Loading skeleton shared across analytics tabs. */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[76px] rounded-xl" />
      ))}
    </div>
  )
}
