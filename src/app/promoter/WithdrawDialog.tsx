"use client"

import { useMemo, useState } from "react"
import {
  MIN_WITHDRAWAL_CENTS,
  classifyWithdrawResponse,
  computeWithdrawalAmounts,
  fmtMoney,
  type WithdrawalMethod,
} from "@/lib/promoter/wallet"

interface Props {
  availableCents: number
  apiCall: (path: string, init?: RequestInit) => Promise<Response>
  onClose: () => void
  /** Called after any completed withdrawal so the parent can refetch the wallet. */
  onSuccess: () => void
}

type Banner =
  | { type: "onboarding"; message: string; url: string | null }
  | { type: "instant_fallback"; message: string }
  | { type: "flagged"; message: string }
  | { type: "error"; message: string }
  | { type: "below_minimum"; message: string }

/**
 * On-demand withdrawal flow (PRD §6.3): amount entry (with the $20 minimum shown
 * up front) → Standard (free) vs Instant (fee = max($0.50, 2.5%), net shown
 * before confirm) → POST /promoter/withdrawals. Handles the full response
 * contract — onboarding_required, instant_unavailable, below_minimum,
 * account_flagged — any of which can arrive at any point.
 */
export default function WithdrawDialog({ availableCents, apiCall, onClose, onSuccess }: Props) {
  const [amountStr, setAmountStr] = useState((availableCents / 100).toFixed(2))
  const [method, setMethod] = useState<WithdrawalMethod>("standard")
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [done, setDone] = useState<{ method: string } | null>(null)

  const grossCents = useMemo(() => {
    const dollars = parseFloat(amountStr)
    if (!Number.isFinite(dollars)) return NaN
    return Math.round(dollars * 100)
  }, [amountStr])

  const { feeCents, netCents } = useMemo(
    () => computeWithdrawalAmounts(method, Number.isFinite(grossCents) ? grossCents : 0),
    [method, grossCents],
  )

  const amountValid =
    Number.isInteger(grossCents) && grossCents >= MIN_WITHDRAWAL_CENTS && grossCents <= availableCents

  const validationMsg = useMemo(() => {
    if (!Number.isFinite(grossCents)) return null
    if (grossCents < MIN_WITHDRAWAL_CENTS)
      return `The minimum withdrawal is ${fmtMoney(MIN_WITHDRAWAL_CENTS)}.`
    if (grossCents > availableCents)
      return `You can withdraw up to ${fmtMoney(availableCents)}.`
    return null
  }, [grossCents, availableCents])

  async function submit(m: WithdrawalMethod = method) {
    if (!amountValid) return
    setSubmitting(true)
    setBanner(null)
    try {
      const res = await apiCall("/promoter/withdrawals", {
        method: "POST",
        body: JSON.stringify({ amount_cents: grossCents, method: m }),
      })
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        /* leave body null → generic error */
      }
      const outcome = classifyWithdrawResponse(res.status, body)
      switch (outcome.kind) {
        case "success":
          setDone({ method: outcome.withdrawal.method })
          onSuccess()
          break
        case "onboarding_required":
          setBanner({ type: "onboarding", message: outcome.message, url: outcome.url })
          break
        case "instant_unavailable":
          setBanner({ type: "instant_fallback", message: outcome.message })
          break
        case "below_minimum":
          setBanner({ type: "below_minimum", message: outcome.message })
          break
        case "flagged":
          setBanner({ type: "flagged", message: outcome.message })
          break
        case "error":
          setBanner({ type: "error", message: outcome.message })
          break
      }
    } catch (e) {
      setBanner({ type: "error", message: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  function switchToStandard() {
    setMethod("standard")
    submit("standard")
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <SuccessState method={done.method} onClose={onClose} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Withdraw</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-ink text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-500">Amount</label>
              <div className="mt-1 flex items-center border rounded-md px-3 py-2">
                <span className="text-gray-500 mr-1">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="20"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full outline-none text-base"
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Min {fmtMoney(MIN_WITHDRAWAL_CENTS)} · Available {fmtMoney(availableCents)}
                </span>
                <button
                  type="button"
                  onClick={() => setAmountStr((availableCents / 100).toFixed(2))}
                  className="text-primary"
                >
                  Max
                </button>
              </div>
              {validationMsg && <p className="mt-1 text-xs text-red-600">{validationMsg}</p>}
            </div>

            <div>
              <label className="text-xs text-gray-500">Payout method</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <MethodOption
                  selected={method === "standard"}
                  onClick={() => setMethod("standard")}
                  title="Standard"
                  subtitle="Free · arrives in 1–2 business days"
                />
                <MethodOption
                  selected={method === "instant"}
                  onClick={() => setMethod("instant")}
                  title="Instant"
                  subtitle="Fee applies · arrives in minutes"
                />
              </div>
            </div>

            {method === "instant" && Number.isFinite(grossCents) && grossCents > 0 && (
              <div className="rounded-md bg-gray-50 border px-3 py-2 text-sm space-y-1">
                <Row label="Amount" value={fmtMoney(grossCents)} />
                <Row label="Instant fee" value={`- ${fmtMoney(feeCents)}`} />
                <Row label="You receive" value={fmtMoney(netCents)} strong />
              </div>
            )}

            {banner && (
              <BannerView
                banner={banner}
                submitting={submitting}
                onOpenOnboarding={(url) => {
                  if (url) window.open(url, "_blank", "noopener,noreferrer")
                }}
                onRetry={() => submit()}
                onSwitchToStandard={switchToStandard}
                onClose={onClose}
              />
            )}

            {(!banner || banner.type === "error" || banner.type === "below_minimum") && (
              <button
                onClick={() => submit()}
                disabled={!amountValid || submitting}
                className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {submitting
                  ? "Processing…"
                  : method === "instant"
                    ? `Withdraw ${fmtMoney(netCents)} instantly`
                    : `Withdraw ${fmtMoney(Number.isFinite(grossCents) ? grossCents : 0)}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BannerView({
  banner,
  submitting,
  onOpenOnboarding,
  onRetry,
  onSwitchToStandard,
  onClose,
}: {
  banner: Banner
  submitting: boolean
  onOpenOnboarding: (url: string | null) => void
  onRetry: () => void
  onSwitchToStandard: () => void
  onClose: () => void
}) {
  if (banner.type === "onboarding") {
    return (
      <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-3 text-sm space-y-2">
        <p className="font-medium">Set up your bank to withdraw</p>
        <p className="text-gray-600 text-xs">
          It takes about 2 minutes. After you finish, come back and tap “I’ve finished” — your
          payout account can take a few seconds to activate.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onOpenOnboarding(banner.url)}
            disabled={!banner.url}
            className="flex-1 bg-primary text-white rounded-md py-2 text-xs font-medium disabled:opacity-50"
          >
            Set up payouts
          </button>
          <button
            onClick={onRetry}
            disabled={submitting}
            className="flex-1 border rounded-md py-2 text-xs font-medium disabled:opacity-50"
          >
            {submitting ? "Checking…" : "I’ve finished"}
          </button>
        </div>
      </div>
    )
  }
  if (banner.type === "instant_fallback") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm space-y-2">
        <p className="text-gray-700 text-xs">
          Instant isn’t available for your bank. Send a standard (free) payout instead?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onSwitchToStandard}
            disabled={submitting}
            className="flex-1 bg-primary text-white rounded-md py-2 text-xs font-medium disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send standard (free)"}
          </button>
          <button onClick={onClose} className="flex-1 border rounded-md py-2 text-xs font-medium">
            Cancel
          </button>
        </div>
      </div>
    )
  }
  if (banner.type === "flagged") {
    return (
      <div className="rounded-md border bg-gray-50 px-3 py-3 text-sm">
        <p className="text-gray-700 text-xs">
          {banner.message || "Withdrawals are under review. Please contact support."}
        </p>
      </div>
    )
  }
  // error / below_minimum — inline, retry via the primary button.
  return <p className="text-xs text-red-600">{banner.message}</p>
}

function SuccessState({ method, onClose }: { method: string; onClose: () => void }) {
  const instant = method === "instant"
  return (
    <div className="text-center space-y-3 py-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl">
        ✓
      </div>
      <h2 className="text-lg font-semibold">Withdrawal requested</h2>
      <p className="text-sm text-gray-600">
        {instant
          ? "Your instant payout is on its way — it usually arrives within minutes."
          : "Your standard payout is on its way — it usually arrives in 1–2 business days."}
      </p>
      <button
        onClick={onClose}
        className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium"
      >
        Done
      </button>
    </div>
  )
}

function MethodOption({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean
  onClick: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-md border px-3 py-2 ${
        selected ? "border-primary bg-primary/5" : "border-gray-200"
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{subtitle}</p>
    </button>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  )
}
