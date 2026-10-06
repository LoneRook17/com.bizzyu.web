"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Loader2, Pin, Star, X } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { isKnightBusiness } from "@/lib/business/knight"
import {
  moveRow,
  pinnable,
  rowStatus,
  whenLabel,
  type FeaturedEventRow,
  type FeaturedEventSummary,
  type FeaturedEventsPayload,
} from "@/lib/business/featured-events"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Badge } from "@/components/business/v2/ui/badge"

/**
 * "Featured on Knight app" — Knight Library business ONLY.
 *
 * Renders nothing (and calls nothing) unless the session business is
 * KNIGHT_BUSINESS_ID. Talks to services `/business/featured-events`
 * (business_featured_events, the same table the Knight app's Featured rail
 * reads). Never touches Bizzy's `is_featured` / Featured pills.
 */
export default function FeaturedOnKnightSection() {
  const { user, business } = useAuth()
  const knight = isKnightBusiness(business)
  const canWrite = user?.business_role === "owner" || user?.business_role === "manager"

  const [rows, setRows] = useState<FeaturedEventRow[]>([])
  const [candidates, setCandidates] = useState<FeaturedEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const load = useCallback(async () => {
    if (!knight) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<FeaturedEventsPayload>("/business/featured-events")
      setRows(data.featured ?? [])
      setCandidates(data.candidates ?? [])
    } catch (e) {
      setError((e as Error).message || "Could not load featured events")
    } finally {
      setLoading(false)
    }
  }, [knight])

  useEffect(() => { load() }, [load])

  if (!knight) return null

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError((e as Error).message || "That didn't save")
    } finally {
      setBusy(false)
    }
  }

  const pin = (eventId: number) =>
    run(() => apiClient.post("/business/featured-events", { event_id: eventId }))
  const unpin = (rowId: number) =>
    run(() => apiClient.delete(`/business/featured-events/${rowId}`))
  const toggle = (rowId: number) =>
    run(() => apiClient.post(`/business/featured-events/${rowId}/toggle`, {}))
  const move = (index: number, dir: -1 | 1) => {
    const ids = rows.map((r) => r.id)
    const next = moveRow(ids, index, index + dir)
    if (next.join() === ids.join()) return
    return run(() => apiClient.post("/business/featured-events/reorder", { ids: next }))
  }

  const pickable = pinnable(candidates, rows.map((r) => r.event_id)).filter((e) =>
    !query.trim() || e.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <Card data-testid="featured-on-knight">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              <Star className="size-4 text-amber-500" /> Featured on Knight app
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              These nights, in this order, are the Featured rail at the top of the Knight Library app&rsquo;s Home.
              Only published, upcoming nights are shown; a night that ends or is cancelled drops out on its own.
            </p>
          </div>
          {loading && <Loader2 className="size-4 animate-spin text-neutral-400" />}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {rows.length === 0 && !loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nothing featured yet. Pin an upcoming night below.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rows.map((row, i) => {
              const status = rowStatus(row)
              return (
                <li key={row.id} className="flex items-center gap-3 py-2.5" data-testid="featured-row">
                  <span className="w-5 text-right text-xs tabular-nums text-neutral-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {row.event?.name ?? `#${row.event_id} (missing)`}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{whenLabel(row.event?.start_date_time)}</div>
                  </div>
                  <Badge variant={status === "live" ? "success" : "neutral"}>{status}</Badge>
                  {canWrite && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-4" /></Button>
                      <Button variant="ghost" size="sm" disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-4" /></Button>
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => toggle(row.id)}>{row.is_active ? "Hide" : "Show"}</Button>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => unpin(row.id)} aria-label="Unpin"><X className="size-4" /></Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {canWrite && (
          <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Pin an upcoming night</h3>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 w-44 rounded-md border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700"
              />
            </div>
            {pickable.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No upcoming nights to pin.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-neutral-200 overflow-y-auto dark:divide-neutral-800">
                {pickable.map((e) => (
                  <li key={e.event_id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-neutral-900 dark:text-neutral-100">{e.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">{whenLabel(e.start_date_time)}</div>
                    </div>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => pin(e.event_id)}><Pin className="size-3.5" /> Feature</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
