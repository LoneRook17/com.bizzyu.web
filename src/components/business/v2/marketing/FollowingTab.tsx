"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MessageSquare, ArrowRight } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import BlastComposer from "./BlastComposer"
import type {
  AudiencePreviewResponse,
  BlastAudienceBody,
  BlastChannel,
} from "@/components/business/dashboard/marketing/types"

/**
 * Marketing → Followers sub-tab.
 *
 * Followers are venue-scoped (May 2026 update). This tab scopes by the venue
 * selected on the Marketing page; passing no venue scopes to "All venues"
 * (rollup, deduped on user_id). Multi-venue businesses must pick a venue
 * before sending, since follower blasts go one venue at a time.
 */
interface Props {
  /** Single-venue scope. Mutually exclusive with venueIds. */
  venueId: number | null
  /** All-venues rollup scope. Mutually exclusive with venueId. */
  venueIds: number[]
  /** Display label for the venue scope, used in the composer header. */
  venueLabel: string
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  )
}

export default function FollowingTab({ venueId, venueIds, venueLabel }: Props) {
  const [preview, setPreview] = useState<AudiencePreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composerChannel, setComposerChannel] = useState<BlastChannel | null>(null)

  const mustPickVenue = venueId == null && venueIds.length > 1

  const audience: BlastAudienceBody = useMemo(() => {
    if (venueId != null) return { all_followers: true, venue_id: venueId }
    return { all_followers: true, venue_ids: venueIds }
  }, [venueId, venueIds])

  const hasTarget = audience.venue_id != null || (audience.venue_ids?.length ?? 0) > 0

  const load = useCallback(() => {
    if (!hasTarget) {
      setPreview({ recipients_count: 0, breakdown_by_channel: { phone_reachable: 0, push_reachable: 0 } })
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    apiClient
      .post<AudiencePreviewResponse>("/business/marketing/blasts/audience-preview", { audience })
      .then((res) => {
        setPreview(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Could not load followers")
        setLoading(false)
      })
  }, [audience, hasTarget])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[132px] rounded-xl" />
        <Skeleton className="h-[64px] rounded-xl" />
      </div>
    )
  }
  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
          Retry
        </Button>
      </Card>
    )
  }

  const total = preview?.recipients_count ?? 0
  const pushReachable = preview?.breakdown_by_channel.push_reachable ?? 0
  const phoneReachable = preview?.breakdown_by_channel.phone_reachable ?? 0

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-green-50/60 p-5">
        <p className="text-xs text-neutral-600">Followers of {venueLabel}</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-[#079455]">{total}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Push reachable" value={pushReachable} />
          <MiniStat label="SMS reachable" value={phoneReachable} />
        </div>
      </Card>

      {mustPickVenue ? (
        <Card className="border-green-200 bg-green-50/40 p-5">
          <p className="text-sm font-semibold text-neutral-900">Pick a venue to send follower blasts.</p>
          <p className="mt-1 text-xs text-neutral-600">
            Followers are per-venue, so we send to one venue at a time. Use the venue switcher in the sidebar to choose a
            specific venue.
          </p>
        </Card>
      ) : total === 0 ? (
        <Card className="p-5 text-center">
          <p className="text-sm font-semibold text-neutral-900">No followers yet.</p>
          <p className="mt-1 text-xs text-neutral-500">
            Users auto-follow when they buy a ticket at one of your venues, and can manually follow from the venue page.
          </p>
        </Card>
      ) : (
        <button
          onClick={() => setComposerChannel("sms")}
          className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-left shadow-sm outline-none transition-colors hover:border-[#079455] hover:bg-green-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-green-50 text-[#079455]">
              <MessageSquare className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-neutral-900">Send SMS</span>
              <span className="block text-xs text-neutral-500">{phoneReachable} reachable via SMS</span>
            </span>
          </span>
          <ArrowRight className="size-4 text-neutral-400" />
        </button>
      )}

      <BlastComposer
        open={composerChannel !== null && !mustPickVenue}
        onClose={() => setComposerChannel(null)}
        channel={composerChannel ?? "sms"}
        audience={audience}
        audienceLabel={`Followers of ${venueLabel} · ~${total} recipient${total === 1 ? "" : "s"}`}
        onSent={() => {
          setComposerChannel(null)
          load()
        }}
      />
    </div>
  )
}
