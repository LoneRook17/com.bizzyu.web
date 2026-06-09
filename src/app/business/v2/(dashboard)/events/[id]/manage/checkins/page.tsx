"use client"

import { useState, useEffect, use } from "react"
import { CircleCheck, Users } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { CheckinEntry } from "@/lib/business/types"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Progress } from "@/components/business/v2/ui/progress"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { fmtDateTime } from "@/components/business/v2/events/eventStatus"

export default function V2CheckinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [checkins, setCheckins] = useState<CheckinEntry[]>([])
  const [summary, setSummary] = useState({ total: 0, redeemed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiClient
      .get<{ checkins: CheckinEntry[]; summary: { total: number; redeemed: number } }>(`/business/events/${id}/checkins`)
      .then((data) => {
        setCheckins(data.checkins)
        setSummary(data.summary)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load check-in history"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const checkedIn = checkins.filter((c) => c.is_redeemed)
  const notCheckedIn = checkins.filter((c) => !c.is_redeemed)
  const pct = summary.total > 0 ? (summary.redeemed / summary.total) * 100 : 0

  return (
    <>
      <ManageSubheader eventId={id} title="Check-in history" subtitle="Who scanned in, and who hasn't yet." />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        <StatTile value={String(summary.total)} label="Total tickets" />
        <StatTile value={String(summary.redeemed)} label="Checked in" accent />
        <StatTile value={`${pct.toFixed(1)}%`} label="Check-in rate" />
      </div>

      <Progress value={pct} />

      {checkins.length === 0 ? (
        <EmptyState icon={Users} title="No ticket holders yet" description="Once tickets are sold, attendees show up here." />
      ) : (
        <div className="flex flex-col gap-4">
          {checkedIn.length > 0 && (
            <CheckinGroup title={`Checked in (${checkedIn.length})`} tint="green" rows={checkedIn} />
          )}
          {notCheckedIn.length > 0 && (
            <CheckinGroup title={`Not checked in (${notCheckedIn.length})`} tint="neutral" rows={notCheckedIn} />
          )}
        </div>
      )}
    </>
  )
}

function StatTile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <Card className="p-4 text-center">
      <p className={accent ? "text-2xl font-semibold tracking-tight text-[#079455]" : "text-2xl font-semibold tracking-tight text-neutral-900"}>{value}</p>
      <p className="mt-0.5 text-[13px] text-neutral-500">{label}</p>
    </Card>
  )
}

function CheckinGroup({ title, tint, rows }: { title: string; tint: "green" | "neutral"; rows: CheckinEntry[] }) {
  return (
    <Card className="overflow-hidden">
      <div className={tint === "green" ? "border-b border-neutral-100 bg-green-50/50 px-5 py-3" : "border-b border-neutral-100 bg-neutral-50/50 px-5 py-3"}>
        <h3 className={tint === "green" ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-neutral-600"}>{title}</h3>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-neutral-50">
          {rows.map((c) => (
            <div key={c.ticket_instance_id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{c.attendee_name || "Guest"}</p>
                <p className="text-[13px] text-neutral-500">{c.ticket_name}</p>
              </div>
              <div className="ml-4 shrink-0 text-right">
                {c.is_redeemed ? (
                  <>
                    <p className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><CircleCheck className="size-3.5" /> Checked in</p>
                    {c.redeemed_at && <p className="text-[11px] text-neutral-400">{fmtDateTime(c.redeemed_at)}</p>}
                  </>
                ) : (
                  <p className="text-xs text-neutral-400">Not scanned</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
