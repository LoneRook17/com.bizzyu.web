"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient, ApiError } from "@/lib/business/api-client"

const MAX_LEN = 400
const STOP_SUFFIX = " Reply STOP to opt out · Bizzy"

export default function ComposeSmsBlastPage({ params }: { params: Promise<{ id: string }> }) {
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
      router.replace(`/business/events/${id}/manage/sms-blast/audience`)
      return
    }
    apiClient
      .get<{ recipient_count: number }>(
        `/business/sms-blasts/audience-preview?event_ids=${eventIdsParam}`
      )
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
      const res = await apiClient.post<{ recipient_count: number; sms_sent: number }>(
        `/business/sms-blasts`,
        { message: trimmed, event_ids: eventIds }
      )
      router.push(
        `/business/events/${id}/manage/sms-blast?sent=${res.sms_sent}&recipients=${res.recipient_count}`
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send")
      setConfirming(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl pb-32">
      <Link
        href={`/business/events/${id}/manage/sms-blast/audience`}
        className="text-xs text-gray-500 hover:text-primary mb-2 inline-block"
      >
        &larr; Back to audience
      </Link>
      <div className="mb-2">
        <h1 className="text-xl font-bold text-ink">New SMS Blast</h1>
        <p className="text-sm text-gray-500 mt-1">
          {eventIds.length} event{eventIds.length === 1 ? "" : "s"}
          {recipientCount !== null && <> · ~{recipientCount} contact{recipientCount === 1 ? "" : "s"}</>}
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
        placeholder="Type your message…"
        rows={6}
        autoFocus
        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{message.length}/{MAX_LEN}</span>
        {containsStop && (
          <span className="text-red-500">
            Remove the word &quot;STOP&quot; — opt-out instruction is appended automatically.
          </span>
        )}
      </div>

      {previewBody && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-500 mb-2">Preview (sent)</p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-ink whitespace-pre-wrap">
            {previewBody}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Opt-out suffix is required by SMS regulators and added automatically.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      {/* Pinned bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => setConfirming(true)}
            disabled={!isValid}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>

      {/* Confirm sheet */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-ink mb-2">Confirm send</h2>
            <p className="text-sm text-gray-700">
              Sending to {recipientCount ?? "?"} contact{recipientCount === 1 ? "" : "s"}.
              Free during the May 2026 update — future blasts will be billed per Twilio segment cost.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {sending ? "Sending…" : "Confirm Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
