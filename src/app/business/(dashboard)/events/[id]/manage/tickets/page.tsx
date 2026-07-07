"use client"

import { useState, useEffect, useRef, use } from "react"
import Link from "next/link"
import { Reorder, useDragControls } from "framer-motion"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { TicketTier } from "@/lib/business/types"

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

// Normalize a stored DATETIME ("2026-06-14 01:00:00" or ISO) into the
// "YYYY-MM-DDTHH:MM" shape a datetime-local input expects. Empty stays empty.
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

export default function ManageTicketsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const startCreate = () => {
    setSaveError("")
    setEditing({ ...EMPTY_FORM })
  }

  const startEdit = (t: TicketTier) => {
    setSaveError("")
    setEditing(tierToForm(t))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editing.name.trim()) {
      setSaveError("Name is required")
      return
    }
    if (editing.valid_from && editing.valid_until && editing.valid_from >= editing.valid_until) {
      setSaveError('"Sales valid from" must be before "valid until"')
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
    const next = !t.is_hidden
    setToggling({ id: t.ticket_id, field: "hidden" })
    try {
      await apiClient.put(`/business/events/${id}/tickets/${t.ticket_id}`, {
        is_hidden: next,
      })
      await fetchTickets()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update visibility")
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
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  const active = tickets.filter((t) => !t.is_hidden)
  const hidden = tickets.filter((t) => t.is_hidden)

  return (
    <div className="max-w-3xl">
      <Link
        href={`/business/events/${id}/manage`}
        className="text-xs text-gray-500 hover:text-primary mb-2 inline-block"
      >
        &larr; Back to Manage
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Manage Tickets</h1>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Add Ticket
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {(savingOrder || reorderError) && (
        <p className={`text-xs mb-4 ${reorderError ? "text-red-500" : "text-gray-500"}`}>
          {reorderError || "Saving order…"}
        </p>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-3"
        >
          <h2 className="text-sm font-semibold text-ink">
            {editing.ticket_id ? "Edit Ticket" : "Add Ticket"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Name</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. General Admission, VIP"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Description</label>
              <input
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Type</label>
              <select
                value={editing.ticket_type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    ticket_type: e.target.value as FormState["ticket_type"],
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="paid">Paid</option>
                <option value="free">Free</option>
                <option value="guest">Guest list</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={editing.ticket_type !== "paid"}
                value={editing.price_usd}
                onChange={(e) => setEditing({ ...editing, price_usd: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Quantity (0 = unlimited)</label>
              <input
                type="number"
                min="0"
                value={editing.quantity}
                onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max per person</label>
              <input
                type="number"
                min="1"
                value={editing.max_per_person}
                onChange={(e) =>
                  setEditing({ ...editing, max_per_person: e.target.value })
                }
                placeholder="No limit"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Valid from <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={editing.valid_from}
                onChange={(e) => setEditing({ ...editing, valid_from: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Valid until <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={editing.valid_until}
                onChange={(e) => setEditing({ ...editing, valid_until: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-1">
            Redeemable / scan window — when this ticket can be scanned at the door. It can still be bought beforehand; sales just close when the window ends. Leave blank for no limit.
          </p>

          {saveError && <p className="text-xs text-red-500">{saveError}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? "Saving…" : editing.ticket_id ? "Save Changes" : "Add Ticket"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <Section title="Active Tickets">
        {active.length === 0 ? (
          <p className="text-sm text-gray-500">No active tickets yet.</p>
        ) : (
          <>
            {active.length > 1 && (
              <p className="text-xs text-gray-400 mb-3 -mt-1">
                Drag the handle to change the order buyers see.
              </p>
            )}
            <Reorder.Group
              as="ul"
              axis="y"
              values={active}
              onReorder={(next) => handleReorder("active", next)}
              className="space-y-3"
            >
              {active.map((t) => (
                <TicketRow
                  key={t.ticket_id ?? t.name}
                  t={t}
                  draggable={active.length > 1}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={() => startEdit(t)}
                  onToggleHidden={() => handleToggleHidden(t)}
                  onToggleSoldOut={() => handleToggleSoldOut(t)}
                  togglingField={toggling && toggling.id === t.ticket_id ? toggling.field : null}
                />
              ))}
            </Reorder.Group>
          </>
        )}
      </Section>

      {hidden.length > 0 && (
        <div className="mt-8">
          <Section title="Hidden Tickets">
            <p className="text-xs text-gray-500 mb-3">
              Hidden tickets cannot be purchased. Existing ticket holders can still scan in.
            </p>
            <Reorder.Group
              as="ul"
              axis="y"
              values={hidden}
              onReorder={(next) => handleReorder("hidden", next)}
              className="space-y-3"
            >
              {hidden.map((t) => (
                <TicketRow
                  key={t.ticket_id ?? t.name}
                  t={t}
                  draggable={hidden.length > 1}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={() => startEdit(t)}
                  onToggleHidden={() => handleToggleHidden(t)}
                  onToggleSoldOut={() => handleToggleSoldOut(t)}
                  togglingField={toggling && toggling.id === t.ticket_id ? toggling.field : null}
                  dimmed
                />
              ))}
            </Reorder.Group>
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink mb-3">{title}</h2>
      {children}
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
    t.ticket_type === "free" || (t.price_usd ?? 0) === 0
      ? "Free"
      : `$${Number(t.price_usd).toFixed(2)}`
  const qtyLabel = t.quantity === 0 || t.quantity == null ? "Unlimited" : `${t.quantity} qty`
  const busy = togglingField !== null

  return (
    <Reorder.Item
      value={t}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 ${
        dimmed ? "opacity-70" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {draggable && (
          <button
            type="button"
            aria-label="Drag to reorder"
            onPointerDown={(e) => controls.start(e)}
            className="-ml-1 shrink-0 cursor-grab touch-none rounded p-1 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
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
            <p className="text-sm font-semibold text-ink truncate">{t.name}</p>
            {t.force_sold_out && (
              <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                Sold out
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {priceLabel} &middot; {qtyLabel} &middot; Sold {t.sold_count ?? 0}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onToggleSoldOut}
          disabled={busy}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
        >
          {togglingField === "sold_out" ? "…" : t.force_sold_out ? "Mark available" : "Mark sold out"}
        </button>
        <button
          type="button"
          onClick={onToggleHidden}
          disabled={busy}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
        >
          {togglingField === "hidden" ? "…" : t.is_hidden ? "Unhide" : "Hide"}
        </button>
      </div>
    </Reorder.Item>
  )
}
