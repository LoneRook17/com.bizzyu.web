"use client"

import { useEffect, useState, use, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Send } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Textarea } from "@/components/business/v2/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"

const MAX_LEN = 400
const STOP_SUFFIX = "\nReply STOP to opt out · Bizzy"

export default function V2ComposeSmsBlastPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <V2ComposeSmsBlastInner {...props} />
    </Suspense>
  )
}

function V2ComposeSmsBlastInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const search = useSearchParams()
  const eventIdsParam = search.get("event_ids") || ""
  const eventIds = eventIdsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)

  const [message, setMessage] = useState("")
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (eventIds.length === 0) {
      router.replace(`/business/v2/events/${id}/manage/sms-blast/audience`)
      return
    }
    apiClient
      .get<{ recipient_count: number }>(`/business/sms-blasts/audience-preview?event_ids=${eventIdsParam}`)
      .then((d) => setRecipientCount(d.recipient_count))
      .catch(() => setRecipientCount(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIdsParam])

  const trimmed = message.trim()
  const containsStop = /\bSTOP\b/i.test(trimmed)
  const isValid = trimmed.length > 0 && trimmed.length <= MAX_LEN && !containsStop
  const previewBody = trimmed.length > 0 ? trimmed + STOP_SUFFIX : ""

  const handleSend = async () => {
    if (!isValid) return
    setSending(true)
    setError("")
    try {
      const res = await apiClient.post<{ recipient_count: number; sms_sent: number }>(`/business/sms-blasts`, {
        message: trimmed,
        event_ids: eventIds,
      })
      router.push(`/business/v2/events/${id}/manage/sms-blast?sent=${res.sms_sent}&recipients=${res.recipient_count}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send")
      setConfirming(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="New SMS blast"
        subtitle={
          recipientCount !== null
            ? <>~{recipientCount} ticket holder{recipientCount === 1 ? "" : "s"} with SMS opted-in · {eventIds.length} event{eventIds.length === 1 ? "" : "s"}</>
            : <>{eventIds.length} event{eventIds.length === 1 ? "" : "s"}</>
        }
        backHref={`/business/v2/events/${id}/manage/sms-blast/audience`}
        backLabel="Back to audience"
      />

      <div>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))} placeholder="Type your message…" rows={6} autoFocus />
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{message.length}/{MAX_LEN}</span>
          {containsStop && <span className="text-red-600 dark:text-red-400">Remove the word &quot;STOP&quot; — the opt-out line is appended automatically.</span>}
        </div>
      </div>

      {previewBody && (
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">Preview (sent)</p>
          <Card className="whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800/50 p-3 text-sm text-neutral-900 dark:text-neutral-100">{previewBody}</Card>
          <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">Opt-out suffix is required by SMS regulators and added automatically.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Card className="sticky bottom-4 px-4 py-3">
        <Button className="w-full" disabled={!isValid} onClick={() => setConfirming(true)}>
          <Send /> Send
        </Button>
      </Card>

      {/* confirm dialog */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm send</DialogTitle>
            <DialogDescription>
              Sending to {recipientCount ?? "?"} ticket holder{recipientCount === 1 ? "" : "s"} with SMS opted-in.
              Free during the May 2026 update — future blasts will be billed per Twilio segment cost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={sending}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <Loader2 className="animate-spin" />} Confirm send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
