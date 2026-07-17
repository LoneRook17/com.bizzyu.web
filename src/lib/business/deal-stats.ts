// Deal impressions/views/claims funnel — the TYPED CLIENT for the DI-B3s
// contract. This is the ONE file to touch if DI-B3s shifts the endpoint path
// or response shape: paths live in fetchDealStats/fetchDealDailyStats, the wire
// shapes in the interfaces below, and every consumer imports the normalized
// types + pure helpers from here (never a raw fetch).
//
// Contract (pinned 2026-07-17, DEAL_IMPRESSIONS_DESIGN.md):
//   GET /business/deals/stats?from&to
//     -> { range:{from,to,timezone}, deals:[{ deal_id, impressions,
//          unique_impressions, views, unique_views, claims }] }
//   GET /business/deals/:dealId/stats/daily?from&to
//     -> { deal_id, days:[{ date, impressions, unique_impressions, views,
//          unique_views, claims }] }
//
// Degrade rule: the ingest endpoints 404 until deploy wave 3. A 404 is NOT an
// error here — it means "tracking isn't live yet", so the fetchers return null
// and the UI shows the zero-state copy instead of an error wall. Any other
// failure propagates so the UI can render its error state.
//
// apiClient is imported lazily inside the fetchers (not at the top level) on
// purpose: everything else in this file is pure, and the Node built-in test
// runner (`npm test`) can't resolve the extensionless api-client import chain.
// Keeping the runtime dependency behind a dynamic import lets the contract's
// types + funnel math be unit-tested from this same file.

// ── Wire shapes (pinned contract) ──────────────────────────────────────────
export interface DealStatRow {
  deal_id: number
  impressions: number
  unique_impressions: number
  views: number
  unique_views: number
  claims: number
}

export interface DealStatsRange {
  from: string
  to: string
  timezone: string
}

export interface DealStatsResponse {
  range: DealStatsRange
  deals: DealStatRow[]
}

export interface DealDailyStat {
  date: string
  impressions: number
  unique_impressions: number
  views: number
  unique_views: number
  claims: number
}

export interface DealDailyStatsResponse {
  deal_id: number
  days: DealDailyStat[]
}

// ── Normalization ───────────────────────────────────────────────────────────
// MySQL SUM()/COUNT() can serialize as strings ("1204", "0"); coerce every
// numeric field so downstream math and toLocaleString() never see a string.
// (Same lesson as PromoEventBreakdownRow in types.ts.)
function toNum(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? (n as number) : 0
}

export function normalizeStatRow(raw: Partial<DealStatRow> & { deal_id: number | string }): DealStatRow {
  return {
    deal_id: toNum(raw.deal_id),
    impressions: toNum(raw.impressions),
    unique_impressions: toNum(raw.unique_impressions),
    views: toNum(raw.views),
    unique_views: toNum(raw.unique_views),
    claims: toNum(raw.claims),
  }
}

export function normalizeDailyStat(raw: Partial<DealDailyStat> & { date: string }): DealDailyStat {
  return {
    date: String(raw.date),
    impressions: toNum(raw.impressions),
    unique_impressions: toNum(raw.unique_impressions),
    views: toNum(raw.views),
    unique_views: toNum(raw.unique_views),
    claims: toNum(raw.claims),
  }
}

export function normalizeStatsResponse(raw: DealStatsResponse): DealStatsResponse {
  return {
    range: {
      from: String(raw?.range?.from ?? ''),
      to: String(raw?.range?.to ?? ''),
      timezone: String(raw?.range?.timezone ?? ''),
    },
    deals: Array.isArray(raw?.deals) ? raw.deals.map(normalizeStatRow) : [],
  }
}

export function normalizeDailyResponse(raw: DealDailyStatsResponse): DealDailyStatsResponse {
  return {
    deal_id: toNum(raw?.deal_id),
    days: Array.isArray(raw?.days) ? raw.days.map(normalizeDailyStat) : [],
  }
}

/** Index a stats response by deal_id for O(1) join onto the deals list. */
export function indexStatsByDeal(resp: DealStatsResponse): Map<number, DealStatRow> {
  const m = new Map<number, DealStatRow>()
  for (const row of resp.deals) m.set(row.deal_id, row)
  return m
}

/** All-zero row for a deal that has no tracking rows yet (funnel baseline). */
export function emptyStatRow(dealId: number): DealStatRow {
  return {
    deal_id: dealId,
    impressions: 0,
    unique_impressions: 0,
    views: 0,
    unique_views: 0,
    claims: 0,
  }
}

// ── Funnel math (client-side, per contract) ─────────────────────────────────
export interface Funnel {
  impressions: number
  uniqueImpressions: number
  views: number
  uniqueViews: number
  claims: number
  /** views / impressions, clamped to [0,1]; 0 when there are no impressions. */
  viewRate: number
  /** claims / views, clamped to [0,1]; 0 when there are no views. */
  claimRate: number
  /**
   * Whether impression/view TRACKING has produced anything. Claims predate
   * 4.2.6 (existing table) so they are NOT part of this signal — a deal can
   * have claims while tracking is still dark, which is exactly the zero-state.
   */
  hasTrackingData: boolean
}

/** Safe step-through rate: guards divide-by-zero and clamps to [0,1]. */
export function stepRate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0
  const r = numerator / denominator
  if (r < 0) return 0
  if (r > 1) return 1
  return r
}

export function computeFunnel(row: DealStatRow): Funnel {
  return {
    impressions: row.impressions,
    uniqueImpressions: row.unique_impressions,
    views: row.views,
    uniqueViews: row.unique_views,
    claims: row.claims,
    viewRate: stepRate(row.views, row.impressions),
    claimRate: stepRate(row.claims, row.views),
    hasTrackingData: row.impressions > 0 || row.views > 0,
  }
}

/** "42.5%" style label for a [0,1] rate. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

// ── Date range presets (default 30d) ────────────────────────────────────────
export const RANGE_PRESETS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
] as const

export const DEFAULT_RANGE_DAYS = 30

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Local YYYY-MM-DD (the server interprets/echoes the range's timezone). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Inclusive [from,to] window of `days` ending on `now`. `now` is injected so
 *  this is pure and testable. */
export function rangeForDays(days: number, now: Date): { from: string; to: string } {
  const to = new Date(now)
  const from = new Date(now)
  from.setDate(from.getDate() - (days - 1))
  return { from: isoDate(from), to: isoDate(to) }
}

// ── Fetchers ────────────────────────────────────────────────────────────────
/** True for the "endpoint not deployed yet" 404 — degrade to zero-state, don't
 *  error. Checked structurally (ApiError carries a numeric `status`) so this
 *  file needs no top-level api-client import. */
function isNotDeployed(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 404
}

/** Aggregate stats for every deal in range. Returns null when the endpoint is
 *  not deployed yet (404) → caller degrades to the zero-state, not an error. */
export async function fetchDealStats(from: string, to: string): Promise<DealStatsResponse | null> {
  const { apiClient } = await import('./api-client')
  try {
    const raw = await apiClient.get<DealStatsResponse>(`/business/deals/stats?from=${from}&to=${to}`)
    return normalizeStatsResponse(raw)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}

/** Daily series for one deal. Returns null on 404 (endpoint not deployed). */
export async function fetchDealDailyStats(
  dealId: number,
  from: string,
  to: string,
): Promise<DealDailyStatsResponse | null> {
  const { apiClient } = await import('./api-client')
  try {
    const raw = await apiClient.get<DealDailyStatsResponse>(
      `/business/deals/${dealId}/stats/daily?from=${from}&to=${to}`,
    )
    return normalizeDailyResponse(raw)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}

/** Locked customer-facing zero-state copy (pre-4.2.6, or endpoint not live). */
export const TRACKING_ZERO_STATE_COPY =
  'Tracking starts with the next app update — impressions and views appear once version 4.2.6 is live.'
