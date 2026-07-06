"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { getApiBaseUrl } from "@/lib/api-url"
import {
  fmtMoney,
  ledgerLabel,
  MIN_WITHDRAWAL_CENTS,
  walletIsEmpty,
  type LedgerEntry,
  type WalletResponse,
} from "@/lib/promoter/wallet"
import WithdrawDialog from "./WithdrawDialog"

const API_URL = getApiBaseUrl()
const TOKEN_STORAGE_KEY = "bz_auth_token"
const LEDGER_PAGE_SIZE = 25

interface DashboardTotals {
  lifetime_earned_cents: number
  pending_balance_cents: number
  paid_balance_cents: number
  // Retired (weekly payouts gone — PRD §6.5). Held as null by the server; the
  // "Next payout" copy is replaced by the on-demand Withdraw flow below.
  next_payout_date: string | null
  lifetime_clicks: number
  lifetime_sales: number
}

interface EventRow {
  event_id: number
  event_name: string | null
  event_start_at: string | null
  tracking_link_id: number
  tracking_link_code: string
  share_url: string
  clicks: number
  sales: number
  revenue_cents: number
}

interface DashboardResponse {
  totals: DashboardTotals
  events: EventRow[]
}

interface DayPoint {
  date: string
  clicks: number
  sales: number
  revenue_cents: number
}

function fmtEventDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function fmtLedgerDate(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export default function PromoterDashboardClient() {
  const [token, setToken] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState("")
  const [tokenLoaded, setTokenLoaded] = useState(false)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [ledgerTotal, setLedgerTotal] = useState(0)
  const [ledgerLoadingMore, setLedgerLoadingMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [openTimeseriesFor, setOpenTimeseriesFor] = useState<number | null>(null)
  const [timeseries, setTimeseries] = useState<Record<number, DayPoint[]>>({})

  const apiCall = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      headers.set("Content-Type", "application/json")
      if (token) headers.set("Authorization", `Bearer ${token}`)
      return fetch(`${API_URL}${path}`, { ...init, headers })
    },
    [token],
  )

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (stored) setToken(stored)
    setTokenLoaded(true)
  }, [])

  const loadWallet = useCallback(async () => {
    if (!token) return
    try {
      const res = await apiCall(`/promoter/wallet?limit=${LEDGER_PAGE_SIZE}&offset=0`)
      if (!res.ok) return
      const body = (await res.json()) as WalletResponse
      setWallet(body)
      setLedger(body.ledger ?? [])
      setLedgerTotal(body.page?.total ?? (body.ledger?.length ?? 0))
    } catch {
      /* wallet is non-fatal to the dashboard render — leave it null */
    }
  }, [apiCall, token])

  const loadDashboard = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setErr(null)
    try {
      const res = await apiCall("/promoter/dashboard")
      if (res.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
        setToken(null)
        setLoading(false)
        return
      }
      const body = await res.json()
      if (!res.ok) {
        setErr(body?.message ?? "Could not load dashboard")
        setLoading(false)
        return
      }
      setData(body as DashboardResponse)
      setLoading(false)
    } catch (e) {
      setErr((e as Error).message)
      setLoading(false)
    }
  }, [apiCall, token])

  useEffect(() => {
    if (token) {
      loadDashboard()
      loadWallet()
    }
  }, [token, loadDashboard, loadWallet])

  const loadMoreLedger = useCallback(async () => {
    if (!token || ledgerLoadingMore) return
    setLedgerLoadingMore(true)
    try {
      const res = await apiCall(
        `/promoter/wallet?limit=${LEDGER_PAGE_SIZE}&offset=${ledger.length}`,
      )
      if (res.ok) {
        const body = (await res.json()) as WalletResponse
        setLedger((prev) => [...prev, ...(body.ledger ?? [])])
        setLedgerTotal(body.page?.total ?? ledgerTotal)
      }
    } finally {
      setLedgerLoadingMore(false)
    }
  }, [apiCall, token, ledger.length, ledgerTotal, ledgerLoadingMore])

  const loadTimeseries = useCallback(
    async (eventId: number) => {
      if (timeseries[eventId]) return
      const res = await apiCall(`/promoter/events/${eventId}/timeseries`)
      if (!res.ok) return
      const body = await res.json()
      const days = (body?.days ?? []) as DayPoint[]
      setTimeseries((prev) => ({ ...prev, [eventId]: days }))
    },
    [apiCall, timeseries],
  )

  const openStripeDashboard = useCallback(async () => {
    setBusy(true)
    try {
      const res = await apiCall("/promoter/stripe-dashboard-link")
      const body = await res.json()
      if (!res.ok || !body?.url) {
        setErr(body?.message ?? "Could not open Stripe dashboard")
        return
      }
      window.open(body.url, "_blank", "noopener,noreferrer")
    } finally {
      setBusy(false)
    }
  }, [apiCall])

  const submitToken = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenInput.trim()) return
    window.localStorage.setItem(TOKEN_STORAGE_KEY, tokenInput.trim())
    setToken(tokenInput.trim())
  }

  if (!tokenLoaded) return null

  if (!token) {
    return (
      <main className="min-h-screen bg-white text-ink flex items-center justify-center px-4">
        <form onSubmit={submitToken} className="max-w-sm w-full space-y-3">
          <h1 className="text-2xl font-semibold">Promoter Dashboard</h1>
          <p className="text-sm text-gray-600">
            Paste your Bizzy auth token to continue.
          </p>
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="bz_auth_token"
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full bg-primary text-white rounded-md py-2 text-sm font-medium"
          >
            Continue
          </button>
        </form>
      </main>
    )
  }

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-600">
        Loading dashboard…
      </main>
    )
  }

  if (err && !data) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-red-600">{err}</p>
          <button
            onClick={loadDashboard}
            className="bg-primary text-white rounded-md px-4 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  if (!data) return null

  const { totals, events } = data

  if (events.length === 0) {
    return (
      <main className="min-h-screen bg-white text-ink px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-semibold">Promoter Dashboard</h1>
          <p className="text-gray-600">
            Promote an event to earn commission. Find events offering promoter
            programs on the home tab.
          </p>
          <Link
            href="/events"
            className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            Browse events
          </Link>
        </div>
      </main>
    )
  }

  const availableCents = wallet?.available_cents ?? 0
  const pendingCents = wallet?.pending_cents ?? totals.pending_balance_cents

  return (
    <main className="min-h-screen bg-white text-ink px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Promoter Dashboard</h1>
          <button
            onClick={openStripeDashboard}
            disabled={busy}
            className="text-sm border rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? "Opening…" : "Manage payout method"}
          </button>
        </div>

        <WalletCard
          available={availableCents}
          pending={pendingCents}
          empty={wallet ? walletIsEmpty({ ...wallet, ledger }) : false}
          onWithdraw={() => setShowWithdraw(true)}
        />

        <ActivityStats totals={totals} />

        {ledger.length > 0 && (
          <LedgerSection
            entries={ledger}
            total={ledgerTotal}
            loadingMore={ledgerLoadingMore}
            onLoadMore={loadMoreLedger}
          />
        )}

        <section>
          <h2 className="text-base font-semibold mb-3">Your events</h2>
          <ul className="space-y-3">
            {events.map((row) => {
              const open = openTimeseriesFor === row.tracking_link_id
              const days = timeseries[row.event_id]
              return (
                <li
                  key={row.tracking_link_id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {row.event_name ?? "Event"}
                      </p>
                      {fmtEventDate(row.event_start_at) && (
                        <p className="text-xs text-gray-500">
                          {fmtEventDate(row.event_start_at)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(row.share_url).catch(() => {})
                      }}
                      className="text-xs text-primary border border-primary/40 rounded px-2 py-1 shrink-0"
                      title={row.share_url}
                    >
                      Copy {row.tracking_link_code}
                    </button>
                  </div>

                  <div className="mt-2 text-sm text-gray-700">
                    {row.clicks === 0 && row.sales === 0
                      ? "No clicks yet"
                      : `${row.clicks} clicks · ${row.sales} sales · ${fmtMoney(row.revenue_cents)} revenue`}
                  </div>

                  <button
                    onClick={() => {
                      const next = open ? null : row.tracking_link_id
                      setOpenTimeseriesFor(next)
                      if (next) loadTimeseries(row.event_id)
                    }}
                    className="mt-3 text-xs text-gray-600 hover:text-ink"
                  >
                    {open ? "Hide 30-day chart" : "Show 30-day chart"}
                  </button>

                  {open && days && <Sparkline days={days} />}
                  {open && !days && (
                    <p className="mt-3 text-xs text-gray-500">Loading chart…</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {showWithdraw && (
        <WithdrawDialog
          availableCents={availableCents}
          apiCall={apiCall}
          onClose={() => setShowWithdraw(false)}
          onSuccess={loadWallet}
        />
      )}
    </main>
  )
}

/**
 * Wallet balance card (replaces the retired Pending/Paid-out/Next-payout block).
 * Shows Available (withdrawable) + Pending, with the on-demand Withdraw button.
 * Handles the three balance states: empty (no earnings → share links), negative
 * (Available < 0 after a post-withdrawal clawback → withdraw disabled), and
 * below-minimum (Available < $20 → withdraw disabled with the reason shown).
 */
function WalletCard({
  available,
  pending,
  empty,
  onWithdraw,
}: {
  available: number
  pending: number
  empty: boolean
  onWithdraw: () => void
}) {
  const negative = available < 0
  const canWithdraw = available >= MIN_WITHDRAWAL_CENTS

  return (
    <div className="border rounded-lg p-5 bg-primary/5">
      <p className="text-xs text-gray-600">Available to withdraw</p>
      <p
        className={`text-3xl font-semibold mt-1 ${negative ? "text-red-600" : "text-primary"}`}
      >
        {fmtMoney(available)}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {fmtMoney(pending)} pending — clears after your events end.
      </p>

      {empty ? (
        <p className="mt-4 text-sm text-gray-600">
          No earnings yet. Share your event links below to start earning commission.
        </p>
      ) : negative ? (
        <p className="mt-4 text-xs text-gray-600">
          Your balance is negative after a refund/clawback. It will be offset by future
          earnings before you can withdraw again.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <button
            onClick={onWithdraw}
            disabled={!canWithdraw}
            className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Withdraw
          </button>
          {!canWithdraw && (
            <p className="text-xs text-gray-500 text-center">
              Withdrawals start at {fmtMoney(MIN_WITHDRAWAL_CENTS)}. Keep earning to unlock.
            </p>
          )}
          <p className="text-[11px] text-gray-400 text-center">
            Withdrawals are on-demand — cash out whenever you like.
          </p>
        </div>
      )}
    </div>
  )
}

function ActivityStats({ totals }: { totals: DashboardTotals }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <MiniStat label="Lifetime earned" value={fmtMoney(totals.lifetime_earned_cents)} />
      <MiniStat label="Clicks" value={String(totals.lifetime_clicks)} />
      <MiniStat label="Sales" value={String(totals.lifetime_sales)} />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-md px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  )
}

/** Paged, newest-first wallet ledger. Reversal rows are labeled as the automatic
 *  return of a failed withdrawal to Available. */
function LedgerSection({
  entries,
  total,
  loadingMore,
  onLoadMore,
}: {
  entries: LedgerEntry[]
  total: number
  loadingMore: boolean
  onLoadMore: () => void
}) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-3">Wallet activity</h2>
      <ul className="border rounded-lg divide-y">
        {entries.map((e) => {
          const credit = e.amount_cents >= 0
          return (
            <li key={e.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{ledgerLabel(e)}</p>
                <p className="text-[11px] text-gray-500">
                  {fmtLedgerDate(e.created_at)}
                  {e.status === "pending" ? " · pending" : ""}
                  {e.status === "failed" ? " · failed" : ""}
                </p>
              </div>
              <span
                className={`text-sm font-semibold shrink-0 ${credit ? "text-primary" : "text-ink"}`}
              >
                {credit ? "+" : "−"}
                {fmtMoney(Math.abs(e.amount_cents))}
              </span>
            </li>
          )
        })}
      </ul>
      {entries.length < total && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-2 text-xs text-gray-600 hover:text-ink disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  )
}

/** Inline SVG sparkline - three series (clicks line, sales bars, revenue line)
 *  scaled into one chart space. No external dep. */
function Sparkline({ days }: { days: DayPoint[] }) {
  const width = 600
  const height = 120
  const pad = 4

  const totals = useMemo(() => {
    const maxClicks = Math.max(1, ...days.map((d) => d.clicks))
    const maxSales = Math.max(1, ...days.map((d) => d.sales))
    const maxRevenue = Math.max(1, ...days.map((d) => d.revenue_cents))
    return { maxClicks, maxSales, maxRevenue }
  }, [days])

  if (days.length === 0) return null

  const xStep = (width - pad * 2) / Math.max(1, days.length - 1)
  const yScale = (v: number, max: number) =>
    height - pad - (v / max) * (height - pad * 2)

  const clickPath = days
    .map((d, i) => {
      const x = pad + i * xStep
      const y = yScale(d.clicks, totals.maxClicks)
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  const revenuePath = days
    .map((d, i) => {
      const x = pad + i * xStep
      const y = yScale(d.revenue_cents, totals.maxRevenue)
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  const salesBars = days.map((d, i) => {
    const x = pad + i * xStep - 2
    const y = yScale(d.sales, totals.maxSales)
    const h = height - pad - y
    return (
      <rect
        key={i}
        x={x}
        y={y}
        width={4}
        height={Math.max(0, h)}
        fill="rgba(5, 235, 84, 0.45)"
      />
    )
  })

  const totalClicks = days.reduce((a, d) => a + d.clicks, 0)
  const totalSales = days.reduce((a, d) => a + d.sales, 0)
  const totalRev = days.reduce((a, d) => a + d.revenue_cents, 0)
  const conv = totalClicks === 0 ? 0 : (totalSales / totalClicks) * 100

  return (
    <div className="mt-3">
      <div className="grid grid-cols-4 gap-2 text-xs text-gray-700 mb-2">
        <div>
          <div className="text-[10px] text-gray-500">Clicks</div>
          <div className="font-semibold">{totalClicks}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500">Sales</div>
          <div className="font-semibold">{totalSales}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500">Revenue</div>
          <div className="font-semibold">{fmtMoney(totalRev)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500">Conv.</div>
          <div className="font-semibold">{conv.toFixed(1)}%</div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-28 bg-gray-50 rounded"
        preserveAspectRatio="none"
      >
        {salesBars}
        <path d={clickPath} fill="none" stroke="#1A1A1A" strokeWidth={1.5} />
        <path d={revenuePath} fill="none" stroke="#FFB800" strokeWidth={1.5} />
      </svg>
      <p className="text-[10px] text-gray-500 mt-1">
        Clicks (line) · Sales (bars) · Revenue (gold line)
      </p>
    </div>
  )
}
