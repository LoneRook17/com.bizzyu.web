"use client"

import { useEffect, useMemo, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Button } from "@/components/business/v2/ui/button"
import { Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { cn } from "@/lib/v2/utils"
import type {
  AudiencePreviewResponse,
  BlastAudienceBody,
  BlastChannel,
  SendBlastResponse,
} from "@/components/business/dashboard/marketing/types"

const ANNOUNCEMENT_MAX = 280
const SMS_MAX = 400
const SMS_SUFFIX = "\nReply STOP to opt out · Bizzy"

interface Props {
  open: boolean
  onClose: () => void
  channel: BlastChannel
  /** Either user_ids OR filters - NOT both. */
  audience: BlastAudienceBody
  /** Human-readable summary of who's being targeted. */
  audienceLabel?: string
  onSent?: (result: SendBlastResponse) => void
}

export default function BlastComposer({ open, onClose, channel, audience, audienceLabel, onSent }: Props) {
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState<AudiencePreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setMessage("")
      setError(null)
      setPreview(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    apiClient
      .post<AudiencePreviewResponse>("/business/marketing/blasts/audience-preview", { audience })
      .then((res) => {
        if (!cancelled) setPreview(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load audience preview")
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, audience])

  const charLimit = channel === "sms" ? SMS_MAX : ANNOUNCEMENT_MAX
  const charCount = message.length
  const overLimit = charCount > charLimit
  const reachable = useMemo(() => {
    if (!preview) return null
    return channel === "sms" ? preview.breakdown_by_channel.phone_reachable : preview.breakdown_by_channel.push_reachable
  }, [preview, channel])

  const channelLabel = channel === "sms" ? "SMS blast" : "Announcement"

  const onSend = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await apiClient.post<SendBlastResponse>("/business/marketing/blasts", {
        channel,
        message: message.trim(),
        audience,
      })
      if (onSent) onSent(res)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {channelLabel}</DialogTitle>
          {audienceLabel && <DialogDescription>{audienceLabel}</DialogDescription>}
        </DialogHeader>

        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300">
          {previewLoading && <span>Calculating audience…</span>}
          {!previewLoading && preview && (
            <span>
              Sending to <span className="font-semibold">{reachable}</span> of {preview.recipients_count} attendee
              {preview.recipients_count === 1 ? "" : "s"}
              {channel === "sms" ? " with SMS opted in" : " with push enabled"}.
            </span>
          )}
        </div>

        <div>
          <Label htmlFor="blast-message" className="mb-1.5 block">Message</Label>
          <Textarea
            id="blast-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={channel === "sms" ? "Hey! New event drop this weekend, link in bio." : "Tap to see what's new at our spot."}
          />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className={cn(overLimit ? "text-red-600 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400")}>
              {charCount} / {charLimit}
            </span>
            {channel === "sms" && (
              <span className="text-neutral-400 dark:text-neutral-500">
                Auto-appended: <code>{SMS_SUFFIX.trim()}</code>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={onSend} disabled={sending || message.trim().length === 0 || overLimit || (reachable ?? 0) === 0}>
            {sending ? "Sending…" : `Send ${channelLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
