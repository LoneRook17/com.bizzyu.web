// Tips on event analytics (Tipping Slice 3).
//
// `revenue.revenue` on `GET /business/insights/events/:id` is door-only host
// take-home. Customer tips are NOT in it. The API reports them separately as
// `revenue.tips` (USD, e.g. 1.5). Tips are never revenue: the views render
// them as their own tile and never add them into a Revenue figure.
//
// The field is absent on services deploys that predate Slice 3, so every
// reader goes through eventTips() and treats missing / null / NaN / negative
// as 0.
//
// Visibility: ALL Tips UI (the Tips tile with TIPS_INFO_NOTE, Tips by worker,
// the Door Performance Tips column) renders only when tipsVisible() says so:
// the business has tipping on, or this event already collected tips. A
// tip-off business with no tips sees no Tips UI at all, while an event with
// tip history keeps it after tipping is later turned off. The API computes
// that rule as `tips_visible`; the helpers only add a fallback for services
// deploys that predate the field. The Tips tile goes through
// eventTipsVisible(), which matches the Flutter app: the flags above, OR any
// per-scanner row / Tips by worker entry with tips.
//
// No imports on purpose, so `node --test` can load this file on its own.

type RevenueWithTips = {
  tips?: unknown
  take_home_with_tips?: unknown
} | null | undefined

export const TIPS_TILE_TITLE = "Tips"

/** Info note under the Tips amount. Shared by every analytics view. */
export const TIPS_INFO_NOTE =
  "Tips are not included in Revenue. They are transferred to your business. Paying out workers from tips is your responsibility, however you choose to do it."

/** Revenue caption when the event has tips: the Stripe payout also carries them, so Revenue alone no longer matches it. */
export const REVENUE_CAPTION_WITH_TIPS = "Your take-home from sales. Tips are shown separately."

function safeUsd(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0
  return n
}

/** Customer tips for the event in USD. Missing, null, NaN or negative reads as 0. */
export function eventTips(revenue: RevenueWithTips): number {
  return safeUsd(revenue?.tips)
}

/** Header of the per-scanner Tips column on Door Performance. */
export const DOOR_TIPS_COLUMN_TITLE = "Tips"

/** Short hint under the Door Performance title. */
export const DOOR_TIPS_HINT = "Tips are shown separately and are not included in sales."

/** One Door Performance row's tips in USD. Missing, null, NaN or negative reads as 0. */
export function scannerTips(row: { tips?: unknown } | null | undefined): number {
  return safeUsd(row?.tips)
}

/** True when the event has tips. Picks the Revenue caption. Tips tile visibility is tipsVisible(). */
export function hasTips(revenue: RevenueWithTips): boolean {
  return eventTips(revenue) > 0
}

/**
 * API-computed Revenue plus tips in USD, or null when the API did not send it.
 * Display only, as a secondary caption on the Tips tile. The web never
 * computes this sum itself and never shows it in place of Revenue.
 */
export function takeHomeWithTips(revenue: RevenueWithTips): number | null {
  const n = safeUsd(revenue?.take_home_with_tips)
  return n > 0 ? n : null
}

// ── Visibility ──────────────────────────────────────────────────────────────

type AnalyticsWithTipsFlags = {
  tips_visible?: unknown
  tipping_enabled?: unknown
  revenue?: RevenueWithTips
} | null | undefined

/**
 * Boolean-ish API flag. A MySQL TINYINT or a proxy can hand a flag back as
 * 1 / "1" / "true" instead of a real boolean, so a strict `=== true` would
 * wrongly hide Tips. Everything else (0, "0", "false", null, junk) is off.
 */
function truthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value !== "string") return false
  const s = value.trim().toLowerCase()
  return s === "true" || s === "1"
}

/**
 * Should this event's analytics show Tips UI at all? Prefers the API's
 * `tips_visible`. On a services deploy that predates it, falls back to
 * `tipping_enabled` or tips > 0. Tips that exist are never hidden.
 */
export function tipsVisible(data: AnalyticsWithTipsFlags): boolean {
  if (!data) return false
  return truthyFlag(data.tips_visible) || truthyFlag(data.tipping_enabled) || eventTips(data.revenue) > 0
}

type ScannerRows = readonly ({ tips?: unknown } | null | undefined)[] | null | undefined

type AnalyticsWithWorkerTips = (NonNullable<AnalyticsWithTipsFlags> & { tips_by_worker?: unknown }) | null | undefined

function scannerTipsTotal(rows: ScannerRows): number {
  return (rows ?? []).reduce((sum: number, r) => sum + scannerTips(r), 0)
}

function workerTipsTotal(data: AnalyticsWithWorkerTips): number {
  return tipsByWorker(data).reduce((sum, w) => sum + w.total, 0)
}

/**
 * Tips tile visibility, same rule as the Flutter app
 * (`_showTips => analytics.tipsVisible || perScanner.any(displayTips > 0)`):
 * the analytics flags say so, or any Door Performance row carries tips, or
 * Tips by worker has a total. Pass the per-scanner rows when the view has them.
 */
export function eventTipsVisible(data: AnalyticsWithWorkerTips, perScannerRows?: ScannerRows): boolean {
  if (tipsVisible(data)) return true
  if ((perScannerRows ?? []).some((r) => scannerTips(r) > 0)) return true
  return workerTipsTotal(data) > 0
}

/**
 * Amount on the Tips tile in USD. `revenue.tips` when the API sent it. When it
 * did not but tips show up elsewhere on the payload (Tips by worker, then the
 * Door Performance rows), falls back to that total so a visible tile never
 * reads $0.00 next to real tips. Tips only, never added into Revenue.
 */
export function eventTipsAmount(data: AnalyticsWithWorkerTips, perScannerRows?: ScannerRows): number {
  const fromRevenue = eventTips(data?.revenue)
  if (fromRevenue > 0) return fromRevenue
  const fromWorkers = workerTipsTotal(data)
  if (fromWorkers > 0) return fromWorkers
  return scannerTipsTotal(perScannerRows)
}

/**
 * Should Door Performance show its Tips column (and the tips hint)? True when
 * either the per-scanner response or the event analytics says tips are
 * visible, or any row actually carries tips.
 */
export function doorTipsVisible(
  perScannerFlag: unknown,
  analytics: AnalyticsWithWorkerTips,
  rows: ScannerRows,
): boolean {
  return truthyFlag(perScannerFlag) || eventTipsVisible(analytics, rows)
}

// ── Tips by worker ──────────────────────────────────────────────────────────

export const TIPS_BY_WORKER_TITLE = "Tips by worker"

export interface TipTransactionView {
  orderId: number | null
  tipUsd: number
  /** The door sale the tip rode on, null when the API did not send it. */
  doorUsd: number | null
  /** "Preset" / "Custom", null for anything else. */
  statusLabel: string | null
  createdAt: string | null
}

export interface TipWorkerView {
  key: string
  name: string
  scannerLabel: string | null
  total: number
  transactions: TipTransactionView[]
}

/** How the customer picked the tip. Unknown / missing statuses show nothing. */
export function tipStatusLabel(status: unknown): string | null {
  if (status === "preset") return "Preset"
  if (status === "custom") return "Custom"
  return null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asId(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null
}

/**
 * `tips_by_worker` from the event analytics, normalized for the accordion:
 * one entry per worker (same attribution as Door Performance), highest total
 * first, transactions in API order (newest first). Missing on older services
 * deploys, junk entries are dropped, so this never throws.
 */
export function tipsByWorker(data: { tips_by_worker?: unknown } | null | undefined): TipWorkerView[] {
  const raw = data?.tips_by_worker
  if (!Array.isArray(raw)) return []
  const out: TipWorkerView[] = []
  raw.forEach((entry, idx) => {
    const w = asRecord(entry)
    if (!w) return
    const transactions: TipTransactionView[] = (Array.isArray(w.transactions) ? w.transactions : [])
      .map(asRecord)
      .filter((t): t is Record<string, unknown> => t !== null)
      .map((t) => ({
        orderId: asId(t.order_id),
        tipUsd: safeUsd(t.tip_usd),
        doorUsd: t.door_usd == null ? null : safeUsd(t.door_usd),
        statusLabel: tipStatusLabel(t.tip_status),
        createdAt: asText(t.created_at),
      }))
    out.push({
      key: asText(w.staff_key) ?? `worker-${idx}`,
      name: asText(w.staff_name) ?? (w.staff_user_id == null ? "Unknown" : "Removed staff"),
      scannerLabel: asText(w.scanner_label),
      total: safeUsd(w.tips_total),
      transactions,
    })
  })
  return out.sort((a, b) => b.total - a.total)
}

/** "1 tip" / "3 tips" for a worker row. */
export function tipCountLabel(count: number): string {
  return count === 1 ? "1 tip" : `${count} tips`
}
