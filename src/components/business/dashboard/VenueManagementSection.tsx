"use client"

import { useState } from "react"
import { useVenue } from "@/lib/business/venue-context"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import CreateVenueModal from "./CreateVenueModal"
import EditVenueModal from "./EditVenueModal"
import type { Venue } from "@/lib/business/types"

export default function VenueManagementSection() {
  const { venues, refreshVenues, selectedVenueId, setSelectedVenue } = useVenue()
  const { user } = useAuth()
  const isOwner = user?.business_role === "owner"

  const [createOpen, setCreateOpen] = useState(false)
  const [editVenue, setEditVenue] = useState<Venue | null>(null)
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const handleDelete = async () => {
    if (!deleteVenue) return

    // Cannot delete the last active venue
    if (venues.length <= 1) {
      setDeleteError("You must have at least one active venue.")
      return
    }

    setDeleteLoading(true)
    setDeleteError("")
    try {
      await apiClient.delete(`/business/venues/${deleteVenue.id}`)
      await refreshVenues()

      // Switch to another venue if the deleted one was selected
      if (selectedVenueId === deleteVenue.id) {
        const remaining = venues.filter((v) => v.id !== deleteVenue.id)
        if (remaining.length > 0) {
          setSelectedVenue(remaining[0].id)
        }
      }

      setDeleteVenue(null)
    } catch {
      setDeleteError("Failed to delete venue. Please try again.")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      {/* Section Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Your Venues</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your venue locations, photos, and details
            <span className="ml-2 text-gray-400">&middot; {venues.length} venue{venues.length !== 1 ? "s" : ""}</span>
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Venue
          </button>
        )}
      </div>

      {/* Venue Grid */}
      {venues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center mb-6">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="text-sm text-gray-500">No venues yet. Add your first venue to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {venues.map((venue) => (
            <div key={venue.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Photo */}
              <div className="h-32 bg-gray-100 relative">
                {venue.photo_url ? (
                  <img src={venue.photo_url} alt={venue.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
                {/* Status badge */}
                <span className={`absolute top-2 right-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  venue.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {venue.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-ink truncate">{venue.name}</h3>
                {venue.address && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{venue.address}</p>
                )}

                {/* Actions */}
                {isOwner && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditVenue(venue)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setDeleteVenue(venue); setDeleteError("") }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Venue Modal */}
      <CreateVenueModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit Venue Modal */}
      {editVenue && (
        <EditVenueModal
          open={!!editVenue}
          venue={editVenue}
          onClose={() => setEditVenue(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !deleteLoading && setDeleteVenue(null)} />
          <div className="relative rounded-xl bg-white p-6 shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold text-ink mb-2">Delete Venue</h3>
            <p className="text-sm text-gray-600 mb-1">
              This will hide <span className="font-medium">{deleteVenue.name}</span> and all its content. This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 mb-4">Are you sure?</p>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteVenue(null)}
                disabled={deleteLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete Venue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
