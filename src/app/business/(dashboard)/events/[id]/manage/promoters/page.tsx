"use client"

import { useState, useEffect, use } from "react"
import { Check, Copy, Megaphone } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { PromoterDetail, PromotersResponse } from "@/lib/business/types"
import { money } from "@/lib/v2/utils"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/business/v2/ui/avatar"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"

function initials(s?: string | null) {
  if (!s) return "?"
  return s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
}

export default function V2EventPromotersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [promoters, setPromoters] = useState<PromoterDetail[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedId, setCopiedId] = useState<number | null>(null)

  async function copyShareUrl(p: PromoterDetail) {
    try {
      await navigator.clipboard.writeText(p.share_url)
      setCopiedId(p.tracking_link_id)
      setTimeout(() => setCopiedId((cur) => (cur === p.tracking_link_id ? null : cur)), 1500)
    } catch {
      // Clipboard blocked - leave the URL visible to copy manually.
    }
  }

  useEffect(() => {
    apiClient
      .get<PromotersResponse>(`/business/events/${id}/promoters`)
      .then((res) => setPromoters(res.promoters ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load promoters"))
      .finally(() => setLoading(false))
  }, [id])

  const totalCommissionCents = (promoters ?? []).reduce(
    (sum, p) => sum + p.commission_pending_cents + p.commission_paid_cents,
    0
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <ManageSubheader eventId={id} title="Promoters" subtitle="People sharing your event link and what they've earned." />

      {error ? (
        <EmptyState icon={Megaphone} title={error} />
      ) : (
        <>
          {/* going to promoters */}
          <Card>
            <CardContent>
              <div className="mb-2 flex items-center gap-2">
                <Megaphone className="size-4 text-[#05EB54]" />
                <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Going to promoters</h3>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{money(totalCommissionCents)}</p>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                Already deducted from your gross. You don&apos;t pay this separately. Your Stripe take-home is what&apos;s left after this.
              </p>
            </CardContent>
          </Card>

          {(promoters ?? []).length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No promoters yet"
              description="When users opt in to promote this event, they'll appear here."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {(promoters ?? []).map((p) => (
                  <div key={p.tracking_link_id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        {p.profile_photo_path && <AvatarImage src={p.profile_photo_path} alt={p.full_name ?? ""} />}
                        <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.full_name ?? "Unknown"}</p>
                        <p className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{p.code}</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <Stat value={String(p.clicks)} label="clicks" />
                        <Stat value={String(p.sales_count)} label="sales" />
                        <Stat value={money(p.commission_pending_cents + p.commission_paid_cents)} label="earned" accent />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2">
                      <p className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-600 dark:text-neutral-400" title={p.share_url}>{p.share_url}</p>
                      <button
                        onClick={() => copyShareUrl(p)}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#05EB54] hover:underline"
                      >
                        {copiedId === p.tracking_link_id ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={accent ? "font-semibold text-[#05EB54]" : "font-semibold text-neutral-700 dark:text-neutral-300"}>{value}</p>
      <p className="text-neutral-400 dark:text-neutral-500">{label}</p>
    </div>
  )
}
