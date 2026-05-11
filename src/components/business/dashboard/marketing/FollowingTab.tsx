"use client"

import { useCallback, useEffect, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import BlastComposerModal from "./BlastComposerModal"
import type {
  AudiencePreviewResponse,
  BlastAudienceBody,
  BlastChannel,
} from "./types"

/**
 * Marketing → Following sub-tab.
 *
 * Surfaces the count of business_followers (regardless of purchase history),
 * channel-reachable breakdown, and the two send actions. Audience body is
 * `{all_followers: true}` — the backend's BlastService.getFollowerSmsCohort /
 * getFollowerAnnouncementCohort resolves the actual recipients.
 */
const FOLLOWER_AUDIENCE: BlastAudienceBody = { all_followers: true }

export default function FollowingTab() {
  const [preview, setPreview] = useState<AudiencePreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composerChannel, setComposerChannel] = useState<BlastChannel | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    apiClient
      .post<AudiencePreviewResponse>("/business/marketing/blasts/audience-preview", {
        audience: FOLLOWER_AUDIENCE,
      })
      .then((res) => {
        setPreview(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Could not load followers")
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-500">Loading followers…</div>
  }
  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={load}
          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  const total = preview?.recipients_count ?? 0
  const pushReachable = preview?.breakdown_by_channel.push_reachable ?? 0
  const phoneReachable = preview?.breakdown_by_channel.phone_reachable ?? 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
        <p className="text-xs text-gray-600">Followers</p>
        <p className="mt-1 text-4xl font-extrabold text-primary">{total}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MiniStat label="Push reachable" value={pushReachable} />
          <MiniStat label="SMS reachable" value={phoneReachable} />
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm font-semibold text-ink">No followers yet.</p>
          <p className="mt-1 text-xs text-gray-500">
            Users auto-follow your business when they buy a ticket, and can
            manually follow from your venue page.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <SendButton
            label="Send Announcement"
            subtitle={`${pushReachable} reachable via push`}
            onClick={() => setComposerChannel("announcement")}
          />
          <SendButton
            label="Send SMS"
            subtitle={`${phoneReachable} reachable via SMS`}
            onClick={() => setComposerChannel("sms")}
          />
        </div>
      )}

      <BlastComposerModal
        open={composerChannel !== null}
        onClose={() => setComposerChannel(null)}
        channel={composerChannel ?? "announcement"}
        audience={FOLLOWER_AUDIENCE}
        audienceLabel={`All followers of your business · ~${total} recipient${total === 1 ? "" : "s"}`}
        onSent={() => {
          setComposerChannel(null)
          load()
        }}
      />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white/60 px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-ink">{value}</p>
    </div>
  )
}

function SendButton({
  label,
  subtitle,
  onClick,
}: {
  label: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:border-primary hover:bg-primary/5"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-gray-500">{subtitle}</span>
      </span>
      <span className="text-primary" aria-hidden>
        →
      </span>
    </button>
  )
}
