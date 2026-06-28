"use client"

import { useState, useEffect, use } from "react"
import { Eye, EyeOff, Loader2, Plus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { TicketTier } from "@/lib/business/types"
import { usd } from "@/lib/v2/utils"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editing.name.trim()) {
      setSaveError("Name is required")
      return
    }
    if (editing.valid_from && editing.valid_until && editing.valid_from >= editing.valid_until) {
      setSaveError('"Valid from" must be before "valid until"')
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
    setTogglingId(t.ticket_id)
    try {
      await apiClient.put(`/business/events/${id}/tickets/${t.ticket_id}`, { is_hidden: !t.is_hidden })
      await fetchTickets()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update visibility")
    } finally {
      setTogglingId(null)
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
        title="Manage tickets"
        actions={!editing ? <Button onClick={() => { setSaveError(""); setEditing({ ...EMPTY_FORM }) }}><Plus /> Add ticket</Button> : undefined}
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
                <div>
                  <Label className="mb-1 block text-xs">Valid from <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
                  <Input type="datetime-local" value={editing.valid_from} onChange={(e) => setEditing({ ...editing, valid_from: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Valid until <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
                  <Input type="datetime-local" value={editing.valid_until} onChange={(e) => setEditing({ ...editing, valid_until: e.target.value })} />
                </div>
              </div>
              <p className="-mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                Redeemable / scan window: when this ticket can be scanned at the door. It can still be bought beforehand; sales just close when the window ends.
              </p>
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

      <TicketSection title="Active tickets" tickets={active} onEdit={(t) => { setSaveError(""); setEditing(tierToForm(t)) }} onToggle={handleToggleHidden} togglingId={togglingId} emptyText="No active tickets yet." />

      {hidden.length > 0 && (
        <TicketSection
          title="Hidden tickets"
          tickets={hidden}
          onEdit={(t) => { setSaveError(""); setEditing(tierToForm(t)) }}
          onToggle={handleToggleHidden}
          togglingId={togglingId}
          note="Hidden tickets cannot be purchased. Existing ticket holders can still scan in."
          dimmed
        />
      )}
    </>
  )
}

function TicketSection({
  title, tickets, onEdit, onToggle, togglingId, emptyText, note, dimmed,
}: {
  title: string
  tickets: TicketTier[]
  onEdit: (t: TicketTier) => void
  onToggle: (t: TicketTier) => void
  togglingId: number | null
  emptyText?: string
  note?: string
  dimmed?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      {note && <p className="-mt-1 text-xs text-neutral-500 dark:text-neutral-400">{note}</p>}
      {tickets.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyText}</p>
      ) : (
        tickets.map((t) => {
          const priceLabel = t.ticket_type === "free" || (t.price_usd ?? 0) === 0 ? "Free" : usd(t.price_usd)
          const qtyLabel = t.quantity === 0 || t.quantity == null ? "Unlimited" : `${t.quantity} qty`
          return (
            <Card key={t.ticket_id ?? t.name} className={dimmed ? "opacity-70" : undefined}>
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</p>
                    <Badge variant="outline" size="sm">{t.ticket_type}</Badge>
                  </div>
                  <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{priceLabel} · {qtyLabel} · Sold {t.sold_count ?? 0}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onEdit(t)}>Edit</Button>
                  <Button variant="secondary" size="sm" disabled={togglingId === t.ticket_id} onClick={() => onToggle(t)}>
                    {togglingId === t.ticket_id ? <Loader2 className="size-3.5 animate-spin" /> : t.is_hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    {t.is_hidden ? "Unhide" : "Hide"}
                  </Button>
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
