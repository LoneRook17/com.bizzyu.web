"use client"

import { useState, useEffect, useCallback } from "react"

import { getApiBaseUrl } from "@/lib/api-url"
import {
  checkinRedeemPath,
  checkinRedeemStatusLabel,
  guestCameraCheckinEnabled,
  guestCheckinAccent,
  guestCheckinFooterCopy,
  guestCheckinTypeLabel,
  guestTicketIsRedeemable,
} from "@/lib/checkin-guest"
import {
  checkinTransportRefusal,
  resolveCheckinRefusal,
  type CheckinRefusal,
} from "@/lib/checkin-refusal"

const API_URL = getApiBaseUrl()

interface TicketInfo {
  uuid: string
  ticket_name: string
  ticket_type: string
  event_name: string
  event_id: number
  attendee_name: string
  venue_name: string | null
  start_date_time: string
  end_date_time: string
  is_redeemed: boolean
  redeemed_at: string | null
  is_refunded: boolean
  event_status: string
  access_kind?: string | null
  redemption_mode?: string | null
}

interface RedeemResult {
  status: string
  ticket_type: string | null
  ticket: {
    uuid: string
    ticket_name: string
    event_name: string
    owner_name: string
    redeemed_at: string | null
  }
  /** Null on success. On a refusal, what the door reads. */
  refusal: CheckinRefusal | null
}

type PageState = "loading" | "ticket_info" | "error"
type OverlayState = null | "confirming" | "result"

export default function CheckinClient({ uuid }: { uuid: string }) {
  const [state, setState] = useState<PageState>("loading")
  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  // A refusal, not a raw string. The door needs the second line ("what do I
  // do now") as much as the first, and a bare message can only carry one.
  const [error, setError] = useState<CheckinRefusal | null>(null)
  const [overlay, setOverlay] = useState<OverlayState>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState<RedeemResult | null>(null)

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/checkin/${uuid}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(resolveCheckinRefusal(body, { httpStatus: res.status }))
        setState("error")
        return
      }
      const data = await res.json()
      setTicket(data.ticket)
      setState("ticket_info")
    } catch {
      // Never reached a verdict. Saying "not found" here would blame a pass
      // the server never even looked at.
      setError(checkinTransportRefusal())
      setState("error")
    }
  }, [uuid])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  const handleCheckin = async () => {
    setRedeeming(true)
    try {
      const res = await fetch(`${API_URL}${checkinRedeemPath(uuid)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json().catch(() => ({}))

      // A refusal about the DOOR rather than the pass (wrong door code, wrong
      // business, no role) still goes to the full page, which has a retry.
      // It now carries the same headline plus guidance as every other refusal
      // instead of a lone sentence with no next step.
      if (!res.ok && res.status === 403 && !data.status) {
        setError(resolveCheckinRefusal(data, { httpStatus: res.status }))
        setOverlay(null)
        setState("error")
        return
      }

      const status = data.status || (res.ok ? "redeemed_now" : "invalid")
      const next: RedeemResult = {
        status,
        ticket_type: data.ticket_type ?? null,
        ticket: data.ticket ?? {
          uuid,
          ticket_name: ticket?.ticket_name || "",
          event_name: ticket?.event_name || "",
          owner_name: ticket?.attendee_name || "Guest",
          redeemed_at: data.ticket?.redeemed_at ?? ticket?.redeemed_at ?? null,
        },
        refusal: resolveCheckinRefusal(
          {
            ...data,
            status,
            // Night start from the ticket page. The redeem body may only
            // send window_opens_at (scan-window clock / 17:00 default).
            event_start: data.event_start ?? ticket?.start_date_time ?? null,
          },
          {
            httpStatus: res.status,
            // What the page already loaded, so the fallback path still has
            // real times to quote when talking to an older API.
            redeemedAt: ticket?.redeemed_at ?? null,
            eventName: ticket?.event_name ?? null,
            eventStart: ticket?.start_date_time ?? null,
          },
        ),
      }
      setResult(next)
      setOverlay("result")

      if (next.status === "redeemed_now" || next.status === "already_redeemed") {
        setTimeout(() => {
          setOverlay(null)
          fetchTicket()
        }, 3000)
      }
    } catch {
      setError(checkinTransportRefusal())
      setOverlay(null)
      setState("error")
    } finally {
      setRedeeming(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  if (overlay === "confirming" && ticket) {
    const confirmAccent = guestCheckinAccent(ticket)
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f1a] p-6">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Confirm check-in</h1>
          <p className="mb-8 text-lg text-white/70">
            Check in <span className="font-bold text-white">{ticket.attendee_name}</span>
            {ticket.event_name ? ` for ${ticket.event_name}` : ""}?
          </p>
          <button
            onClick={handleCheckin}
            disabled={redeeming}
            className="mb-4 w-full rounded-2xl py-5 text-xl font-bold text-white active:brightness-95 disabled:opacity-50 transition-colors"
            style={{
              backgroundImage: `linear-gradient(to bottom right, ${confirmAccent.accentDeep}, ${confirmAccent.accent})`,
              boxShadow: `0 10px 15px -3px ${confirmAccent.accent}40`,
            }}
          >
            {redeeming ? "Checking in..." : "Yes, check in"}
          </button>
          <button
            onClick={() => setOverlay(null)}
            disabled={redeeming}
            className="w-full rounded-2xl bg-white/10 py-4 text-lg font-semibold text-white/80 active:bg-white/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (overlay === "result" && result) {
    const ok = result.status === "redeemed_now"
    const resultAccent = ticket ? guestCheckinAccent(ticket) : null
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 ${
          ok ? "" : "bg-gradient-to-br from-[#8B1A2B] to-[#c41e3a]"
        }`}
        style={
          ok
            ? {
                backgroundImage: `linear-gradient(to bottom right, ${resultAccent?.accentDeep ?? "#0d7a3e"}, ${resultAccent?.accent ?? "#05EB54"})`,
              }
            : undefined
        }
      >
        <div className="text-center">
          {ok ? (
            <svg className="mx-auto mb-4 h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="mx-auto mb-4 h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {ok ? (
            <h1 className="mb-2 text-5xl font-black text-white tracking-tight">
              {checkinRedeemStatusLabel(result.status)}
            </h1>
          ) : (
            /*
             * The refusal screen. Two lines, in this order, because that is
             * the order a door person needs them: what happened, then what to
             * do. The headline drops from 5xl to 3xl because it is now a real
             * sentence ("Already checked in at 11:42 PM") rather than a
             * one-word status, and a sentence at 5xl wraps into a wall.
             */
            <>
              <h1 className="mb-3 text-3xl font-black leading-tight text-white tracking-tight">
                {result.refusal?.headline ?? checkinRedeemStatusLabel(result.status)}
              </h1>
              {result.refusal?.guidance && (
                <p className="mx-auto mb-5 max-w-sm text-base font-medium leading-snug text-white/90">
                  {result.refusal.guidance}
                </p>
              )}
            </>
          )}
          <p className={ok ? "text-2xl font-semibold text-white/90" : "text-xl font-semibold text-white/80"}>
            {result.ticket.owner_name}
          </p>
          <p className="mt-1 text-lg text-white/70">{result.ticket.ticket_name || result.ticket.event_name}</p>
        </div>
      </div>
    )
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-white/60">Loading ticket...</p>
        </div>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <svg className="mx-auto mb-4 h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="mb-2 text-xl font-bold text-white">
            {error?.headline ?? "Could not load this pass"}
          </h2>
          {error?.guidance && (
            <p className="mx-auto max-w-sm text-sm leading-snug text-white/70">{error.guidance}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const canCheckIn =
    !!ticket &&
    guestCameraCheckinEnabled(ticket) &&
    guestTicketIsRedeemable(ticket)
  const accent = ticket ? guestCheckinAccent(ticket) : null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/images/bizzy-logo.png" alt="Bizzy" className="mx-auto h-8 opacity-80" />
        </div>

        {ticket && (
          <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
            <h1 className="mb-1 text-xl font-bold text-white">{ticket.event_name}</h1>
            {ticket.venue_name && (
              <p className="mb-3 text-sm text-white/50">{ticket.venue_name}</p>
            )}

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Ticket Holder</span>
                <span className="text-sm font-medium text-white">{ticket.attendee_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Ticket</span>
                <span className="text-sm font-medium text-white">{ticket.ticket_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Type</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `${(accent?.accent ?? "#05EB54")}33`,
                    color: accent?.accent ?? "#05EB54",
                  }}
                >
                  {guestCheckinTypeLabel(ticket)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Date</span>
                <span className="text-sm text-white/80">{formatDate(ticket.start_date_time)}</span>
              </div>
            </div>

            {ticket.is_redeemed && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                <p className="text-sm font-semibold text-red-400">Already Checked In</p>
                {ticket.redeemed_at && (
                  <p className="mt-0.5 text-xs text-red-400/70">{formatDate(ticket.redeemed_at)}</p>
                )}
              </div>
            )}
            {ticket.is_refunded && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                <p className="text-sm font-semibold text-red-400">Ticket Refunded</p>
              </div>
            )}
            {ticket.event_status === "cancelled" && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                <p className="text-sm font-semibold text-red-400">Event Cancelled</p>
              </div>
            )}
          </div>
        )}

        {canCheckIn && (
          <button
            onClick={() => setOverlay("confirming")}
            className="w-full rounded-xl px-4 py-4 text-lg font-bold text-white transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundImage: `linear-gradient(to bottom right, ${accent?.accentDeep ?? "#2ECB4E"}, ${accent?.accent ?? "#05EB54"})`,
              boxShadow: `0 10px 15px -3px ${(accent?.accent ?? "#05EB54")}40`,
            }}
          >
            Check In
          </button>
        )}

        <p className="mt-6 text-center text-xs text-white/40">
          {ticket ? guestCheckinFooterCopy(ticket) : "Scan with any phone camera, then tap Check In. No staff login."}
        </p>
      </div>
    </div>
  )
}
