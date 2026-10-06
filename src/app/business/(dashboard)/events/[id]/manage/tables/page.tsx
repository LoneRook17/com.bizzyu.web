"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Printer, Wine } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventDetail } from "@/lib/business/types"
import {
  VIP_API,
  VIP_STATE_LABEL,
  buildEventTableDrafts,
  canManageVipTables,
  centsToDollarsInput,
  dollarsToCents,
  formatCents,
  type VipEventTable,
  type VipEventTableDraft,
  type VipEventTables,
  type VipFloorPlan,
  type VipPackage,
  type VipSettings,
} from "@/lib/business/vip-tables"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import ShareLinkRow from "@/components/business/v2/ShareLinkRow"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

/**
 * Manage → VIP Tables: which of the venue's tables sell for THIS event, at
 * what price and package, plus the shareable checkout link, live states and
 * who booked what. Packages and the bottle menu are set once under
 * /business/vip-tables; the floor map itself is built by Bizzy.
 */

const STATE_BADGE: Record<VipEventTable["state"], "success" | "warning" | "danger" | "neutral" | "outline"> = {
  open: "success",
  held: "warning",
  sold: "danger",
  blocked: "neutral",
  off: "outline",
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback
  if (err instanceof Error) return err.message || fallback
  return fallback
}

/** ISO (UTC) from the API → value for <input type="datetime-local"> in local time. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ManageVipTablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const canEdit = canManageVipTables(user?.business_role)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [settings, setSettings] = useState<VipSettings | null>(null)
  const [plan, setPlan] = useState<VipFloorPlan | null>(null)
  const [packages, setPackages] = useState<VipPackage[]>([])
  const [listing, setListing] = useState<VipEventTables | null>(null)

  const [drafts, setDrafts] = useState<VipEventTableDraft[]>([])
  const [cutoff, setCutoff] = useState("")
  const [arrival, setArrival] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busyTable, setBusyTable] = useState<number | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const ev = await apiClient.get<EventDetail>(`/business/events/${id}`)
      const [s, p, pk, l] = await Promise.all([
        apiClient.get<{ settings: VipSettings }>(`${VIP_API}/settings`),
        apiClient.get<{ floor_plan: VipFloorPlan | null }>(
          `${VIP_API}/floor-plan${ev.venue_id ? `?venue_id=${ev.venue_id}` : ""}`,
        ),
        apiClient.get<{ packages: VipPackage[] }>(`${VIP_API}/packages`),
        apiClient.get<VipEventTables>(`${VIP_API}/events/${id}`),
      ])
      setEvent(ev)
      setSettings(s.settings)
      setPlan(p.floor_plan)
      setPackages(pk.packages)
      setListing(l)
      setDrafts(buildEventTableDrafts(p.floor_plan, l))
      setCutoff(isoToLocalInput(l.sales_cutoff_at))
      setArrival(l.arrival_deadline_text ?? "")
    } catch (err) {
      setError(errorMessage(err, "Could not load VIP tables for this event."))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  // Keep the live states fresh while the page is open (holds come and go).
  useEffect(() => {
    if (!listing?.enabled) return
    const t = setInterval(() => {
      apiClient
        .get<VipEventTables>(`${VIP_API}/events/${id}`)
        .then(setListing)
        .catch(() => {})
    }, 15000)
    return () => clearInterval(t)
  }, [id, listing?.enabled])

  const liveByTable = useMemo(() => {
    const m = new Map<number, VipEventTable>()
    listing?.tables.forEach((t) => m.set(t.vip_table_id, t))
    return m
  }, [listing])

  const updateDraft = (vipTableId: number, patch: Partial<VipEventTableDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.vip_table_id === vipTableId ? { ...d, ...patch } : d)))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const tables = drafts
        .filter((d) => d.listed)
        .map((d) => ({
          vip_table_id: d.vip_table_id,
          package_id: d.package_id,
          price_cents: d.price_cents ?? undefined,
          on_sale: d.on_sale,
        }))
      for (const t of tables) {
        if (!t.package_id) throw new Error("Every listed table needs a package.")
      }
      const result = await apiClient.put<VipEventTables>(`${VIP_API}/events/${id}`, {
        is_enabled: true,
        sales_cutoff_at: cutoff ? new Date(cutoff).toISOString() : null,
        arrival_deadline_text: arrival.trim() || null,
        tables,
      })
      setListing(result)
      setDrafts(buildEventTableDrafts(plan, result))
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err, "Could not save."))
    } finally {
      setSaving(false)
    }
  }

  const setBlocked = async (eventTableId: number, blocked: boolean) => {
    setBusyTable(eventTableId)
    setError(null)
    try {
      const result = await apiClient.post<VipEventTables>(
        `${VIP_API}/event-tables/${eventTableId}/${blocked ? "block" : "unblock"}`,
        {},
      )
      setListing(result)
    } catch (err) {
      setError(errorMessage(err, "Could not update the table."))
    } finally {
      setBusyTable(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const header = <ManageSubheader eventId={id} title="VIP Tables" subtitle={event?.name} />

  if (!settings?.is_enabled) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <EmptyState
          icon={Wine}
          title="VIP tables are not switched on yet"
          description="Bizzy builds your floor map and switches tables on for your business. Reach out to your Bizzy contact to get set up."
        />
      </div>
    )
  }

  if (!plan || plan.tables.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <EmptyState
          icon={Wine}
          title="No floor map for this venue yet"
          description="Send Bizzy a floor plan or photos and a list of tables with guest limits. Tables go on sale here once the map is built."
        />
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <EmptyState
          icon={Wine}
          title="Create a package first"
          description="A table is sold as a package: price, included bottles, what comes with it."
          action={
            <Button asChild>
              <Link href="/business/vip-tables">Set up packages</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const sold = listing?.tables.filter((t) => t.state === "sold") ?? []
  const revenueCents = sold.reduce((sum, t) => sum + (t.booking?.subtotal_cents ?? 0), 0)
  // Bottle prep: what each sold table ordered, and the totals to pull from stock.
  const prepTotals = new Map<string, number>()
  for (const t of sold) {
    for (const b of t.booking?.bottles ?? []) {
      const key = b.size_label ? `${b.name} (${b.size_label})` : b.name
      prepTotals.set(key, (prepTotals.get(key) ?? 0) + b.quantity)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {header}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {listing?.enabled && listing.tables.length > 0 && (
        <ShareLinkRow url={listing.share_url} title={`${event?.name ?? "Event"} VIP tables`} label="Table booking link" />
      )}

      {listing?.enabled && listing.tables.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "On sale", value: String(listing.tables.filter((t) => t.state === "open" || t.state === "held").length) },
            { label: "Sold", value: `${sold.length} of ${listing.tables.length}` },
            { label: "Table revenue", value: formatCents(revenueCents) },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {sold.length > 0 && (
        <Card className="p-5 print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Bottle prep</h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                What each table ordered. Set bottles out before the party arrives.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer /> Print
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {sold.map((t) => (
              <li key={t.event_table_id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {t.label}
                  <span className="ml-2 font-normal text-neutral-500">{t.booking?.host_name ?? "Host"}</span>
                </span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {(t.booking?.bottles ?? []).length
                    ? t.booking!.bottles.map((b) => `${b.quantity > 1 ? `${b.quantity}x ` : ""}${b.name}${b.kind === "extra" ? " (extra)" : ""}`).join(", ")
                    : "No bottles chosen"}
                </span>
              </li>
            ))}
          </ul>
          {prepTotals.size > 0 && (
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Totals: </span>
              {[...prepTotals.entries()].map(([name, n]) => `${n}x ${name}`).join(" · ")}
            </p>
          )}
        </Card>
      )}

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="vip-cutoff">Sales cutoff</Label>
            <Input id="vip-cutoff" type="datetime-local" value={cutoff} onChange={(e) => { setCutoff(e.target.value); setSaved(false) }} disabled={!canEdit} />
            <p className="mt-1 text-xs text-neutral-500">Leave blank to sell until the event ends.</p>
          </div>
          <div>
            <Label htmlFor="vip-arrival">Arrival deadline (shown to buyers)</Label>
            <Input id="vip-arrival" value={arrival} onChange={(e) => { setArrival(e.target.value); setSaved(false) }} placeholder="Arrive by 11:30 PM or your table may be released." disabled={!canEdit} />
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Tables for this event</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Tick a table to put it on sale. The price starts from the package and can be set per table. A sold table keeps the price it sold at.
          </p>
        </div>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {drafts.map((d) => {
            const live = liveByTable.get(d.vip_table_id)
            const isSold = live?.state === "sold"
            const pkg = packages.find((p) => p.id === d.package_id)
            return (
              <li key={d.vip_table_id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[#05EB54]"
                      checked={d.listed}
                      disabled={!canEdit || isSold}
                      onChange={(e) => updateDraft(d.vip_table_id, { listed: e.target.checked })}
                    />
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{d.label}</span>
                  </label>
                  <span className="text-sm text-neutral-500">Up to {d.guest_limit}{d.zone ? ` · ${d.zone}` : ""}</span>
                  {live && <Badge variant={STATE_BADGE[live.state]}>{VIP_STATE_LABEL[live.state]}</Badge>}
                  <div className="ml-auto flex items-center gap-2">
                    {live && !isSold && canEdit && (
                      <Button
                        variant="subtle"
                        size="sm"
                        disabled={busyTable === live.event_table_id}
                        onClick={() => setBlocked(live.event_table_id, !live.is_blocked)}
                      >
                        {live.is_blocked ? "Unblock" : "Block"}
                      </Button>
                    )}
                    {live && (
                      <ShareLinkRow url={live.share_url} title={`${d.label} at ${event?.name ?? "the event"}`} variant="inline" />
                    )}
                  </div>
                </div>

                {d.listed && !isSold && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor={`pkg-${d.vip_table_id}`}>Package</Label>
                      <Select
                        id={`pkg-${d.vip_table_id}`}
                        value={d.package_id ?? ""}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const next = packages.find((p) => p.id === Number(e.target.value)) ?? null
                          updateDraft(d.vip_table_id, { package_id: next?.id ?? null, price_cents: next ? next.price_cents : d.price_cents })
                        }}
                      >
                        <option value="">Choose a package</option>
                        {packages.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} · {formatCents(p.price_cents)}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`price-${d.vip_table_id}`}>Price for this event ($)</Label>
                      <Input
                        id={`price-${d.vip_table_id}`}
                        inputMode="decimal"
                        disabled={!canEdit}
                        value={centsToDollarsInput(d.price_cents ?? pkg?.price_cents ?? null)}
                        onChange={(e) => updateDraft(d.vip_table_id, { price_cents: dollarsToCents(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <input type="checkbox" className="size-4 accent-[#05EB54]" checked={d.on_sale} disabled={!canEdit} onChange={(e) => updateDraft(d.vip_table_id, { on_sale: e.target.checked })} />
                        On sale
                      </label>
                    </div>
                  </div>
                )}

                {live?.booking && (
                  <div className="rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {live.booking.host_name ?? "Host"}{live.booking.host_phone ? ` · ${live.booking.host_phone}` : ""}
                      </span>
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {live.booking.package_name} · paid {formatCents(live.booking.total_cents)}
                      </span>
                    </div>
                    {live.booking.bottles.length > 0 && (
                      <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                        Bottles: {live.booking.bottles.map((b) => `${b.quantity > 1 ? `${b.quantity} × ` : ""}${b.name}${b.kind === "extra" ? " (extra)" : ""}`).join(", ")}
                      </p>
                    )}
                    <p className="mt-1 text-neutral-500">
                      {live.booking.passes_claimed} of {live.guest_limit} passes claimed · {live.booking.checked_in} checked in
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {canEdit && (
          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
            {saved && <span className="text-sm text-neutral-500">Saved</span>}
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Save tables
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
