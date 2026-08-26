"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, ChevronRight, Plus, Repeat } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { RecurringSeriesListItem } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Card } from "@/components/business/v2/ui/card"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { WeekdayChips } from "@/components/business/v2/recurring/WeekdayChips"
import { fmtDateOnly, fmtDateOnlyLong, fmtTimeOfDay } from "@/components/business/v2/recurring/schedule"

export default function RecurringSeriesListPage() {
  const { user } = useAuth()
  const [series, setSeries] = useState<RecurringSeriesListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    apiClient
      .get<{ series: RecurringSeriesListItem[] }>("/business/recurring-series")
      .then((data) => setSeries(data.series ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load recurring series"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader
        title="Recurring"
        description="Weekly events that run themselves — every night is created automatically."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/business/recurring/new"><Plus /> New series</Link>
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : error ? (
        <EmptyState icon={Repeat} title={error} />
      ) : series.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring series yet"
          description="Run the same event every week — like Trivia Tuesdays or Friday Karaoke? Set it up once and we'll create each night automatically. You can still edit or cancel any single night without touching the rest."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/business/recurring/new"><Plus /> Create a series</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {series.map((s) => {
            const active = !!s.is_active
            return (
              <Link key={s.id} href={`/business/recurring/${s.id}`} className="block">
                <Card className="p-4 transition-colors hover:border-[#05EB54]/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <div className="flex items-center gap-4">
                    {/* flyer thumb */}
                    <div className="hidden size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800 sm:flex">
                      {s.flyer_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.flyer_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Repeat className="size-5 text-neutral-400 dark:text-neutral-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{s.name}</span>
                        <Badge variant={active ? "success" : "neutral"} size="sm">{active ? "Active" : "Suspended"}</Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <WeekdayChips days={s.days_of_week} size="sm" />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {fmtTimeOfDay(s.start_time)} · from {fmtDateOnly(s.date_range_start)}
                          {s.date_range_end ? ` until ${fmtDateOnly(s.date_range_end)}` : " until you suspend it"}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <CalendarClock className="size-3.5 shrink-0" />
                        {s.next_occurrence_date
                          ? <>Next night {fmtDateOnlyLong(s.next_occurrence_date)} · {s.upcoming_count} upcoming</>
                          : active
                            ? "No upcoming nights scheduled yet"
                            : "No upcoming nights"}
                      </p>
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
