"use client"

import type { Venue } from "@/lib/business/types"

interface VenueSelectModalProps {
  venues: Venue[]
  onSelect: (venue: Venue) => void
  onClose: () => void
}

export default function VenueSelectModal({ venues, onSelect, onClose }: VenueSelectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-xl bg-white p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-ink mb-1">Select a venue</h2>
        <p className="text-sm text-gray-500 mb-4">Choose which venue to create this for</p>

        <div className="space-y-1">
          {venues.map((venue) => (
            <button
              key={venue.id}
              onClick={() => onSelect(venue)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{venue.name}</p>
                {venue.address && (
                  <p className="text-xs text-gray-400 truncate">{venue.address}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
