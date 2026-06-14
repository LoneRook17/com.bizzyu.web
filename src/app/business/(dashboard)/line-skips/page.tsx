"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Plus, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import { money } from "@/lib/v2/utils"
import type { LineSkip } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDays(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ")
}

export default function LineSkipsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { venues, isAllVenues, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [lineSkips, setLineSkips] = useState<LineSkip[]>([])
  const [loading, setLoading] = useState(true)

  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  const handleCreate = () => {
    if (isAllVenues && venues.length > 1) {
      setShowVenueModal(true)
    } else {
      if (isAllVenues && venues.length === 1) setSelectedVenue(venues[0].id)
      router.push("/business/line-skips/new")
    }
  }

  const fetchLineSkips = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ line_skips: LineSkip[] }>(`/business/line-skips?_=1${venueParam}`)
      setLineSkips(data.line_skips)
    } catch {
      setLineSkips([])
    } finally {
      setLoading(false)
    }
  }, [venueParam])

  useEffect(() => {
    fetchLineSkips()
  }, [fetchLineSkips])

  return (
    <>
      <PageHeader
        title="Line skips"
        description="Let customers skip the line and pay cover in advance."
        actions={
          canCreate ? (
            <Button onClick={handleCreate}>
              <Plus /> Create line skip
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      ) : lineSkips.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No line skips yet"
          description="Set up line skips to let customers skip the line at your venue."
          action={
            canCreate ? (
              <Button onClick={handleCreate} size="sm">
                <Plus /> Create line skip
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden p-0">
          {lineSkips.map((ls) => (
            <Link
              key={ls.id}
              href={`/business/line-skips/${ls.id}`}
              className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Zap className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{ls.name}</span>
                <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">
                  {formatDays(ls.days_of_week)} · {money(ls.default_price_cents)} ·{" "}
                  {ls.default_capacity ? `${ls.default_capacity} capacity` : "Unlimited"}
                </span>
              </span>
              <Badge variant={ls.is_active ? "success" : "neutral"}>{ls.is_active ? "Active" : "Stopped"}</Badge>
              <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
            </Link>
          ))}
        </Card>
      )}

      <Dialog open={showVenueModal} onOpenChange={setShowVenueModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose a venue</DialogTitle>
            <DialogDescription>Which venue is this line skip for?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {venues.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVenue(v.id)
                  setShowVenueModal(false)
                  router.push("/business/line-skips/new")
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
