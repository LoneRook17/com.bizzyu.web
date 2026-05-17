"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
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
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  ticket_type: "paid",
  price_usd: "0",
  quantity: "0",
  max_per_person: "",
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
  const [togglingId, setTogglingId] = useState<number | null>(null)

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
    setSaving(true)
    setSaveError("")

    const body = {
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      ticket_type: editing.ticket_type,
      price_usd: editing.ticket_type === "paid" ? parseFloat(editing.price_usd) || 0 : 0,
      quantity: parseInt(editing.quantity) || 0,
      max_per_person: editing.max_per_person.trim() ? parseInt(editing.max_per_person) : null,
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
    setTogglingId(t.ticket_id)
    try {
      await apiClient.put(`/business/events/${id}/tickets/${t.ticket_id}`, {
        is_hidden: next,
      })
      await fetchTickets()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update visibility")
    } finally {
      setTogglingId(null)
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
          </div>

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
          <ul className="space-y-3">
            {active.map((t) => (
              <TicketRow
                key={t.ticket_id ?? t.name}
                t={t}
                onEdit={() => startEdit(t)}
                onToggleHidden={() => handleToggleHidden(t)}
                isToggling={togglingId === t.ticket_id}
              />
            ))}
          </ul>
        )}
      </Section>

      {hidden.length > 0 && (
        <div className="mt-8">
          <Section title="Hidden Tickets">
            <p className="text-xs text-gray-500 mb-3">
              Hidden tickets cannot be purchased. Existing ticket holders can still scan in.
            </p>
            <ul className="space-y-3">
              {hidden.map((t) => (
                <TicketRow
                  key={t.ticket_id ?? t.name}
                  t={t}
                  onEdit={() => startEdit(t)}
                  onToggleHidden={() => handleToggleHidden(t)}
                  isToggling={togglingId === t.ticket_id}
                  dimmed
                />
              ))}
            </ul>
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
  isToggling,
  dimmed,
}: {
  t: TicketTier
  onEdit: () => void
  onToggleHidden: () => void
  isToggling: boolean
  dimmed?: boolean
}) {
  const priceLabel =
    t.ticket_type === "free" || (t.price_usd ?? 0) === 0
      ? "Free"
      : `$${Number(t.price_usd).toFixed(2)}`
  const qtyLabel = t.quantity === 0 || t.quantity == null ? "Unlimited" : `${t.quantity} qty`

  return (
    <li
      className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 ${
        dimmed ? "opacity-70" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{t.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {priceLabel} &middot; {qtyLabel} &middot; Sold {t.sold_count ?? 0}
        </p>
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
          onClick={onToggleHidden}
          disabled={isToggling}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
        >
          {isToggling ? "…" : t.is_hidden ? "Unhide" : "Hide"}
        </button>
      </div>
    </li>
  )
}
