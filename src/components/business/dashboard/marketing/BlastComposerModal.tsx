"use client"

import { useEffect, useMemo, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type {
  AudienceFiltersBody,
  AudiencePreviewResponse,
  BlastAudienceBody,
  BlastChannel,
  SendBlastResponse,
} from "./types"

const ANNOUNCEMENT_MAX = 280
const SMS_MAX = 400
const SMS_SUFFIX = " Reply STOP to opt out · Bizzy"

interface Props {
  open: boolean
  onClose: () => void
  channel: BlastChannel
  /** Either user_ids OR filters — NOT both. */
  audience: BlastAudienceBody
  /**
   * Optional human-readable summary of the audience (e.g. "5 selected" or
   * "Tag: VIPs · last 30d"). Shown in the modal header so the sender knows
   * exactly who they're targeting before pressing Send.
   */
  audienceLabel?: string
  onSent?: (result: SendBlastResponse) => void
}

export default function BlastComposerModal({
  open,
  onClose,
  channel,
  audience,
  audienceLabel,
  onSent,
}: Props) {
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
      .post<AudiencePreviewResponse>("/business/marketing/blasts/audience-preview", {
        audience,
      })
      .then((res) => {
        if (!cancelled) setPreview(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load audience preview")
        }
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
    return channel === "sms"
      ? preview.breakdown_by_channel.phone_reachable
      : preview.breakdown_by_channel.push_reachable
  }, [preview, channel])

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

  if (!open) return null

  const channelLabel = channel === "sms" ? "SMS Blast" : "Announcement"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Send {channelLabel}</h2>
            {audienceLabel && (
              <p className="mt-0.5 text-xs text-gray-500">{audienceLabel}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-ink">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700">
            {previewLoading && <span>Calculating audience…</span>}
            {!previewLoading && preview && (
              <span>
                Sending to <span className="font-semibold">{reachable}</span> of{" "}
                {preview.recipients_count} attendee
                {preview.recipients_count === 1 ? "" : "s"}
                {channel === "sms"
                  ? " with SMS opted-in"
                  : " with push enabled"}
                .
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder={
                channel === "sms"
                  ? "Hey! New event drop this weekend — link in bio."
                  : "Tap to see what's new at our spot."
              }
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={overLimit ? "text-red-600" : "text-gray-500"}>
                {charCount} / {charLimit}
              </span>
              {channel === "sms" && (
                <span className="text-gray-400">
                  Auto-appended: <code>{SMS_SUFFIX.trim()}</code>
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={
              sending || message.trim().length === 0 || overLimit || (reachable ?? 0) === 0
            }
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:bg-gray-300"
          >
            {sending ? "Sending…" : `Send ${channelLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}
