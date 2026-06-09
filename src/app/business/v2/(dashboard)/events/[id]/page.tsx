"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarOff, Copy, MapPin, Pencil, ScanLine, Settings2, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventDetail, TicketTier } from "@/lib/business/types"
import { usd, cn } from "@/lib/v2/utils"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { eventStatusBadge, fmtLongDate, fmtTime } from "@/components/business/v2/events/eventStatus"

export default function V2EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [editingTicketId, setEditingTicketId] = useState<number | null>(null)
  const [editPriceCents, setEditPriceCents] = useState(0)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState("")
  const [duplicating, setDuplicating] = useState(false)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canEditPrice = canEdit || user?.business_role === "staff"
  const canViewRevenue = canEdit

  const fetchEvent = useCallback(async () => {
    try {
      const data = await apiClient.get<EventDetail>(`/business/events/${id}`)
      setEvent(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load event")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchEvent() }, [fetchEvent])

  const openPriceEdit = (ticket: TicketTier) => {
    setEditingTicketId(ticket.ticket_id ?? null)
    setEditPriceCents(Math.round(ticket.price_usd * 100))
    setPriceError("")
  }

  const handlePriceUpdate = async () => {
    if (!editingTicketId) return
    if (editPriceCents < 0) {
      setPriceError("Price must be $0 or more")
      return
    }
    setPriceLoading(true)
    setPriceError("")
    try {
      await apiClient.patch(`/business/events/${id}/tickets/${editingTicketId}/price`, { price_cents: editPriceCents })
      setEditingTicketId(null)
      fetchEvent()
    } catch (err) {
      setPriceError(err instanceof ApiError ? err.message : "Failed to update price")
    } finally {
      setPriceLoading(false)
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const data = await apiClient.post<{ event_id: number }>(`/business/events/${id}/duplicate`)
      router.push(`/business/v2/events/${data.event_id}/edit`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to duplicate event")
      setDuplicating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={error || "Event not found"}
        action={<Button asChild variant="secondary"><Link href="/business/v2/events">Back to events</Link></Button>}
      />
    )
  }

  const badge = eventStatusBadge(event.status)
  const editingTicket = event.tickets.find((t) => t.ticket_id === editingTicketId)

  return (
    <>
      <Link
        href="/business/v2/events"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
      >
        <ArrowLeft className="size-3.5" /> Back to events
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{event.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <span className="text-[13px] text-neutral-500">{event.type}</span>
            {event.is_21_plus && <Badge variant="outline">21+</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button asChild><Link href={`/business/v2/events/${event.event_id}/manage`}><Settings2 /> Manage</Link></Button>
          )}
          <Button variant="secondary" asChild>
            <Link href={`/business/v2/events/${event.event_id}/manage/scanner`}><ScanLine /> Scan</Link>
          </Button>
          {canEdit && (
            <Button variant="secondary" onClick={handleDuplicate} disabled={duplicating}>
              {duplicating ? <Loader2 className="animate-spin" /> : <Copy />} Duplicate
            </Button>
          )}
        </div>
      </div>

      {event.status === "pending_review" && event.moderation_reason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Under review:</span> {event.moderation_reason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* left column */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {event.flyer_image_url && (
            <Card className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.flyer_image_url} alt={event.name} className="max-h-80 w-full object-cover" />
            </Card>
          )}

          {event.description && (
            <Card>
              <CardHeader><CardTitle>About</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <p className="whitespace-pre-wrap text-sm text-neutral-600">{event.description}</p>
              </CardContent>
            </Card>
          )}

          {event.tickets && event.tickets.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Ticket tiers</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-neutral-100">
                  {event.tickets.map((ticket, i) => (
                    <div key={ticket.ticket_id || i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{ticket.name}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-neutral-500">
                          <span>{ticket.ticket_type === "free" ? "Free" : usd(ticket.price_usd)}</span>
                          {ticket.ticket_type !== "free" && canEditPrice && (
                            <button
                              onClick={() => openPriceEdit(ticket)}
                              className="inline-flex size-5 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-[#079455]"
                              title="Edit price"
                            >
                              <Pencil className="size-3" />
                            </button>
                          )}
                          {ticket.max_per_person ? <span>· Max {ticket.max_per_person}/person</span> : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-neutral-900">{ticket.sold_count ?? 0} / {ticket.quantity || "∞"}</p>
                        <p className="text-xs text-neutral-400">sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* right column */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Date</p>
                <p className="mt-1 text-sm text-neutral-900">{fmtLongDate(event.start_date_time)}</p>
                <p className="text-[13px] text-neutral-500">{fmtTime(event.start_date_time)} – {fmtTime(event.end_date_time)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Venue</p>
                <p className="mt-1 text-sm text-neutral-900">{event.venue_name}</p>
                {event.venue_address && (
                  <p className="inline-flex items-center gap-1 text-[13px] text-neutral-500">
                    <MapPin className="size-3" /> {event.venue_address}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {canViewRevenue && (
            <Card>
              <CardHeader><CardTitle>Sales summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Row label="Attendees" value={String(event.sales?.total_attendees ?? event.total_attendees)} />
                <Row label="Revenue" value={usd(event.sales?.total_revenue ?? event.total_revenue)} />
                <Row label="Check-in rate" value={`${(event.sales?.checkin_rate ?? event.checkin_rate).toFixed(1)}%`} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* price edit dialog */}
      <Dialog open={editingTicketId !== null} onOpenChange={(o) => !o && setEditingTicketId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit ticket price</DialogTitle>
            <DialogDescription>{editingTicket?.name}</DialogDescription>
          </DialogHeader>
          {priceError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{priceError}</div>
          )}
          <div>
            <Label htmlFor="new-price" className="mb-1.5 block">New price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">$</span>
              <Input
                id="new-price"
                type="number"
                step="0.01"
                min="0"
                className="pl-7"
                value={(editPriceCents / 100).toFixed(2)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setEditPriceCents(!isNaN(v) ? Math.round(v * 100) : 0)
                }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Applies to new purchases only. Existing orders are not affected.
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingTicketId(null)} disabled={priceLoading}>Cancel</Button>
            <Button onClick={handlePriceUpdate} disabled={priceLoading}>
              {priceLoading && <Loader2 className="animate-spin" />} Update price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  )
}
