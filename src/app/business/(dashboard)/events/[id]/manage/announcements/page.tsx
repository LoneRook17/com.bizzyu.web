"use client"

import { useCallback, useEffect, useMemo, useState, use } from "react"
import { MessageSquare, Plus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { fmtDateTime } from "@/components/business/v2/events/eventStatus"
import BlastComposer, { type ComposerSendResult } from "@/components/business/v2/marketing/BlastComposer"
import type { AudiencePreviewResponse, BlastAudienceBody } from "@/components/business/dashboard/marketing/types"

/**
 * Event → Manage → Announcements: this event's send history, plus compose.
 *
 * Compose is the SHARED staged composer (BlastComposer: 280 plain-text
 * characters, emoji stripped as typed, compose → review → send → sent, one-
 * tap `Add event link`), the same contract as the app's Announce sheet. The
 * per-event wire rides the overrides: `GET …/announcements/audience-preview`
 * (`recipient_count` + weekly `announcement_usage`) mapped to the blast
 * preview shape, and `POST …/announcements { message }`.
 */

interface Announcement {
  id: number
  message: string
  recipient_count: number
  push_count: number
  fired_at: string
}

interface AnnouncementUsage {
  used: number
  limit: number
  remaining: number
  resets_at?: string
  retry_after_seconds?: number
}

interface AnnouncementPreview {
  recipient_count?: number
  recipients_count?: number
  announcement_usage?: AnnouncementUsage
}

export default function V2AnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const eventId = Number(id)
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [eventName, setEventName] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [confirmCount, setConfirmCount] = useState<number | null>(null)

  const fetchItems = useCallback(() => {
    apiClient
      .get<{ announcements: Announcement[] }>(`/business/events/${id}/announcements`)
      .then((data) => setItems(data.announcements))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    apiClient.get<{ name: string }>(`/business/events/${id}`).then((d) => setEventName(d.name)).catch(() => {})
    fetchItems()
  }, [id, fetchItems])

  const audience = useMemo<BlastAudienceBody>(() => ({ event_id: eventId }), [eventId])

  // The per-event preview in the blast preview shape. A spent weekly pool
  // (shared by per-event, venue-wide and the auto publish push) becomes the
  // composer's cooldown, counted from the server's retry_after_seconds.
  const previewOverride = useCallback(async (): Promise<AudiencePreviewResponse> => {
    const d = await apiClient.get<AnnouncementPreview>(`/business/events/${id}/announcements/audience-preview`)
    const n = d.recipient_count ?? d.recipients_count ?? 0
    const usage = d.announcement_usage
    const spent = usage != null && usage.remaining <= 0
    return {
      recipients_count: n,
      breakdown_by_channel: { push_reachable: n, phone_reachable: 0 },
      announcement_cooldown: {
        allowed: !spent,
        retry_after_seconds: spent ? Math.max(usage?.retry_after_seconds ?? 0, 60) : 0,
      },
    }
  }, [id])

  const sendOverride = useCallback(
    (message: string): Promise<ComposerSendResult> =>
      apiClient.post<{ recipient_count: number }>(`/business/events/${id}/announcements`, { message }),
    [id],
  )

  const openCompose = () => {
    setConfirmCount(null)
    setShowCompose(true)
  }

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="Announcements"
        subtitle={eventName ?? "Push a notification to everyone with a ticket."}
        actions={
          <Button onClick={openCompose}>
            <Plus /> New announcement
          </Button>
        }
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {confirmCount !== null && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
          Sent to {confirmCount} guest{confirmCount === 1 ? "" : "s"}.
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Send your first announcement"
          description="Quickly notify everyone with a ticket to this event."
          action={
            <Button onClick={openCompose}>
              <Plus /> New announcement
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <p className="whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-100">{a.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                <span>{fmtDateTime(a.fired_at)}</span>
                <span>·</span>
                <span>
                  {a.recipient_count} recipient{a.recipient_count === 1 ? "" : "s"}
                </span>
                {a.push_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{a.push_count} delivered</span>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <BlastComposer
        open={showCompose}
        onClose={() => setShowCompose(false)}
        channel="announcement"
        audience={audience}
        audienceLabel={`${eventName ?? "Event"} ticket holders`}
        cohort="ticket holders"
        quotaScope="venue"
        // No `Add event link` (2026-10-27): the push already opens this event
        // on tap, and a URL in a push body is noise. No event picker either.
        previewOverride={previewOverride}
        sendOverride={sendOverride}
        onSent={(r) => {
          setConfirmCount(r.recipient_count ?? r.recipients_count ?? null)
          fetchItems()
        }}
      />
    </>
  )
}
