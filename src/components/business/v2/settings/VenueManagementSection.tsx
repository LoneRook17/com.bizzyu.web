"use client"

import { useState } from "react"
import { ImageIcon, MapPin, Plus } from "lucide-react"
import { useVenue } from "@/lib/business/venue-context"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import type { Venue } from "@/lib/business/types"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Badge } from "@/components/business/v2/ui/badge"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import VenueDialog from "./VenueDialog"
import ConfirmDialog from "@/components/business/v2/ConfirmDialog"

export default function VenueManagementSection() {
  const { venues, refreshVenues, selectedVenueId, setSelectedVenue } = useVenue()
  const { user } = useAuth()
  const isOwner = user?.business_role === "owner"

  const [createOpen, setCreateOpen] = useState(false)
  const [editVenue, setEditVenue] = useState<Venue | null>(null)
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteVenue) return
    if (venues.length <= 1) {
      setDeleteError("You must have at least one active venue.")
      return
    }
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await apiClient.delete(`/business/venues/${deleteVenue.id}`)
      await refreshVenues()
      if (selectedVenueId === deleteVenue.id) {
        const remaining = venues.filter((v) => v.id !== deleteVenue.id)
        if (remaining.length > 0) setSelectedVenue(remaining[0].id)
      }
      setDeleteVenue(null)
    } catch {
      setDeleteError("Failed to delete venue. Please try again.")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Your venues</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Your physical locations — each venue has its own photo, address, and details students see in the app · {venues.length} venue{venues.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> Add venue
          </Button>
        )}
      </div>

      {venues.length === 0 ? (
        <EmptyState icon={MapPin} title="No venues yet" description="Add your first venue to start creating events and deals." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {venues.map((venue) => (
            <Card key={venue.id} className="overflow-hidden">
              <div className="relative h-32 bg-neutral-100 dark:bg-neutral-800">
                {venue.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={venue.photo_url} alt={venue.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-300 dark:text-neutral-600">
                    <ImageIcon className="size-10" />
                  </div>
                )}
                <Badge
                  variant={venue.is_active ? "success" : "neutral"}
                  className="absolute right-2 top-2"
                >
                  {venue.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{venue.name}</h3>
                {venue.address && <p className="mt-0.5 truncate text-[13px] text-neutral-500 dark:text-neutral-400">{venue.address}</p>}
                {isOwner && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditVenue(venue)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => { setDeleteVenue(venue); setDeleteError(null) }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <VenueDialog open={createOpen} onOpenChange={setCreateOpen} />
      <VenueDialog open={!!editVenue} onOpenChange={(open) => { if (!open) setEditVenue(null) }} venue={editVenue} />

      <ConfirmDialog
        open={!!deleteVenue}
        onOpenChange={(open) => { if (!open) { setDeleteVenue(null); setDeleteError(null) } }}
        onConfirm={handleDelete}
        title="Delete venue"
        description={
          <>This will hide <span className="font-medium text-neutral-700 dark:text-neutral-300">{deleteVenue?.name}</span> and all its content. This action cannot be undone.</>
        }
        confirmLabel="Delete venue"
        variant="danger"
        loading={deleteLoading}
        error={deleteError}
      />
    </section>
  )
}
