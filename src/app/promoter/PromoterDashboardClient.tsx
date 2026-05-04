"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { getApiBaseUrl } from "@/lib/api-url"

const API_URL = getApiBaseUrl()
const TOKEN_STORAGE_KEY = "bz_auth_token"

interface DashboardTotals {
  lifetime_earned_cents: number
  pending_balance_cents: number
  paid_balance_cents: number
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

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  })
}

function fmtPayoutDate(iso: string | null): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — 11am ET`
  } catch {
    return iso
  }
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

export default function PromoterDashboardClient() {
  const [token, setToken] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState("")
  const [tokenLoaded, setTokenLoaded] = useState(false)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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
    if (token) loadDashboard()
  }, [token, loadDashboard])

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

        <TotalsCard totals={totals} />

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
    </main>
  )
}

function TotalsCard({ totals }: { totals: DashboardTotals }) {
  return (
    <div className="border rounded-lg p-5 bg-primary/5">
      <p className="text-xs text-gray-600">Lifetime earned</p>
      <p className="text-3xl font-semibold text-primary mt-1">
        {fmtMoney(totals.lifetime_earned_cents)}
      </p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Stat label="Pending" value={fmtMoney(totals.pending_balance_cents)} />
        <Stat label="Paid out" value={fmtMoney(totals.paid_balance_cents)} />
      </div>
      {totals.next_payout_date && (
        <p className="text-xs text-gray-500 mt-3">
          Next payout: {fmtPayoutDate(totals.next_payout_date)}
        </p>
      )}
      <div className="flex gap-2 mt-3 text-xs text-gray-700">
        <span className="bg-white border rounded px-2 py-0.5">
          {totals.lifetime_clicks} clicks
        </span>
        <span className="bg-white border rounded px-2 py-0.5">
          {totals.lifetime_sales} sales
        </span>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-md px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  )
}

/** Inline SVG sparkline — three series (clicks line, sales bars, revenue line)
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
