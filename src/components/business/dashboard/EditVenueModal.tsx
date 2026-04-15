"use client"

import { useState, useRef, useEffect } from "react"
import { apiClient } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import AddressAutocomplete from "./AddressAutocomplete"
import { getApiBaseUrl } from "@/lib/api-url"
import type { Venue } from "@/lib/business/types"

const BASE_URL = getApiBaseUrl()
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png"]

interface EditVenueModalProps {
  open: boolean
  venue: Venue
  onClose: () => void
}

export default function EditVenueModal({ open, venue, onClose }: EditVenueModalProps) {
  const { refreshVenues } = useVenue()
  const [name, setName] = useState(venue.name)
  const [address, setAddress] = useState(venue.address ?? "")
  const [description, setDescription] = useState(venue.description ?? "")
  const [website, setWebsite] = useState(venue.website ?? "")
  const [instagram, setInstagram] = useState(venue.instagram ?? "")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(venue.photo_url ?? "")
  const [photoError, setPhotoError] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Reset form when venue changes
  useEffect(() => {
    setName(venue.name)
    setAddress(venue.address ?? "")
    setDescription(venue.description ?? "")
    setWebsite(venue.website ?? "")
    setInstagram(venue.instagram ?? "")
    setPhotoFile(null)
    setPhotoPreview(venue.photo_url ?? "")
    setPhotoError("")
    setError("")
  }, [venue])

  if (!open) return null

  const handlePhotoSelect = (file: File) => {
    setPhotoError("")
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Only JPEG and PNG files are accepted.")
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("Photo must be under 5MB.")
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(venue.photo_url ?? "")
    setPhotoError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Venue name is required.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await apiClient.patch(`/business/venues/${venue.id}`, {
        name: name.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        website: (() => {
          let w = website.trim()
          if (w && !w.startsWith("http://") && !w.startsWith("https://")) {
            w = "https://" + w
          }
          return w || null
        })(),
        instagram: instagram.trim() || null,
      })

      // Upload new photo if one was selected
      if (photoFile) {
        const formData = new FormData()
        formData.append("image", photoFile)
        const res = await fetch(`${BASE_URL}/business/venues/${venue.id}/photo`, {
          method: "POST",
          credentials: "include",
          body: formData,
        })
        if (!res.ok) {
          setError("Venue updated but photo upload failed.")
          await refreshVenues()
          setLoading(false)
          return
        }
      }

      await refreshVenues()
      onClose()
    } catch {
      setError("Failed to update venue. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-xl bg-white p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-ink mb-4">Edit Venue</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Downtown Location"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="123 Main St, City, ST"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of this venue..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourvenue"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Venue Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Photo</label>
            {photoPreview ? (
              <div className="relative rounded-lg border border-gray-200 overflow-hidden">
                <img src={photoPreview} alt="Venue photo preview" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-gray-600 hover:bg-white hover:text-red-500 shadow-sm transition-colors cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handlePhotoSelect(f) }}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors
                  ${dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"}`}
              >
                <svg className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
                <p className="text-xs text-gray-400 mt-1">JPEG or PNG, max 5MB</p>
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); e.target.value = "" }}
              className="hidden"
            />
            {photoError && <p className="mt-1 text-xs text-red-500">{photoError}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
