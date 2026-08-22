"use client"

import { useState, useEffect, useRef, use } from "react"
import { Reorder, useDragControls } from "framer-motion"
import { Eye, EyeOff, Loader2, Plus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventDetail, TicketTier } from "@/lib/business/types"
import { usd } from "@/lib/v2/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { ScanWindowSection } from "@/components/business/v2/events/ScanWindowSection"
import { StockAlertsFields } from "@/components/business/v2/events/StockAlertsFields"
import { lowstockInputToStored, lowstockValueToInput } from "@/components/business/v2/events/EventForm"

type FormState = {
  ticket_id?: number
  name: string
  description: string
  ticket_type: "paid" | "free" | "guest"
  price_usd: string
  quantity: string
  max_per_person: string
  valid_from: string
  valid_until: string
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  ticket_type: "paid",
  price_usd: "0",
  quantity: "0",
  max_per_person: "",
  valid_from: "",
  valid_until: "",
}

function toLocalInput(v?: string | null): string {
  if (!v) return ""
  return v.replace(" ", "T").slice(0, 16)
}

function tierToForm(t: TicketTier): FormState {
  return {
    ticket_id: t.ticket_id,
    name: t.name,
    description: t.description ?? "",
    ticket_type: t.ticket_type,
    price_usd: String(t.price_usd ?? 0),
    quantity: String(t.quantity ?? 0),
    max_per_person: t.max_per_person == null ? "" : String(t.max_per_person),
    valid_from: toLocalInput(t.valid_from),
    valid_until: toLocalInput(t.valid_until),
  }
}

export default function V2ManageTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [tickets, setTickets] = useState<TicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  // Which per-row toggle (if any) has an in-flight request. Tracks the field so
  // only the button that was clicked shows a spinner.
  const [toggling, setToggling] = useState<{ id: number; field: "hidden" | "sold_out" } | null>(null)

  // 5.0 F11 — "Manage Tickets absorbs … Stock Alerts". The control already
  // existed on the create/edit form; this is the same component reading and
  // writing the same four columns, surfaced where the app puts it. The PUT is
  // deliberately partial: models/Event.updateEvent builds its SET clause from
  // the keys present against an allowlist, so sending only these four touches
  // only these four.
  const [alerts, setAlerts] = useState({
    enabled: false,
    thresholdType: "percent" as "percent" | "count",
    thresholdInput: "",
    notifyTeam: false,
  })
  const [alertsLoaded, setAlertsLoaded] = useState(false)
  const [alertsSaving, setAlertsSaving] = useState(false)
  const [alertsError, setAlertsError] = useState("")
  const [alertsSaved, setAlertsSaved] = useState(false)

  const saveAlerts = async () => {
    const { value, error } = lowstockInputToStored(alerts.thresholdType, alerts.thresholdInput)
    if (error) {
      setAlertsError(error)
      return
    }
    setAlertsSaving(true)
    setAlertsError("")
    setAlertsSaved(false)
    try {
      // Mirrors EventForm's payload rules: an enabled-but-blank threshold sends
      // an explicit null so a stored one is actually cleared (sold-out-only).
      const payload: Record<string, unknown> = {
        lowstock_alerts_enabled: alerts.enabled,
        lowstock_notify_business_team: alerts.notifyTeam,
      }
      if (alerts.enabled) {
        if (value != null) {
          payload.lowstock_threshold_type = alerts.thresholdType
          payload.lowstock_threshold_value = value
        } else {
          payload.lowstock_threshold_value = null
        }
      }
      await apiClient.put(`/business/events/${id}`, payload)
      setAlertsSaved(true)
      setTimeout(() => setAlertsSaved(false), 2500)
    } catch (err) {
      setAlertsError(err instanceof ApiError ? err.message : "Failed to save stock alerts")
    } finally {
      setAlertsSaving(false)
    }
  }

  const fetchTickets = async () => {
    try {
      const data = await apiClient.get<{ tickets: TicketTier[] }>(`/business/events/${id}/tickets`)
      setTickets(data.tickets ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Seed the stock-alert controls from the event's stored settings. Failure is
  // silent on purpose — the tier list is this page's job, and a detail hiccup
  // shouldn't blank it.
  useEffect(() => {
    apiClient
      .get<EventDetail>(`/business/events/${id}`)
      .then((event) => {
        setAlerts({
          enabled: !!event.lowstock_alerts_enabled,
          thresholdType: event.lowstock_threshold_type ?? "percent",
          thresholdInput: lowstockValueToInput(event.lowstock_threshold_value),
          notifyTeam: !!event.lowstock_notify_business_team,
        })
        setAlertsLoaded(true)
      })
      .catch(() => {})
  }, [id])

  // ── Drag-to-reorder ticket tiers (July 2026 QoL #2) ──────────────────
  // Optimistic: framer-motion mutates the local order live as you drag; we
  // persist the full order (active + hidden) on drop and revert if the PUT
  // fails. ticketsRef mirrors state so the drag-end handler reads the freshest
  // order without a stale closure. The full order is always active-then-hidden,
  // which matches how the two sections render.
  const ticketsRef = useRef<TicketTier[]>([])
  useEffect(() => {
    ticketsRef.current = tickets
  }, [tickets])
  const preDragRef = useRef<TicketTier[] | null>(null)
  const [reorderError, setReorderError] = useState("")
  const [savingOrder, setSavingOrder] = useState(false)

  // Rebuild the full list when one section is dragged, keeping the other
  // section's order intact. onReorder can fire many times mid-drag; the
  // functional update always merges against the latest state.
  const handleReorder = (section: "active" | "hidden", next: TicketTier[]) => {
    if (reorderError) setReorderError("")
    setTickets((prev) => {
      const others = prev.filter((t) => (section === "active" ? t.is_hidden : !t.is_hidden))
      return section === "active" ? [...next, ...others] : [...others, ...next]
    })
  }

  const handleDragStart = () => {
    preDragRef.current = ticketsRef.current
  }

  const handleDragEnd = async () => {
    const snapshot = preDragRef.current
    preDragRef.current = null
    if (!snapshot) return

    const orderedIds = ticketsRef.current
      .map((t) => t.ticket_id)
      .filter((x): x is number => typeof x === "number")
    const prevIds = snapshot
      .map((t) => t.ticket_id)
      .filter((x): x is number => typeof x === "number")

    // Picked up and dropped in the same spot → nothing to save.
    if (orderedIds.length === prevIds.length && orderedIds.every((v, i) => v === prevIds[i])) {
      return
    }

    setSavingOrder(true)
    setReorderError("")
    try {
      const data = await apiClient.put<{ tickets: TicketTier[] }>(
        `/business/events/${id}/tickets/reorder`,
        { ticket_ids: orderedIds },
      )
      setTickets(data.tickets ?? [])
    } catch (err) {
      setTickets(snapshot) // revert to the pre-drag order
      setReorderError(err instanceof ApiError ? err.message : "Couldn't save the new order")
    } finally {
      setSavingOrder(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editing.name.trim()) {
      setSaveError("Name is required")
      return
    }
    if (editing.valid_from && editing.valid_until && editing.valid_from >= editing.valid_until) {
      setSaveError('"From" must be before "Until"')
      return
    }
    setSaving(true)
    setSaveError("")
    const body = {
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      ticket_type: editing.ticket_type,
      price_usd: editing.ticket_type === "paid" ? parseFloat(editing.price_usd) || 0 : 0,
      quantity: parseInt(editing.quantity) || 0,
      max_per_person: editing.max_per_person.trim() ? parseInt(editing.max_per_person) : null,
      valid_from: editing.valid_from || null,
      valid_until: editing.valid_until || null,
    }
    try {
      if (editing.ticket_id) {
        await apiClient.put(`/business/events/${id}/tickets/${editing.ticket_id}`, body)
      } else {
        await apiClient.post(`/business/events/${id}/tickets`, body)
      }
      setEditing(null)
      await fetchTickets()
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save ticket")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleHidden = async (t: TicketTier) => {
    if (!t.ticket_id) return
    setToggling({ id: t.ticket_id, field: "hidden" })
    try {
      await apiClient.put(`/business/events/${id}/tickets/${t.ticket_id}`, { is_hidden: !t.is_hidden })
      await fetchTickets()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update visibility")
    } finally {
      setToggling(null)
    }
  }

  // Force a tier sold out without touching its quantity. Buyers see the
  // sold-out banner and can't purchase; clearing it restores sales.
  const handleToggleSoldOut = async (t: TicketTier) => {
    if (!t.ticket_id) return
    const next = !t.force_sold_out
    setToggling({ id: t.ticket_id, field: "sold_out" })
    try {
      await apiClient.put(`/business/events/${id}/tickets/${t.ticket_id}`, {
        force_sold_out: next,
      })
      await fetchTickets()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update sold-out status")
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const active = tickets.filter((t) => !t.is_hidden)
  const hidden = tickets.filter((t) => t.is_hidden)

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="Manage sales"
        actions={!editing ? <Button onClick={() => { setSaveError(""); setEditing({ ...EMPTY_FORM }) }}><Plus /> Add ticket</Button> : undefined}
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {(savingOrder || reorderError) && (
        <p className={`text-xs mb-4 ${reorderError ? "text-red-500" : "text-gray-500"}`}>
          {reorderError || "Saving order…"}
        </p>
      )}

      {editing && (
        <Card>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{editing.ticket_id ? "Edit ticket" : "Add ticket"}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="mb-1 block text-xs">Name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. General Admission, VIP" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1 block text-xs">Description</Label>
                  <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Type</Label>
                  <Select value={editing.ticket_type} onChange={(e) => setEditing({ ...editing, ticket_type: e.target.value as FormState["ticket_type"] })}>
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Price (USD)</Label>
                  <Input type="number" step="0.01" min="0" disabled={editing.ticket_type !== "paid"} value={editing.price_usd} onChange={(e) => setEditing({ ...editing, price_usd: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Quantity (0 = unlimited)</Label>
                  <Input type="number" min="0" value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Max per person</Label>
                  <Input type="number" min="1" value={editing.max_per_person} placeholder="No limit" onChange={(e) => setEditing({ ...editing, max_per_person: e.target.value })} />
                </div>
                {/* Keyed so the toggle's open/closed state re-initializes when the
                    edited ticket changes without the form unmounting. */}
                <div key={editing.ticket_id ?? "new"} className="sm:col-span-2">
                  <ScanWindowSection
                    valid_from={editing.valid_from}
                    valid_until={editing.valid_until}
                    onUpdate={(field, value) => setEditing({ ...editing, [field]: value })}
                    onClear={() => setEditing({ ...editing, valid_from: "", valid_until: "" })}
                  />
                </div>
              </div>
              {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} {editing.ticket_id ? "Save changes" : "Add ticket"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      <TicketSection
        title="Active tickets"
        section="active"
        tickets={active}
        onReorder={handleReorder}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onEdit={(t) => { setSaveError(""); setEditing(tierToForm(t)) }}
        onToggleHidden={handleToggleHidden}
        onToggleSoldOut={handleToggleSoldOut}
        toggling={toggling}
        emptyText="No active tickets yet."
      />

      {hidden.length > 0 && (
        <TicketSection
          title="Hidden tickets"
          section="hidden"
          tickets={hidden}
          onReorder={handleReorder}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onEdit={(t) => { setSaveError(""); setEditing(tierToForm(t)) }}
          onToggleHidden={handleToggleHidden}
          onToggleSoldOut={handleToggleSoldOut}
          toggling={toggling}
          note="Hidden tickets cannot be purchased. Existing ticket holders can still scan in."
          dimmed
        />
      )}

      {/* Stock alerts — relocated here per F11 so everything that governs what
          you're selling lives on one page. Group sellout stays exactly as it
          was: the per-tier "Mark sold out" toggle above. */}
      {alertsLoaded && (
        <Card className="mt-6">
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Stock alerts</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Get notified when a ticket tier sells out, and optionally before it does.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <StockAlertsFields
              idPrefix="manage_"
              enabled={alerts.enabled}
              onEnabledChange={(enabled) => { setAlerts((p) => ({ ...p, enabled })); setAlertsError("") }}
              thresholdType={alerts.thresholdType}
              onThresholdTypeChange={(thresholdType) => { setAlerts((p) => ({ ...p, thresholdType })); setAlertsError("") }}
              thresholdInput={alerts.thresholdInput}
              onThresholdInputChange={(thresholdInput) => { setAlerts((p) => ({ ...p, thresholdInput })); setAlertsError("") }}
              notifyTeam={alerts.notifyTeam}
              onNotifyTeamChange={(notifyTeam) => setAlerts((p) => ({ ...p, notifyTeam }))}
              error={alertsError}
            />
            <div className="mt-4 flex items-center gap-3">
              <Button type="button" onClick={saveAlerts} disabled={alertsSaving}>
                {alertsSaving && <Loader2 className="animate-spin" />} Save stock alerts
              </Button>
              {alertsSaved && <span className="text-xs font-medium text-[#05EB54]">Saved</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function TicketSection({
  title,
  section,
  tickets,
  onReorder,
  onDragStart,
  onDragEnd,
  onEdit,
  onToggleHidden,
  onToggleSoldOut,
  toggling,
  emptyText,
  note,
  dimmed,
}: {
  title: string
  section: "active" | "hidden"
  tickets: TicketTier[]
  onReorder: (section: "active" | "hidden", next: TicketTier[]) => void
  onDragStart: () => void
  onDragEnd: () => void
  onEdit: (t: TicketTier) => void
  onToggleHidden: (t: TicketTier) => void
  onToggleSoldOut: (t: TicketTier) => void
  toggling: { id: number; field: "hidden" | "sold_out" } | null
  emptyText?: string
  note?: string
  dimmed?: boolean
}) {
  const draggable = tickets.length > 1
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      {note && <p className="-mt-1 text-xs text-neutral-500 dark:text-neutral-400">{note}</p>}
      {tickets.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyText}</p>
      ) : (
        <>
          {draggable && (
            <p className="-mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Drag the handle to change the order buyers see.
            </p>
          )}
          <Reorder.Group
            as="ul"
            axis="y"
            values={tickets}
            onReorder={(next) => onReorder(section, next)}
            className="flex flex-col gap-3"
          >
            {tickets.map((t) => (
              <TicketRow
                key={t.ticket_id ?? t.name}
                t={t}
                draggable={draggable}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onEdit={() => onEdit(t)}
                onToggleHidden={() => onToggleHidden(t)}
                onToggleSoldOut={() => onToggleSoldOut(t)}
                togglingField={toggling && toggling.id === t.ticket_id ? toggling.field : null}
                dimmed={dimmed}
              />
            ))}
          </Reorder.Group>
        </>
      )}
    </div>
  )
}

function TicketRow({
  t,
  onEdit,
  onToggleHidden,
  onToggleSoldOut,
  togglingField,
  dimmed,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  t: TicketTier
  onEdit: () => void
  onToggleHidden: () => void
  onToggleSoldOut: () => void
  togglingField: "hidden" | "sold_out" | null
  dimmed?: boolean
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const controls = useDragControls()
  const priceLabel =
    t.ticket_type === "free" || (t.price_usd ?? 0) === 0 ? "Free" : usd(t.price_usd)
  const qtyLabel = t.quantity === 0 || t.quantity == null ? "Unlimited" : `${t.quantity} qty`
  const busy = togglingField !== null

  return (
    <Reorder.Item
      value={t}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={dimmed ? "opacity-70" : undefined}
    >
      <Card>
        <div className="flex items-center justify-between p-4">
          <div className="flex min-w-0 items-center gap-2">
            {draggable && (
              <button
                type="button"
                aria-label="Drag to reorder"
                onPointerDown={(e) => controls.start(e)}
                className="-ml-1 shrink-0 cursor-grab touch-none rounded p-1 text-neutral-300 hover:text-neutral-500 active:cursor-grabbing dark:text-neutral-600 dark:hover:text-neutral-400"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <circle cx="7" cy="5" r="1.6" />
                  <circle cx="13" cy="5" r="1.6" />
                  <circle cx="7" cy="10" r="1.6" />
                  <circle cx="13" cy="10" r="1.6" />
                  <circle cx="7" cy="15" r="1.6" />
                  <circle cx="13" cy="15" r="1.6" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</p>
                <Badge variant="outline" size="sm">{t.ticket_type}</Badge>
                {t.force_sold_out && (
                  <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:bg-red-950 dark:text-red-400">
                    Sold out
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                {priceLabel} · {qtyLabel} · Sold {t.sold_count ?? 0}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={onToggleSoldOut}>
              {togglingField === "sold_out" ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t.force_sold_out ? "Mark available" : "Mark sold out"}
            </Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={onToggleHidden}>
              {togglingField === "hidden" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : t.is_hidden ? (
                <Eye className="size-3.5" />
              ) : (
                <EyeOff className="size-3.5" />
              )}
              {t.is_hidden ? "Unhide" : "Hide"}
            </Button>
          </div>
        </div>
      </Card>
    </Reorder.Item>
  )
}
