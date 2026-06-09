"use client"

import { useEffect, useState, use } from "react"
import { Loader2, MessageSquare, Plus, Send } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Textarea } from "@/components/business/v2/ui/input"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { fmtDateTime } from "@/components/business/v2/events/eventStatus"

const MAX_LEN = 280

interface Announcement {
  id: number
  message: string
  recipient_count: number
  push_count: number
  fired_at: string
}

export default function V2AnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [eventName, setEventName] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [confirmCount, setConfirmCount] = useState<number | null>(null)

  const fetchItems = () => {
    apiClient
      .get<{ announcements: Announcement[] }>(`/business/events/${id}/announcements`)
      .then((data) => setItems(data.announcements))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    apiClient.get<{ name: string }>(`/business/events/${id}`).then((d) => setEventName(d.name)).catch(() => {})
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSend = async () => {
    const trimmed = message.trim()
    if (!trimmed || trimmed.length > MAX_LEN) return
    setSending(true)
    setSendError("")
    try {
      const result = await apiClient.post<{ recipient_count: number }>(`/business/events/${id}/announcements`, { message: trimmed })
      setShowCompose(false)
      setMessage("")
      setConfirmCount(result.recipient_count)
      fetchItems()
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Failed to send")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="Announcements"
        subtitle={eventName ?? "Push a notification to everyone with a ticket."}
        actions={
          <Button onClick={() => { setShowCompose(true); setSendError(""); setConfirmCount(null) }}>
            <Plus /> New announcement
          </Button>
        }
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {confirmCount !== null && (
        <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm text-green-700 dark:text-green-400">
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
          action={<Button onClick={() => { setShowCompose(true); setSendError(""); setConfirmCount(null) }}><Plus /> New announcement</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <p className="text-sm text-neutral-900 dark:text-neutral-100">{a.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                <span>{fmtDateTime(a.fired_at)}</span>
                <span>·</span>
                <span>{a.recipient_count} recipient{a.recipient_count === 1 ? "" : "s"}</span>
                {a.push_count > 0 && (<><span>·</span><span>{a.push_count} delivered</span></>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* compose dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{eventName || "Announcement"}</DialogTitle>
            <DialogDescription>Sends a push notification to all ticket holders.</DialogDescription>
          </DialogHeader>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))} placeholder="Your message here" rows={5} autoFocus />
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>{message.length}/{MAX_LEN}</span>
            {sendError && <span className="text-red-600 dark:text-red-400">{sendError}</span>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCompose(false)} disabled={sending}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim() || message.trim().length > MAX_LEN}>
              {sending ? <Loader2 className="animate-spin" /> : <Send />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
