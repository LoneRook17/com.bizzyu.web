"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { Reorder, useDragControls } from "framer-motion"
import { Eye, EyeOff, Loader2, Plus, X } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { persistMaxPerPerson } from "@/lib/business/ticket-limits"
import {
  nextSurgeStep,
  seededSurgeStep,
  tierSurgeToWire,
  tierWithSurgeDrafts,
  validateTierSurge,
} from "@/lib/business/event-tier-surge"
import type { EventDetail, TicketTier } from "@/lib/business/types"
import { cn, usd } from "@/lib/v2/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { useWeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { ScanWindowSection } from "@/components/business/v2/events/ScanWindowSection"
import { StockAlertsFields } from "@/components/business/v2/events/StockAlertsFields"
import { lowstockInputToStored, lowstockValueToInput } from "@/components/business/v2/events/EventForm"

export type TicketFormState = {
  ticket_id?: number
  name: string
  description: string
  ticket_type: "paid" | "free" | "guest"
  price_usd: string
  quantity: string
  max_per_person: string
  valid_from: string
  valid_until: string
  /**
   * Per-tier 21+ — undefined means the form never stated one, so the save
   * omits the key (server: update keeps the stored flag, create inherits
   * the event's own toggle).
   */
  is_21_plus?: boolean
  /** Surge drafts, same shapes the event-create tier card uses. */
  surge_enabled: boolean
  surge: { afterSoldInput: string; priceInput: string }[]
  /** Stored ladder base, for validation against a part-way-fired ladder. */
  surge_base_price_usd?: number | null
}

export const EMPTY_TICKET_FORM: TicketFormState = {
  name: "",
  description: "",
  ticket_type: "paid",
  price_usd: "0",
  quantity: "0",
  max_per_person: "",
  valid_from: "",
  valid_until: "",
  surge_enabled: false,
  surge: [],
}

export type TicketFormFieldMode = boolean | "readonly"

export type TicketFormVisibility = {
  name?: TicketFormFieldMode
  description?: TicketFormFieldMode
  ticket_type?: TicketFormFieldMode
  price?: TicketFormFieldMode
  quantity?: TicketFormFieldMode
  max_per_person?: TicketFormFieldMode
  scan_window?: boolean
  surge?: boolean
  is_21_plus?: boolean
}

export const EVENT_TICKET_FORM_FIELDS: TicketFormVisibility = {
  name: true,
  description: true,
  ticket_type: true,
  price: true,
  quantity: true,
  max_per_person: true,
  scan_window: true,
  surge: true,
  is_21_plus: true,
}

export type TicketRowActions = {
  edit?: boolean
  soldOut?: boolean
  hide?: boolean
}

export const EVENT_TICKET_ROW_ACTIONS: TicketRowActions = {
  edit: true,
  soldOut: true,
  hide: true,
}

export type StockAlertsState = {
  enabled: boolean
  thresholdType: "percent" | "count"
  thresholdInput: string
  notifyTeam: boolean
}

export type StockAlertsAdapter = {
  load: () => Promise<StockAlertsState | null>
  save: (alerts: StockAlertsState, stored: { value: number | null }) => Promise<void>
}

function toLocalInput(v?: string | null): string {
  if (!v) return ""
  return v.replace(" ", "T").slice(0, 16)
}

export function ticketToForm(t: TicketTier): TicketFormState {
  const withSurge = tierWithSurgeDrafts(t)
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
    ...(t.is_21_plus === undefined ? {} : { is_21_plus: !!t.is_21_plus }),
    surge_enabled: !!withSurge.surge_enabled,
    surge: withSurge.surge ?? [],
    surge_base_price_usd: t.surge_base_price_usd ?? null,
  }
}

export function eventStockAlertsAdapter(eventId: string): StockAlertsAdapter {
  return {
    async load() {
      const event = await apiClient.get<EventDetail>(`/business/events/${eventId}`)
      return {
        enabled: !!event.lowstock_alerts_enabled,
        thresholdType: event.lowstock_threshold_type ?? "percent",
        thresholdInput: lowstockValueToInput(event.lowstock_threshold_value),
        notifyTeam: !!event.lowstock_notify_business_team,
      }
    },
    async save(alerts, { value }) {
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
      await apiClient.put(`/business/events/${eventId}`, payload)
    },
  }
}

/** The form state as the surge helpers' TicketTier-ish shape. */
function formAsTier(editing: TicketFormState): TicketTier {
  return {
    name: editing.name,
    price_usd: editing.ticket_type === "paid" ? parseFloat(editing.price_usd) || 0 : 0,
    quantity: parseInt(editing.quantity) || 0,
    ticket_type: editing.ticket_type === "guest" ? "paid" : editing.ticket_type,
    surge_enabled: editing.surge_enabled,
    surge: editing.surge,
    surge_base_price_usd: editing.surge_base_price_usd ?? null,
  }
}

function ticketSaveBody(editing: TicketFormState) {
  return {
    name: editing.name.trim(),
    description: editing.description.trim() || null,
    ticket_type: editing.ticket_type,
    price_usd: editing.ticket_type === "paid" ? parseFloat(editing.price_usd) || 0 : 0,
    quantity: parseInt(editing.quantity) || 0,
    max_per_person: persistMaxPerPerson(editing.max_per_person),
    valid_from: editing.valid_from || null,
    valid_until: editing.valid_until || null,
    // Only when stated — omission keeps the stored flag (update) or inherits
    // the event's own toggle (create).
    ...(editing.is_21_plus === undefined ? {} : { is_21_plus: !!editing.is_21_plus }),
    // Both surge keys always — surge off must travel as an explicit clear,
    // same contract as the event-create tier card.
    ...tierSurgeToWire(formAsTier(editing)),
  }
}

/**
 * Events → Manage Tickets editor. Weekly Cover stamped nights reuse this
 * against the night's event_id so Cover edits match General Admission.
 */
export function ManageSalesTickets({
  eventId,
  allowAdd = true,
  allowReorder = true,
  alertsAdapter,
  header,
  className,
}: {
  eventId: string
  allowAdd?: boolean
  allowReorder?: boolean
  alertsAdapter?: StockAlertsAdapter
  header?: (ctx: { editing: boolean; addButton: ReactNode }) => ReactNode
  className?: string
}) {
  const [tickets, setTickets] = useState<TicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<TicketFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [toggling, setToggling] = useState<{ id: number; field: "hidden" | "sold_out" } | null>(null)

  const alerts = alertsAdapter ?? eventStockAlertsAdapter(eventId)
  const [alertState, setAlertState] = useState<StockAlertsState>({
    enabled: false,
    thresholdType: "percent",
    thresholdInput: "",
    notifyTeam: false,
  })
  const [alertsLoaded, setAlertsLoaded] = useState(false)
  const [alertsSaving, setAlertsSaving] = useState(false)
  const [alertsError, setAlertsError] = useState("")
  const [alertsSaved, setAlertsSaved] = useState(false)

  const saveAlerts = async () => {
    const { value, error } = lowstockInputToStored(alertState.thresholdType, alertState.thresholdInput)
    if (error) {
      setAlertsError(error)
      return
    }
    setAlertsSaving(true)
    setAlertsError("")
    setAlertsSaved(false)
    try {
      await alerts.save(alertState, { value })
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
      const data = await apiClient.get<{ tickets: TicketTier[] }>(`/business/events/${eventId}/tickets`)
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
  }, [eventId])

  useEffect(() => {
    alerts
      .load()
      .then((next) => {
        if (next) setAlertState(next)
        setAlertsLoaded(true)
      })
      .catch(() => {})
    // Adapter identity is stable per event/program on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const ticketsRef = useRef<TicketTier[]>([])
  useEffect(() => {
    ticketsRef.current = tickets
  }, [tickets])
  const preDragRef = useRef<TicketTier[] | null>(null)
  const [reorderError, setReorderError] = useState("")
  const [savingOrder, setSavingOrder] = useState(false)

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

    if (orderedIds.length === prevIds.length && orderedIds.every((v, i) => v === prevIds[i])) {
      return
    }

    setSavingOrder(true)
    setReorderError("")
    try {
      const data = await apiClient.put<{ tickets: TicketTier[] }>(
        `/business/events/${eventId}/tickets/reorder`,
        { ticket_ids: orderedIds },
      )
      setTickets(data.tickets ?? [])
    } catch (err) {
      setTickets(snapshot)
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
    const surgeError = validateTierSurge(formAsTier(editing))
    if (surgeError) {
      setSaveError(surgeError)
      return
    }
    setSaving(true)
    setSaveError("")
    const body = ticketSaveBody(editing)
    try {
      if (editing.ticket_id) {
        await apiClient.put(`/business/events/${eventId}/tickets/${editing.ticket_id}`, body)
      } else {
        await apiClient.post(`/business/events/${eventId}/tickets`, body)
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
      await apiClient.put(`/business/events/${eventId}/tickets/${t.ticket_id}`, { is_hidden: !t.is_hidden })
      await fetchTickets()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update visibility")
    } finally {
      setToggling(null)
    }
  }

  const handleToggleSoldOut = async (t: TicketTier) => {
    if (!t.ticket_id) return
    const next = !t.force_sold_out
    setToggling({ id: t.ticket_id, field: "sold_out" })
    try {
      await apiClient.put(`/business/events/${eventId}/tickets/${t.ticket_id}`, {
        force_sold_out: next,
      })
      await fetchTickets()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update sold-out status")
    } finally {
      setToggling(null)
    }
  }

  const addButton = (
    <Button
      onClick={() => {
        setSaveError("")
        setEditing({ ...EMPTY_TICKET_FORM })
      }}
    >
      <Plus /> Add ticket
    </Button>
  )

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
    <div className={cn("flex flex-col gap-6", className)}>
      {header ? (
        header({ editing: !!editing, addButton: allowAdd ? addButton : null })
      ) : allowAdd && !editing ? (
        <div className="mb-4 flex justify-end">{addButton}</div>
      ) : null}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {(savingOrder || reorderError) && (
        <p className={`text-xs mb-4 ${reorderError ? "text-red-500" : "text-gray-500"}`}>
          {reorderError || "Saving order…"}
        </p>
      )}

      {editing && (
        <TicketEditForm
          editing={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
          saveError={saveError}
        />
      )}

      <TicketSection
        title="Active tickets"
        section="active"
        tickets={active}
        allowReorder={allowReorder}
        onReorder={handleReorder}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onEdit={(t) => {
          setSaveError("")
          setEditing(ticketToForm(t))
        }}
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
          allowReorder={allowReorder}
          onReorder={handleReorder}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onEdit={(t) => {
            setSaveError("")
            setEditing(ticketToForm(t))
          }}
          onToggleHidden={handleToggleHidden}
          onToggleSoldOut={handleToggleSoldOut}
          toggling={toggling}
          note="Hidden tickets cannot be purchased. Existing ticket holders can still scan in."
          dimmed
        />
      )}

      {alertsLoaded && (
        <StockAlertsCard
          alerts={alertState}
          onChange={setAlertState}
          onSave={saveAlerts}
          saving={alertsSaving}
          saved={alertsSaved}
          error={alertsError}
        />
      )}
    </div>
  )
}

export function TicketEditForm({
  editing,
  onChange,
  onSave,
  onCancel,
  saving,
  saveError,
  fields = EVENT_TICKET_FORM_FIELDS,
  saveLabel,
  saveHint,
}: {
  editing: TicketFormState
  onChange: (next: TicketFormState) => void
  onSave: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  saveError: string
  fields?: TicketFormVisibility
  saveLabel?: string
  saveHint?: string
}) {
  const show = (mode: TicketFormFieldMode | undefined) => mode === true || mode === "readonly"
  const readOnly = (mode: TicketFormFieldMode | undefined) => mode === "readonly"

  return (
    <Card>
      <form onSubmit={onSave}>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {editing.ticket_id ? "Edit ticket" : "Add ticket"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {show(fields.name) && (
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs">Name</Label>
                <Input
                  value={editing.name}
                  disabled={readOnly(fields.name)}
                  onChange={(e) => onChange({ ...editing, name: e.target.value })}
                  placeholder="e.g. General Admission, VIP"
                />
              </div>
            )}
            {show(fields.description) && (
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs">Description</Label>
                <Input
                  value={editing.description}
                  disabled={readOnly(fields.description)}
                  onChange={(e) => onChange({ ...editing, description: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            )}
            {show(fields.ticket_type) && (
              <div>
                <Label className="mb-1 block text-xs">Type</Label>
                <Select
                  value={editing.ticket_type}
                  disabled={readOnly(fields.ticket_type)}
                  onChange={(e) =>
                    onChange({ ...editing, ticket_type: e.target.value as TicketFormState["ticket_type"] })
                  }
                >
                  <option value="paid">Paid</option>
                  <option value="free">Free</option>
                </Select>
              </div>
            )}
            {show(fields.price) && (
              <div>
                <Label className="mb-1 block text-xs">Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={readOnly(fields.price) || editing.ticket_type !== "paid"}
                  value={editing.price_usd}
                  onChange={(e) => onChange({ ...editing, price_usd: e.target.value })}
                />
              </div>
            )}
            {show(fields.quantity) && (
              <div>
                <Label className="mb-1 block text-xs">Quantity (0 = unlimited)</Label>
                <Input
                  type="number"
                  min="0"
                  disabled={readOnly(fields.quantity)}
                  value={editing.quantity}
                  onChange={(e) => onChange({ ...editing, quantity: e.target.value })}
                />
              </div>
            )}
            {show(fields.max_per_person) && (
              <div>
                <Label className="mb-1 block text-xs">Max per person (0 = unlimited)</Label>
                <Input
                  type="number"
                  min="0"
                  disabled={readOnly(fields.max_per_person)}
                  value={editing.max_per_person}
                  placeholder="0 = unlimited"
                  onChange={(e) => onChange({ ...editing, max_per_person: e.target.value })}
                />
              </div>
            )}
            {fields.scan_window && (
              <div key={editing.ticket_id ?? "new"} className="sm:col-span-2">
                <ScanWindowSection
                  valid_from={editing.valid_from}
                  valid_until={editing.valid_until}
                  onUpdate={(field, value) => onChange({ ...editing, [field]: value })}
                  onClear={() => onChange({ ...editing, valid_from: "", valid_until: "" })}
                />
              </div>
            )}
            {fields.is_21_plus && (
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editing.is_21_plus}
                    onChange={(e) => onChange({ ...editing, is_21_plus: e.target.checked })}
                    className="size-4 rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">21+ only</span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Buyers see a 21+ badge on this ticket.</span>
                </label>
              </div>
            )}
            {fields.surge && (
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editing.surge_enabled}
                    onChange={(e) =>
                      onChange({
                        ...editing,
                        surge_enabled: e.target.checked,
                        // Seed the first rung so the toggle never lands on an
                        // empty ladder — same as the event-create tier card.
                        surge:
                          e.target.checked && editing.surge.length === 0
                            ? [seededSurgeStep(formAsTier(editing))]
                            : editing.surge,
                      })
                    }
                    className="size-4 rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Surge pricing</span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Price goes up after a set number of tickets sell.</span>
                </label>

                {editing.surge_enabled && (
                  <div className="mt-2 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800/70">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Price jumps
                    </p>
                    <div className="flex flex-col gap-2">
                      {editing.surge.map((step, s) => (
                        <div key={s} className="flex items-end gap-2">
                          <div className="min-w-0 flex-1">
                            <Label className="mb-1 block text-xs">{s === 0 ? "After this sells" : "Then after"}</Label>
                            <Input
                              type="number"
                              min="1"
                              value={step.afterSoldInput}
                              onChange={(e) => {
                                const surge = [...editing.surge]
                                surge[s] = { ...surge[s], afterSoldInput: e.target.value }
                                onChange({ ...editing, surge })
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label className="mb-1 block text-xs">Next price ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={step.priceInput}
                              onChange={(e) => {
                                const surge = [...editing.surge]
                                surge[s] = { ...surge[s], priceInput: e.target.value }
                                onChange({ ...editing, surge })
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => onChange({ ...editing, surge: editing.surge.filter((_, i) => i !== s) })}
                            aria-label={`Remove jump ${s + 1}`}
                            className="mb-1.5 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ ...editing, surge: [...editing.surge, nextSurgeStep(formAsTier(editing))] })
                      }
                      className="mt-2 text-[13px] font-semibold text-neutral-700 hover:underline dark:text-neutral-300"
                    >
                      Add another price jump
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
          {saveHint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{saveHint}</p>}
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}{" "}
              {saveLabel ?? (editing.ticket_id ? "Save changes" : "Add ticket")}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

export function TicketSection({
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
  allowReorder = true,
  actions = EVENT_TICKET_ROW_ACTIONS,
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
  allowReorder?: boolean
  actions?: TicketRowActions
}) {
  const draggable = allowReorder && tickets.length > 1
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
                actions={actions}
              />
            ))}
          </Reorder.Group>
        </>
      )}
    </div>
  )
}

export function TicketRow({
  t,
  onEdit,
  onToggleHidden,
  onToggleSoldOut,
  togglingField,
  dimmed,
  draggable,
  onDragStart,
  onDragEnd,
  actions = EVENT_TICKET_ROW_ACTIONS,
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
  actions?: TicketRowActions
}) {
  const controls = useDragControls()
  const priceLabel =
    t.ticket_type === "free" || (t.price_usd ?? 0) === 0 ? "Free" : usd(t.price_usd)
  const qtyLabel = t.quantity === 0 || t.quantity == null ? "Unlimited" : `${t.quantity} qty`
  const busy = togglingField !== null
  const showActions = actions.edit || actions.soldOut || actions.hide

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
          {showActions && (
            <div className="flex shrink-0 items-center gap-2">
              {actions.edit && (
                <Button variant="secondary" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {actions.soldOut && (
                <Button variant="secondary" size="sm" disabled={busy} onClick={onToggleSoldOut}>
                  {togglingField === "sold_out" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {t.force_sold_out ? "Mark available" : "Mark sold out"}
                </Button>
              )}
              {actions.hide && (
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
              )}
            </div>
          )}
        </div>
      </Card>
    </Reorder.Item>
  )
}

export function StockAlertsCard({
  alerts,
  onChange,
  onSave,
  saving,
  saved,
  error,
  idPrefix = "manage_",
}: {
  alerts: StockAlertsState
  onChange: (next: StockAlertsState) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string
  idPrefix?: string
}) {
  const weekly = useWeeklyCoverAccent()
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Stock alerts</CardTitle>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Get notified when a ticket tier sells out, and optionally before it does.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <StockAlertsFields
          idPrefix={idPrefix}
          enabled={alerts.enabled}
          onEnabledChange={(enabled) => {
            onChange({ ...alerts, enabled })
          }}
          thresholdType={alerts.thresholdType}
          onThresholdTypeChange={(thresholdType) => {
            onChange({ ...alerts, thresholdType })
          }}
          thresholdInput={alerts.thresholdInput}
          onThresholdInputChange={(thresholdInput) => {
            onChange({ ...alerts, thresholdInput })
          }}
          notifyTeam={alerts.notifyTeam}
          onNotifyTeamChange={(notifyTeam) => onChange({ ...alerts, notifyTeam })}
          error={error}
        />
        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save stock alerts
          </Button>
          {saved && (
            <span className={cn("text-xs font-medium", weekly ? "text-access" : "text-[#05EB54]")}>Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
